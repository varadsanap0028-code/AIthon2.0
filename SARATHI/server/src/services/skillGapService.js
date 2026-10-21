import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { matchingService } from './matchingService.js';

export const skillGapService = {
  /**
   * Generates or refreshes a job-specific skill gap analysis for a candidate.
   */
  analyzeSkillGap(candidateId, jobId) {
    const job = repository.queryOne('SELECT * FROM jobs WHERE id = ?;', [jobId]);
    if (!job) throw new Error('Job not found');

    const requirements = repository.query(
      `SELECT r.*, s.name as skill_name, s.category as skill_category, d.title as domain_title
       FROM job_skill_requirements r
       JOIN skills s ON s.id = r.skill_id
       JOIN domains d ON d.id = s.domain_id
       WHERE r.job_id = ?;`,
      [jobId]
    );

    const candidateSkills = repository.query(
      `SELECT cs.*, s.name as skill_name
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ?;`,
      [candidateId]
    );
    const skillMap = new Map();
    for (const cs of candidateSkills) {
      skillMap.set(cs.skill_id, cs);
    }

    // Available assessments that could bridge gaps
    const availableAssessments = repository.query(
      'SELECT id, title, domain_id, assessed_skills FROM assessment_templates WHERE active = 1;'
    ).map(a => ({
      ...a,
      assessed_skills: JSON.parse(a.assessed_skills || '[]'),
    }));

    const gapItems = [];
    let metCount = 0;
    let requiredCount = 0;

    for (const req of requirements) {
      const isRequired = req.requirement_type === 'required';
      if (isRequired) requiredCount++;

      const cSkill = skillMap.get(req.skill_id);
      const candProf = cSkill ? cSkill.proficiency : 0;
      const verStatus = cSkill ? cSkill.verification_status : 'missing';

      let gapStatus = 'missing';
      let recommendation = null;

      // Find an assessment template that tests this skill
      const matchingAssessment = availableAssessments.find(a => a.assessed_skills.includes(req.skill_id));

      if (!cSkill) {
        gapStatus = 'missing';
        recommendation = matchingAssessment
          ? `Invite candidate to take '${matchingAssessment.title}' to evaluate baseline competency.`
          : 'Request candidate submit relevant repository or project work demonstrating this skill.';
      } else if (verStatus !== 'verified') {
        gapStatus = 'unverified';
        if (verStatus === 'evidence_submitted' || verStatus === 'verification_pending') {
          recommendation = 'Review pending evidence submission in Verification queue.';
        } else if (matchingAssessment) {
          recommendation = `Candidate self-reports level ${candProf}/5. Recommend practical verification via '${matchingAssessment.title}'.`;
        } else {
          recommendation = `Candidate self-reports level ${candProf}/5. Request verifiable PR or repository link.`;
        }
      } else if (candProf < req.target_proficiency) {
        gapStatus = 'below_target';
        recommendation = `Verified at level ${candProf}/5, but job seeks level ${req.target_proficiency}/5. Consider technical deep-dive during interview.`;
      } else {
        gapStatus = 'met';
        metCount++;
        recommendation = `Fully satisfied with verified proficiency of ${candProf}/5.`;
      }

      gapItems.push({
        skillId: req.skill_id,
        skillName: req.skill_name,
        domainTitle: req.domain_title,
        requirementType: req.requirement_type,
        targetProficiency: req.target_proficiency,
        candidateProficiency: candProf,
        verificationStatus: verStatus,
        gapStatus,
        recommendation,
      });
    }

    // Match calculation
    const match = matchingService.calculateJobMatch(candidateId, jobId);
    const now = new Date().toISOString();
    const analysisId = `sga-${uuidv4().slice(0, 8)}`;

    // Persist or update
    return repository.transaction((repo) => {
      // Remove old analysis if any
      const existing = repo.queryOne(
        'SELECT id FROM skill_gap_analyses WHERE candidate_id = ? AND job_id = ?;',
        [candidateId, jobId]
      );
      if (existing) {
        repo.execute('DELETE FROM skill_gap_items WHERE analysis_id = ?;', [existing.id]);
        repo.execute('DELETE FROM skill_gap_analyses WHERE id = ?;', [existing.id]);
      }

      const summaryText = `${metCount} of ${requiredCount} required skills met. ${gapItems.filter(g => g.gapStatus === 'unverified').length} skills require evidence review or practical assessment.`;

      repo.execute(
        `INSERT INTO skill_gap_analyses (
          id, candidate_id, job_id, overall_match_score, required_skill_coverage,
          preferred_skill_coverage, summary, calculated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          analysisId, candidateId, jobId, match.matchScore,
          match.requiredSkillCoverage, match.preferredSkillCoverage,
          summaryText, now
        ]
      );

      for (const item of gapItems) {
        repo.execute(
          `INSERT INTO skill_gap_items (
            id, analysis_id, skill_id, requirement_type, target_proficiency,
            candidate_proficiency, verification_status, gap_status, recommendation, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `sgi-${uuidv4().slice(0, 8)}`,
            analysisId,
            item.skillId,
            item.requirementType,
            item.targetProficiency,
            item.candidateProficiency,
            item.verificationStatus,
            item.gapStatus,
            item.recommendation,
            now
          ]
        );
      }

      return {
        id: analysisId,
        candidateId,
        jobId,
        jobTitle: job.title,
        overallMatchScore: match.matchScore,
        requiredSkillCoverage: match.requiredSkillCoverage,
        preferredSkillCoverage: match.preferredSkillCoverage,
        summary: summaryText,
        calculatedAt: now,
        items: gapItems,
      };
    });
  }
};
