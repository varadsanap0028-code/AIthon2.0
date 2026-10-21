import { repository } from '../data/repository.js';

export const matchingService = {
  /**
   * Calculates explainable, deterministic match breakdown for a candidate against a job.
   */
  calculateJobMatch(candidateId, jobId) {
    // 1. Fetch Job Requirements
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

    // 2. Fetch Candidate's Skills and Evidence
    const candidateSkills = repository.query(
      `SELECT cs.*, s.name as skill_name, s.category as skill_category
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ?;`,
      [candidateId]
    );
    const skillMap = new Map();
    for (const cs of candidateSkills) {
      skillMap.set(cs.skill_id, cs);
    }

    // 3. Fetch candidate's verified evidence items
    const evidenceList = repository.query(
      `SELECT * FROM skill_evidence WHERE candidate_id = ? ORDER BY created_at DESC;`,
      [candidateId]
    );

    // 4. Fetch candidate's assessments relevant to the domain or job
    const assessmentResults = repository.query(
      `SELECT ar.*, at.title as template_title, at.type as assessment_type
       FROM assessment_results ar
       JOIN assessment_templates at ON at.id = ar.template_id
       WHERE ar.candidate_id = ?
       ORDER BY ar.created_at DESC;`,
      [candidateId]
    );

    // Edge case: Job has no configured skill requirements
    if (requirements.length === 0) {
      return {
        matchScore: 50,
        requiredSkillCoverage: 100,
        preferredSkillCoverage: 100,
        readinessScore: 60,
        matchedRequired: [],
        matchedPreferred: [],
        unmetRequirements: [],
        unverifiedSkills: [],
        evidenceMatches: evidenceList,
        assessmentResults,
        explanation: 'This job has no specific technical skill requirements configured. Baseline match assigned.',
      };
    }

    let requiredWeightSum = 0;
    let requiredEarnedWeight = 0;
    let preferredWeightSum = 0;
    let preferredEarnedWeight = 0;

    const matchedRequired = [];
    const matchedPreferred = [];
    const unmetRequirements = [];
    const unverifiedSkills = [];

    for (const req of requirements) {
      const cSkill = skillMap.get(req.skill_id);
      const isRequired = req.requirement_type === 'required';
      const weight = req.weight || 1.0;

      if (isRequired) requiredWeightSum += weight;
      else preferredWeightSum += weight;

      if (!cSkill) {
        // Missing completely
        unmetRequirements.push({
          skillId: req.skill_id,
          skillName: req.skill_name,
          requirementType: req.requirement_type,
          targetProficiency: req.target_proficiency,
          candidateProficiency: 0,
          status: 'missing',
          reason: 'Candidate has not reported or demonstrated this competency.',
        });
        continue;
      }

      const isVerified = cSkill.verification_status === 'verified';
      const isPending = ['evidence_submitted', 'verification_pending'].includes(cSkill.verification_status);
      const isSelfReported = cSkill.verification_status === 'self_reported';

      // Verification multiplier: Verified = 1.0, Pending Evidence = 0.6, Self-reported = 0.3
      let verificationMultiplier = 0.3;
      if (isVerified) verificationMultiplier = 1.0;
      else if (isPending) verificationMultiplier = 0.6;

      // Proficiency fulfillment ratio capped at 1.0
      const profRatio = Math.min(cSkill.proficiency / req.target_proficiency, 1.0);
      const earned = weight * profRatio * verificationMultiplier;

      if (isRequired) requiredEarnedWeight += earned;
      else preferredEarnedWeight += earned;

      if (isVerified && cSkill.proficiency >= req.target_proficiency) {
        if (isRequired) {
          matchedRequired.push({
            skillId: req.skill_id,
            skillName: req.skill_name,
            targetProficiency: req.target_proficiency,
            candidateProficiency: cSkill.proficiency,
            verificationStatus: cSkill.verification_status,
          });
        } else {
          matchedPreferred.push({
            skillId: req.skill_id,
            skillName: req.skill_name,
            targetProficiency: req.target_proficiency,
            candidateProficiency: cSkill.proficiency,
            verificationStatus: cSkill.verification_status,
          });
        }
      } else if (!isVerified) {
        unverifiedSkills.push({
          skillId: req.skill_id,
          skillName: req.skill_name,
          requirementType: req.requirement_type,
          targetProficiency: req.target_proficiency,
          candidateProficiency: cSkill.proficiency,
          verificationStatus: cSkill.verification_status,
          reason: isSelfReported
            ? 'Skill is self-reported only. Practical evidence or assessment required.'
            : 'Evidence has been submitted and is currently pending verification review.',
        });
      } else {
        // Verified but below target
        unmetRequirements.push({
          skillId: req.skill_id,
          skillName: req.skill_name,
          requirementType: req.requirement_type,
          targetProficiency: req.target_proficiency,
          candidateProficiency: cSkill.proficiency,
          status: 'below_target',
          reason: `Verified proficiency (${cSkill.proficiency}/5) is below job target (${req.target_proficiency}/5).`,
        });
      }
    }

    const requiredCoverage = requiredWeightSum > 0
      ? Math.round((requiredEarnedWeight / requiredWeightSum) * 100)
      : 100;

    const preferredCoverage = preferredWeightSum > 0
      ? Math.round((preferredEarnedWeight / preferredWeightSum) * 100)
      : 100;

    // Bonus for practical assessments passed (up to 10 points)
    const passedAssessmentsCount = assessmentResults.filter(a => a.passed === 1).length;
    const assessmentBonus = Math.min(passedAssessmentsCount * 5, 10);

    // Final Job Match Score: 70% Required Coverage + 20% Preferred Coverage + 10% Assessment Bonus
    const matchScore = Math.min(
      100,
      Math.round((requiredCoverage * 0.7) + (preferredCoverage * 0.2) + assessmentBonus)
    );

    // Overall candidate readiness (independent of this job):
    // average of candidate's verified skills & assessment passes
    const verifiedSkillsCount = candidateSkills.filter(cs => cs.verification_status === 'verified').length;
    const readinessScore = Math.min(
      100,
      Math.round((verifiedSkillsCount * 15) + (passedAssessmentsCount * 20) + 20)
    );

    const explanation = `Job match of ${matchScore}% calculated deterministically: Required skills coverage is ${requiredCoverage}% (weighted at 70%), Preferred skills coverage is ${preferredCoverage}% (weighted at 20%), plus an assessment verification bonus of +${assessmentBonus}% based on ${passedAssessmentsCount} completed practical assessments. Candidate has ${matchedRequired.length} fully verified required skills, ${unverifiedSkills.length} unverified/pending claims, and ${unmetRequirements.length} unmet competency targets.`;

    const verifiedRequirementsCount = matchedRequired.length;
    const totalRequirementsCount = requirements.length;
    const evidenceCoverage = totalRequirementsCount > 0
      ? Math.round((verifiedRequirementsCount / totalRequirementsCount) * 100)
      : 100;

    let evidenceUncertainty = 'HIGH';
    if (evidenceCoverage >= 80) evidenceUncertainty = 'LOW';
    else if (evidenceCoverage >= 40) evidenceUncertainty = 'MEDIUM';

    return {
      matchScore,
      requiredSkillCoverage: requiredCoverage,
      preferredSkillCoverage: preferredCoverage,
      readinessScore,
      matchedRequired,
      matchedPreferred,
      unmetRequirements,
      unverifiedSkills,
      evidenceMatches: evidenceList,
      assessmentResults,
      explanation,
      evidenceCoverage,
      evidenceUncertainty,
      disclaimer: 'This score represents objective technical competency alignment and is not an automated hiring decision.',
    };
  }
};
