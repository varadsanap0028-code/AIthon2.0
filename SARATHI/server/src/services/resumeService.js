import { repository } from '../data/repository.js';
import { candidateService } from './candidateService.js';
import { v4 as uuidv4 } from 'uuid';

export const resumeService = {
  listResumes(userId) {
    const rows = repository.query(
      `SELECT id, user_id, title, target_role, template_id, sections_config,
              is_default, created_at, updated_at
       FROM student_resumes
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC;`,
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      targetRole: r.target_role,
      templateId: r.template_id,
      sectionsConfig: JSON.parse(r.sections_config || '{}'),
      isDefault: Boolean(r.is_default),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  getResume(userId, resumeId) {
    const row = repository.queryOne(
      `SELECT * FROM student_resumes WHERE id = ? AND user_id = ?;`,
      [resumeId, userId]
    );

    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      targetRole: row.target_role,
      templateId: row.template_id,
      sectionsConfig: JSON.parse(row.sections_config || '{}'),
      customContent: JSON.parse(row.custom_content || '{}'),
      isDefault: Boolean(row.is_default),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  createResume(userId, {
    title,
    targetRole = '',
    templateId = 'modern-ats',
    sectionsConfig = {},
    customContent = {},
    isDefault = false
  }) {
    const resumeId = `resm-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    repository.transaction(repo => {
      if (isDefault) {
        repo.execute(
          'UPDATE student_resumes SET is_default = 0 WHERE user_id = ?;',
          [userId]
        );
      }

      repo.execute(
        `INSERT INTO student_resumes (
          id, user_id, title, target_role, template_id, sections_config,
          custom_content, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          resumeId,
          userId,
          title.trim(),
          targetRole ? targetRole.trim() : null,
          templateId || 'modern-ats',
          JSON.stringify(sectionsConfig || {}),
          JSON.stringify(customContent || {}),
          isDefault ? 1 : 0,
          now,
          now
        ]
      );
    });

    return this.getResume(userId, resumeId);
  },

  updateResume(userId, resumeId, updates = {}) {
    const existing = repository.queryOne(
      'SELECT id FROM student_resumes WHERE id = ? AND user_id = ?;',
      [resumeId, userId]
    );

    if (!existing) {
      throw new Error('Resume not found or unauthorized');
    }

    const now = new Date().toISOString();

    repository.transaction(repo => {
      if (updates.isDefault) {
        repo.execute(
          'UPDATE student_resumes SET is_default = 0 WHERE user_id = ?;',
          [userId]
        );
      }

      const sets = [];
      const params = [];

      if (updates.title !== undefined) {
        sets.push('title = ?');
        params.push(updates.title.trim());
      }
      if (updates.targetRole !== undefined) {
        sets.push('target_role = ?');
        params.push(updates.targetRole ? updates.targetRole.trim() : null);
      }
      if (updates.templateId !== undefined) {
        sets.push('template_id = ?');
        params.push(updates.templateId);
      }
      if (updates.sectionsConfig !== undefined) {
        sets.push('sections_config = ?');
        params.push(JSON.stringify(updates.sectionsConfig));
      }
      if (updates.customContent !== undefined) {
        sets.push('custom_content = ?');
        params.push(JSON.stringify(updates.customContent));
      }
      if (updates.isDefault !== undefined) {
        sets.push('is_default = ?');
        params.push(updates.isDefault ? 1 : 0);
      }

      sets.push('updated_at = ?');
      params.push(now);

      params.push(resumeId, userId);

      repo.execute(
        `UPDATE student_resumes SET ${sets.join(', ')} WHERE id = ? AND user_id = ?;`,
        params
      );
    });

    return this.getResume(userId, resumeId);
  },

  deleteResume(userId, resumeId) {
    const result = repository.execute(
      'DELETE FROM student_resumes WHERE id = ? AND user_id = ?;',
      [resumeId, userId]
    );

    return { success: result.changes > 0, resumeId };
  },

  compileStudentResume(userId, { targetRole = null } = {}) {
    const passport = candidateService.getCandidatePassport(userId);
    if (!passport) {
      throw new Error('Candidate profile not found');
    }

    const { candidate, skills = [], evidence = [], assessments = [] } = passport;

    const effRole = targetRole || candidate.target_role || 'Software Engineer';

    // Prioritize skills matching target domain
    const skillsByCategory = {};
    skills.forEach(s => {
      const cat = s.skill_category || 'Core Technologies';
      if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
      skillsByCategory[cat].push({
        id: s.skill_id || s.id,
        name: s.skill_name || s.name,
        category: cat,
        proficiency: s.proficiency || 1,
        verificationStatus: s.verification_status || 'self_reported',
        evidenceCount: s.evidence_count || 0,
      });
    });

    // Evidence projects
    const projects = evidence.map(e => ({
      id: e.id,
      title: e.title,
      description: e.metadata?.description || e.metadata?.desc || '',
      repositoryUrl: e.reference_url,
      liveDemoUrl: e.metadata?.liveDemoUrl || null,
      technologies: Array.isArray(e.metadata?.technologies)
        ? e.metadata.technologies
        : e.metadata?.skillsDemonstrated || [],
      verificationStatus: e.verification_status,
      type: e.evidence_type,
    }));

    // Education
    const education = [];
    if (candidate.degree || candidate.institution) {
      education.push({
        institution: candidate.institution || 'University',
        degree: candidate.degree || 'Degree Program',
        graduationYear: candidate.graduation_year || '',
        location: candidate.location || '',
      });
    }

    // Assessments
    const passedAssessments = assessments
      .filter(a => a.passed)
      .map(a => ({
        id: a.id,
        title: a.template_title,
        domain: a.domain_title,
        score: a.score,
        maxScore: a.max_score,
        completedAt: a.graded_at,
      }));

    return {
      personalInfo: {
        fullName: candidate.full_name,
        headline: candidate.headline || effRole,
        email: candidate.email,
        location: candidate.location || '',
        bio: candidate.bio || '',
        githubUrl: candidate.github_url || '',
        linkedinUrl: candidate.linkedin_url || '',
        portfolioUrl: candidate.portfolio_url || '',
        targetRole: effRole,
      },
      education,
      skillsByCategory,
      skillsList: skills.map(s => ({
        name: s.skill_name || s.name,
        proficiency: s.proficiency || 1,
        verificationStatus: s.verification_status,
        category: s.skill_category || 'General',
      })),
      projects,
      passedAssessments,
    };
  }
};
