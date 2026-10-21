import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { matchingService } from './matchingService.js';
import { SkillEvidenceEngine } from './skillEvidenceEngine.js';

export const candidateService = {
  /**
   * Discovers candidates using server-side filtering, search, pagination, and sorting.
   */
  searchCandidates({
    query = '',
    domainId = null,
    skillId = null,
    minProficiency = 1,
    verificationStatus = null,
    minExperience = 0,
    workPreference = null,
    jobId = null,
    sortBy = 'readiness', // readiness, experience, match, name
    sortOrder = 'desc',
    limit = 20,
    offset = 0,
  } = {}) {
    let sql = `
      SELECT u.id, u.full_name, u.email, u.company_name, u.institution, u.avatar_url,
             cp.headline, cp.target_role, cp.experience_years, cp.location,
             cp.work_preference, cp.resume_url, cp.github_url, cp.portfolio_url, cp.repo_count,
             (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id AND cs.verification_status = 'verified') as verified_skill_count,
             (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id) as total_skill_count,
             (SELECT COUNT(*) FROM skill_evidence se WHERE se.candidate_id = u.id) as evidence_count,
             (SELECT COUNT(*) FROM assessment_results ar WHERE ar.candidate_id = u.id AND ar.passed = 1) as passed_assessments_count
      FROM users u
      JOIN candidate_profiles cp ON cp.id = u.id
      WHERE u.deleted_at IS NULL AND cp.deleted_at IS NULL AND cp.visibility != 'private'
    `;
    const params = [];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      sql += ' AND (u.full_name LIKE ? OR cp.headline LIKE ? OR cp.target_role LIKE ? OR cp.location LIKE ?)';
      params.push(q, q, q, q);
    }

    if (minExperience > 0) {
      sql += ' AND cp.experience_years >= ?';
      params.push(Number(minExperience));
    }

    if (workPreference && workPreference !== 'all') {
      sql += ' AND (cp.work_preference = ? OR cp.work_preference = "flexible")';
      params.push(workPreference);
    }

    if (domainId) {
      sql += ` AND u.id IN (
        SELECT cs.candidate_id FROM candidate_skills cs
        JOIN skills s ON s.id = cs.skill_id
        WHERE s.domain_id = ?
      )`;
      params.push(domainId);
    }

    if (skillId) {
      sql += ' AND u.id IN (SELECT cs.candidate_id FROM candidate_skills cs WHERE cs.skill_id = ? AND cs.proficiency >= ?)';
      params.push(skillId, Number(minProficiency));
    }

    if (verificationStatus && verificationStatus !== 'all') {
      sql += ' AND u.id IN (SELECT cs.candidate_id FROM candidate_skills cs WHERE cs.verification_status = ?)';
      params.push(verificationStatus);
    }

    // Count total matches before pagination
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) AS filtered_candidates;`;
    const totalCountRow = repository.queryOne(countSql, params);
    const totalCount = totalCountRow?.total || 0;

    // Sorting
    if (sortBy === 'experience') {
      sql += ` ORDER BY cp.experience_years ${sortOrder.toUpperCase()}`;
    } else if (sortBy === 'name') {
      sql += ` ORDER BY u.full_name ${sortOrder.toUpperCase()}`;
    } else {
      // Default: verified skills count + assessments
      sql += ` ORDER BY verified_skill_count DESC, passed_assessments_count DESC, cp.experience_years DESC`;
    }

    sql += ' LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    const candidates = repository.query(sql, params);

    // Attach skills and calculate match if jobId is provided
    const enriched = candidates.map(c => {
      const skills = repository.query(
        `SELECT cs.skill_id, cs.proficiency, cs.verification_status, cs.source,
                s.name as skill_name, s.category, d.title as domain_title
         FROM candidate_skills cs
         JOIN skills s ON s.id = cs.skill_id
         JOIN domains d ON d.id = s.domain_id
         WHERE cs.candidate_id = ?
         ORDER BY cs.proficiency DESC;`,
        [c.id]
      );

      let matchData = null;
      if (jobId) {
        try {
          matchData = matchingService.calculateJobMatch(c.id, jobId);
        } catch {
          // ignore error if job not found
        }
      }

      // Readiness score calculation
      const readinessScore = Math.min(
        100,
        Math.round((c.verified_skill_count * 18) + (c.passed_assessments_count * 20) + 20)
      );

      return {
        ...c,
        skills,
        readinessScore,
        matchScore: matchData ? matchData.matchScore : null,
        matchBreakdown: matchData || null,
      };
    });

    // If sorting by matchScore with a jobId, sort the page or results
    if (jobId && sortBy === 'match') {
      enriched.sort((a, b) => {
        const diff = (b.matchScore || 0) - (a.matchScore || 0);
        return sortOrder === 'desc' ? diff : -diff;
      });
    }

    return {
      candidates: enriched,
      totalCount,
      limit: Number(limit),
      offset: Number(offset),
    };
  },

  /**
   * Retrieves complete Candidate Skill Passport.
   */
  getCandidatePassport(candidateId, jobId = null) {
    const candidate = repository.queryOne(
      `SELECT u.id, u.full_name, u.email, u.company_name, u.institution, u.timezone, u.avatar_url,
              cp.headline, cp.target_role, cp.bio, cp.experience_years, cp.location,
              cp.work_preference, cp.resume_url, cp.github_url, cp.portfolio_url, cp.repo_count,
              cp.visibility, cp.consent_at
       FROM users u
       JOIN candidate_profiles cp ON cp.id = u.id
       WHERE u.id = ? AND u.deleted_at IS NULL;`,
      [candidateId]
    );

    if (!candidate) return null;

    // Fetch candidate skills with full domain & evidence count
    const skills = repository.query(
      `SELECT cs.*, s.name as skill_name, s.category as skill_category,
              d.id as domain_id, d.title as domain_title, d.badge_color,
              u_ver.full_name as verified_by_name,
              (SELECT COUNT(*) FROM skill_evidence se WHERE se.candidate_id = cs.candidate_id AND se.skill_id = cs.skill_id) as evidence_count
       FROM candidate_skills cs
       LEFT JOIN skills s ON s.id = cs.skill_id
       LEFT JOIN domains d ON d.id = s.domain_id
       LEFT JOIN users u_ver ON u_ver.id = cs.verified_by
       WHERE cs.candidate_id = ?
       ORDER BY cs.verification_status = 'verified' DESC, cs.proficiency DESC;`,
      [candidateId]
    );

    // Fetch all skill evidence records with audit details
    const evidence = repository.query(
      `SELECT se.*, s.name as skill_name, d.title as domain_title, u_ver.full_name as verified_by_name
       FROM skill_evidence se
       JOIN skills s ON s.id = se.skill_id
       JOIN domains d ON d.id = s.domain_id
       LEFT JOIN users u_ver ON u_ver.id = se.verified_by
       WHERE se.candidate_id = ?
       ORDER BY se.created_at DESC;`,
      [candidateId]
    ).map(e => ({
      ...e,
      metadata: JSON.parse(e.metadata || '{}'),
    }));

    // Fetch verification reviews (audit trail of human/automated decisions)
    const verificationReviews = repository.query(
      `SELECT vr.*, se.evidence_type, se.title as evidence_title, s.name as skill_name, u_rev.full_name as reviewer_name
       FROM verification_reviews vr
       JOIN skill_evidence se ON se.id = vr.evidence_id
       JOIN skills s ON s.id = se.skill_id
       LEFT JOIN users u_rev ON u_rev.id = vr.reviewer_id
       WHERE se.candidate_id = ?
       ORDER BY vr.created_at DESC;`,
      [candidateId]
    ).map(r => ({
      ...r,
      rubric_evaluations: JSON.parse(r.rubric_evaluations || '{}'),
    }));

    // Fetch assessment history
    const assessments = repository.query(
      `SELECT ar.*, 
              COALESCE(at.title, 'Diagnostic Assessment') as template_title, 
              COALESCE(at.type, 'diagnostic_quiz_practical') as assessment_type,
              COALESCE(at.duration_minutes, 45) as duration_minutes, 
              COALESCE(at.passing_score, 60.0) as passing_score, 
              COALESCE(d.title, at.title, 'Technology') as domain_title,
              COALESCE(u_grad.full_name, 'System Evaluation') as grader_name
       FROM assessment_results ar
       LEFT JOIN assessment_templates at ON at.id = ar.template_id
       LEFT JOIN domains d ON d.id = at.domain_id
       LEFT JOIN users u_grad ON u_grad.id = ar.graded_by
       WHERE ar.candidate_id = ?
       ORDER BY ar.created_at DESC;`,
      [candidateId]
    ).map(a => ({
      ...a,
      rubric_scores: JSON.parse(a.rubric_scores || '{}'),
      verified_skill_awards: JSON.parse(a.verified_skill_awards || '[]'),
    }));

    // Job-specific match and skill-gap summary if jobId provided
    let jobMatch = null;
    if (jobId) {
      try {
        jobMatch = matchingService.calculateJobMatch(candidateId, jobId);
      } catch {
        // ignore
      }
    }

    return {
      candidate,
      skills,
      evidence,
      verificationReviews,
      assessments,
      jobMatch,
    };
  },

  /**
   * Submits student project evidence, associates with skills, and places in pending_review.
   * Prevents duplicates during retries and associates with candidate profile.
   */
  submitCandidateEvidence({
    candidateId,
    title,
    description,
    repositoryUrl,
    liveDemoUrl = null,
    skillsDemonstrated = [],
    technologies = [],
    domainId = null,
    evidenceType = 'project_repo'
  }) {
    if (!candidateId) throw new Error('Candidate ID is required');
    if (!title || !title.trim()) throw new Error('Evidence title is required');
    if (!description || !description.trim()) throw new Error('Evidence description is required');
    if (!repositoryUrl || !repositoryUrl.trim()) throw new Error('Reference URL is required');

    const cleanRepoUrl = repositoryUrl.trim();
    if (!cleanRepoUrl.startsWith('http://') && !cleanRepoUrl.startsWith('https://')) {
      throw new Error('Reference URL must start with http:// or https://');
    }
    if (liveDemoUrl && liveDemoUrl.trim()) {
      const cleanDemo = liveDemoUrl.trim();
      if (!cleanDemo.startsWith('http://') && !cleanDemo.startsWith('https://')) {
        throw new Error('Live demo URL must start with http:// or https://');
      }
    }

    let effEvidenceType = evidenceType || 'project_repo';
    let effVerificationStatus = 'pending_review';
    let effSource = 'project_submission';

    if (effEvidenceType === 'certification') {
      effVerificationStatus = 'self_reported';
      effSource = 'certification_claim';
    } else if (effEvidenceType === 'course') {
      effVerificationStatus = 'self_reported';
      effSource = 'course_completion';
    } else if (effEvidenceType === 'work_experience') {
      effVerificationStatus = 'self_reported';
      effSource = 'experience_claim';
    }

    const now = new Date().toISOString();
    const skillsToProcess = Array.isArray(skillsDemonstrated) && skillsDemonstrated.length > 0
      ? skillsDemonstrated
      : (Array.isArray(technologies) && technologies.length > 0 ? technologies : ['General Development']);

    return repository.transaction((repo) => {
      let createdCount = 0;
      let updatedCount = 0;
      const evidenceIds = [];

      for (const skillName of skillsToProcess) {
        if (!skillName || !skillName.trim()) continue;
        const cleanSkillName = skillName.trim();

        // 1. Resolve or create skill
        let skillRow = repo.queryOne(
          'SELECT id FROM skills WHERE LOWER(name) = LOWER(?);',
          [cleanSkillName]
        );
        if (!skillRow) {
          const newSkillId = `sk-${uuidv4().slice(0, 8)}`;
          repo.execute(
            `INSERT INTO skills (
              id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'Technologies', '1-5', '["github_pr","project_repo","code_sample"]', '["practical_coding"]', 1, ?, ?);`,
            [newSkillId, domainId || 'dom-fullstack', cleanSkillName, `${cleanSkillName} competency`, now, now]
          );
          skillRow = { id: newSkillId };
        }

        // 2. Check for duplicate evidence on retries
        const existingEvidence = repo.queryOne(
          'SELECT id, verification_status FROM skill_evidence WHERE candidate_id = ? AND skill_id = ? AND reference_url = ?;',
          [candidateId, skillRow.id, cleanRepoUrl]
        );

        const metadata = JSON.stringify({
          description: description.trim(),
          liveDemoUrl: liveDemoUrl ? liveDemoUrl.trim() : null,
          technologies: Array.isArray(technologies) ? technologies : [],
          domainId: domainId || null,
          evidenceType: effEvidenceType,
        });

        if (existingEvidence) {
          // Update existing evidence without duplicate creation
          repo.execute(
            `UPDATE skill_evidence SET
              title = ?,
              metadata = ?,
              updated_at = ?
            WHERE id = ?;`,
            [title.trim(), metadata, now, existingEvidence.id]
          );
          evidenceIds.push(existingEvidence.id);
          updatedCount++;
        } else {
          // Insert new evidence with transparent status
          const evidenceId = `se-${uuidv4().slice(0, 8)}`;
          repo.execute(
            `INSERT INTO skill_evidence (
              id, candidate_id, skill_id, evidence_type, title, reference_url, metadata, source, verification_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [evidenceId, candidateId, skillRow.id, effEvidenceType, title.trim(), cleanRepoUrl, metadata, effSource, effVerificationStatus, now, now]
          );
          evidenceIds.push(evidenceId);
          createdCount++;
        }

        // 3. Update candidate_skills
        const existingCS = repo.queryOne(
          'SELECT * FROM candidate_skills WHERE candidate_id = ? AND skill_id = ?;',
          [candidateId, skillRow.id]
        );

        if (existingCS) {
          // If already verified or diagnostic_tested, retain higher status!
          // Only elevate if practical project submitted
          let newStatus = existingCS.verification_status;
          if (effVerificationStatus === 'pending_review' && (existingCS.verification_status === 'self_reported' || existingCS.verification_status === 'unverified')) {
            newStatus = 'pending_review';
          }

          repo.execute(
            `UPDATE candidate_skills SET
              verification_status = ?,
              updated_at = ?
            WHERE candidate_id = ? AND skill_id = ?;`,
            [newStatus, now, candidateId, skillRow.id]
          );
        } else {
          repo.execute(
            `INSERT INTO candidate_skills (
              id, candidate_id, skill_id, proficiency, verification_status, source, notes, created_at, updated_at
            ) VALUES (?, ?, ?, 2, ?, ?, 'Evidence submitted on Skill Passport', ?, ?);`,
            [`cs-${uuidv4().slice(0, 8)}`, candidateId, skillRow.id, effVerificationStatus, effSource, now, now]
          );
        }
      }

      // 4. Update candidate profile repo count if new evidence created
      if (createdCount > 0) {
        repo.execute(
          `UPDATE candidate_profiles SET
            repo_count = (SELECT COUNT(DISTINCT reference_url) FROM skill_evidence WHERE candidate_id = ?),
            updated_at = ?
          WHERE id = ?;`,
          [candidateId, now, candidateId]
        );
      }

      const res = {
        success: true,
        createdCount,
        updatedCount,
        evidenceIds,
        message: `Submitted ${skillsToProcess.length} skill evidence item(s) for verification.`
      };

      // Also record traceable evidence in central Skill Evidence Engine
      for (const skillName of skillsToProcess) {
        if (!skillName || !skillName.trim()) continue;
        try {
          SkillEvidenceEngine.recordEvidence({
            candidateId,
            skillName: skillName.trim(),
            evidenceType: 'github_repo',
            source: 'project_submission',
            title: `Project: ${title.trim()}`,
            referenceUrl: cleanRepoUrl,
            score: 80,
            maxScore: 100,
            demonstratedLevel: 2,
            metadata: {
              description: description.trim(),
              liveDemoUrl: liveDemoUrl ? liveDemoUrl.trim() : null,
              technologies: Array.isArray(technologies) ? technologies : [],
              domainId: domainId || null
            }
          });
        } catch (err) {
          console.warn('SkillEvidenceEngine sync note:', err?.message);
        }
      }

      return res;
    });
  },

  getCandidateProfile(candidateId) {
    const user = repository.queryOne(
      'SELECT id, email, full_name, role, company_name, institution, timezone, avatar_url, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL;',
      [candidateId]
    );
    if (!user) return null;

    let profile = repository.queryOne(
      'SELECT * FROM candidate_profiles WHERE id = ? AND deleted_at IS NULL;',
      [candidateId]
    );

    if (!profile) {
      const now = new Date().toISOString();
      repository.execute(
        `INSERT OR IGNORE INTO candidate_profiles (
          id, headline, target_role, bio, experience_years, location,
          work_preference, visibility, created_at, updated_at
        ) VALUES (?, 'Aspiring Candidate', 'Full-Stack Developer', '', 0, 'India', 'flexible', 'public', ?, ?);`,
        [candidateId, now, now]
      );
      profile = repository.queryOne('SELECT * FROM candidate_profiles WHERE id = ?;', [candidateId]);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      institution: user.institution || '',
      avatarUrl: user.avatar_url,
      headline: profile?.headline || '',
      targetRole: profile?.target_role || '',
      bio: profile?.bio || '',
      experienceYears: profile?.experience_years ?? 0,
      location: profile?.location || '',
      workPreference: profile?.work_preference || 'flexible',
      resumeUrl: profile?.resume_url || '',
      profileUrl: profile?.profile_url || '',
      githubUrl: profile?.github_url || '',
      linkedinUrl: profile?.linkedin_url || '',
      portfolioUrl: profile?.portfolio_url || '',
      degree: profile?.degree || '',
      graduationYear: profile?.graduation_year ?? null,
      repoCount: profile?.repo_count ?? 0,
      visibility: profile?.visibility || 'public',
      createdAt: user.created_at,
      updatedAt: profile?.updated_at || user.updated_at,
    };
  },

  updateCandidateProfile(candidateId, updates = {}) {
    const now = new Date().toISOString();

    return repository.transaction(repo => {
      const user = repo.queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL;', [candidateId]);
      if (!user) {
        throw new Error('User not found');
      }

      if (updates.fullName !== undefined || updates.institution !== undefined) {
        const newFullName = updates.fullName !== undefined ? updates.fullName.trim() : user.full_name;
        const newInstitution = updates.institution !== undefined ? updates.institution.trim() : user.institution;
        repo.execute(
          'UPDATE users SET full_name = ?, institution = ?, updated_at = ? WHERE id = ?;',
          [newFullName, newInstitution, now, candidateId]
        );
      }

      let profile = repo.queryOne('SELECT * FROM candidate_profiles WHERE id = ?;', [candidateId]);
      if (!profile) {
        repo.execute(
          `INSERT INTO candidate_profiles (
            id, headline, target_role, bio, experience_years, location,
            work_preference, visibility, created_at, updated_at
          ) VALUES (?, '', '', '', 0, '', 'flexible', 'public', ?, ?);`,
          [candidateId, now, now]
        );
        profile = repo.queryOne('SELECT * FROM candidate_profiles WHERE id = ?;', [candidateId]);
      }

      const newHeadline = updates.headline !== undefined ? updates.headline : profile.headline;
      const newTargetRole = updates.targetRole !== undefined ? updates.targetRole : profile.target_role;
      const newBio = updates.bio !== undefined ? updates.bio : profile.bio;
      const newExperience = updates.experienceYears !== undefined ? Number(updates.experienceYears) : profile.experience_years;
      const newLocation = updates.location !== undefined ? updates.location : profile.location;
      const newWorkPref = updates.workPreference !== undefined ? updates.workPreference : profile.work_preference;
      const newGithub = updates.githubUrl !== undefined ? updates.githubUrl : profile.github_url;
      const newLinkedin = updates.linkedinUrl !== undefined ? updates.linkedinUrl : profile.linkedin_url;
      const newPortfolio = updates.portfolioUrl !== undefined ? updates.portfolioUrl : profile.portfolio_url;
      const newResume = updates.resumeUrl !== undefined ? updates.resumeUrl : profile.resume_url;
      const newDegree = updates.degree !== undefined ? updates.degree : profile.degree;
      const newGradYear = updates.graduationYear !== undefined ? (updates.graduationYear ? Number(updates.graduationYear) : null) : profile.graduation_year;

      repo.execute(
        `UPDATE candidate_profiles SET
          headline = ?,
          target_role = ?,
          bio = ?,
          experience_years = ?,
          location = ?,
          work_preference = ?,
          github_url = ?,
          linkedin_url = ?,
          portfolio_url = ?,
          resume_url = ?,
          degree = ?,
          graduation_year = ?,
          updated_at = ?
        WHERE id = ?;`,
        [
          newHeadline,
          newTargetRole,
          newBio,
          newExperience,
          newLocation,
          newWorkPref,
          newGithub,
          newLinkedin,
          newPortfolio,
          newResume,
          newDegree,
          newGradYear,
          now,
          candidateId
        ]
      );

      return this.getCandidateProfile(candidateId);
    });
  },

  /**
   * Submits candidate project evidence, inserts into skill_evidence,
   * updates candidate_skills, and records in SkillEvidenceEngine.
   */
  submitCandidateEvidence({
    candidateId,
    title,
    description,
    repositoryUrl,
    liveDemoUrl,
    skillsDemonstrated = [],
    technologies = [],
    domainId = 'dom-fullstack'
  }) {
    if (!candidateId) throw new Error('candidateId is required');
    if (!title || !title.trim()) throw new Error('Project title is required');
    if (!repositoryUrl || !repositoryUrl.trim()) throw new Error('repositoryUrl is required');
    if (!repositoryUrl.startsWith('http://') && !repositoryUrl.startsWith('https://')) {
      throw new Error('repositoryUrl must start with http:// or https://');
    }

    return repository.transaction((repo) => {
      const now = new Date().toISOString();
      const targetSkills = Array.isArray(skillsDemonstrated) && skillsDemonstrated.length > 0
        ? skillsDemonstrated
        : (Array.isArray(technologies) && technologies.length > 0 ? technologies : ['Full-Stack Development']);

      const combinedSkills = Array.from(new Set(targetSkills.map(s => typeof s === 'string' ? s.trim() : '').filter(Boolean)));

      let createdCount = 0;
      let updatedCount = 0;
      const evidenceIds = [];

      for (const skillName of combinedSkills) {
        // Resolve or insert canonical skill
        let skill = repo.queryOne('SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?);', [skillName]);
        if (!skill) {
          const newSkillId = `sk-${uuidv4().slice(0, 8)}`;
          const dom = repo.queryOne('SELECT id FROM domains WHERE id = ?;', [domainId])
            || repo.queryOne('SELECT id FROM domains LIMIT 1;');
          const validDomainId = dom ? dom.id : 'dom-fullstack';

          repo.execute(`
            INSERT INTO skills (id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'General', '1-5', '["github_pr","project_repo","assessment_score","practical_coding"]', '["practical_coding"]', 1, ?, ?)
          `, [newSkillId, validDomainId, skillName, `${skillName} competency`, now, now]);

          skill = { id: newSkillId, name: skillName };
        }

        const metadataJson = JSON.stringify({
          description: description || '',
          liveDemoUrl: liveDemoUrl || null,
          technologies,
          skillsDemonstrated,
          submittedAt: now
        });

        const existingEvidence = repo.queryOne(
          'SELECT id FROM skill_evidence WHERE candidate_id = ? AND skill_id = ? AND reference_url = ?;',
          [candidateId, skill.id, repositoryUrl.trim()]
        );

        let evidenceId;
        if (existingEvidence) {
          evidenceId = existingEvidence.id;
          repo.execute(`
            UPDATE skill_evidence
            SET title = ?, metadata = ?, updated_at = ?
            WHERE id = ?;
          `, [title.trim(), metadataJson, now, evidenceId]);
          updatedCount++;
        } else {
          evidenceId = `ev-${uuidv4().slice(0, 8)}`;
          repo.execute(`
            INSERT INTO skill_evidence (
              id, candidate_id, skill_id, evidence_type, title, reference_url,
              metadata, source, verification_status, created_at, updated_at
            ) VALUES (?, ?, ?, 'project_repo', ?, ?, ?, 'github_import', 'pending_review', ?, ?)
          `, [
            evidenceId,
            candidateId,
            skill.id,
            title.trim(),
            repositoryUrl.trim(),
            metadataJson,
            now,
            now
          ]);
          createdCount++;
        }
        evidenceIds.push(evidenceId);

        // Record in SkillEvidenceEngine
        SkillEvidenceEngine.recordEvidence({
          candidateId,
          skillId: skill.id,
          skillName: skill.name,
          evidenceType: 'project_repo',
          source: 'github_repository',
          title: `Project Evidence: ${title.trim()}`,
          referenceUrl: repositoryUrl.trim(),
          score: 80,
          maxScore: 100,
          demonstratedLevel: 3,
          metadata: {
            evidenceId,
            liveDemoUrl,
            technologies,
            skillsDemonstrated,
            submittedAt: now
          }
        });

        // Update candidate_skills
        repo.execute(`
          INSERT INTO candidate_skills (
            id, candidate_id, skill_id, proficiency, verification_status, source, created_at, updated_at
          ) VALUES (?, ?, ?, 3, 'evidence_submitted', 'project_evidence', ?, ?)
          ON CONFLICT(candidate_id, skill_id) DO UPDATE SET
            proficiency = MAX(candidate_skills.proficiency, excluded.proficiency),
            verification_status = CASE
              WHEN candidate_skills.verification_status IN ('verified', 'diagnostic_tested') THEN candidate_skills.verification_status
              ELSE 'evidence_submitted'
            END,
            updated_at = excluded.updated_at
        `, [
          `cs-${uuidv4().slice(0, 8)}`,
          candidateId,
          skill.id,
          now,
          now
        ]);
      }

      // Update candidate's repo_count in candidate_profiles
      repo.execute(`
        UPDATE candidate_profiles
        SET repo_count = (
          SELECT COUNT(DISTINCT reference_url)
          FROM skill_evidence
          WHERE candidate_id = ?
        ),
        updated_at = ?
        WHERE id = ?;
      `, [candidateId, now, candidateId]);

      return {
        success: true,
        createdCount,
        updatedCount,
        evidenceIds,
        message: `Successfully processed project evidence across ${combinedSkills.length} competencies (${createdCount} new, ${updatedCount} updated).`
      };
    });
  }
};
