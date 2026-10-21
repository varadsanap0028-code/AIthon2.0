import { randomUUID as uuidv4, createHash } from 'node:crypto';
import { getDb } from '../config/db.js';
import { RoleBenchmarkService } from './roleBenchmarkService.js';
import { DependencyGraphService } from './dependencyGraphService.js';

export const SCORING_RULE_VERSION = '2026.1';

/**
 * SARATHI AI — Central Skill Evidence Engine
 * Implements canonical competency profile management, deterministic proficiency
 * aggregation, evidence provenance, gap analysis, and career readiness scoring.
 */
export class SkillEvidenceEngine {
  /**
   * Generates a deterministic hash for deduplicating incoming evidence items.
   */
  static generateEvidenceHash(candidateId, skillId, evidenceType, referenceUrl, title) {
    const raw = `${candidateId}:${skillId}:${evidenceType}:${(referenceUrl || '').trim()}:${(title || '').trim().toLowerCase()}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Records a new piece of validated evidence into the evidence ledger.
   * Performs deduplication, ownership verification, and triggers profile recalculation.
   */
  static recordEvidence({
    candidateId,
    skillId,
    skillName,
    evidenceType,
    source,
    title,
    referenceUrl = null,
    score = null,
    maxScore = 100,
    demonstratedLevel = null,
    metadata = {}
  }) {
    if (!candidateId) throw new Error('candidateId is required');
    if (!skillId && !skillName) throw new Error('skillId or skillName is required');
    if (!evidenceType) throw new Error('evidenceType is required');
    if (!title) throw new Error('evidence title is required');

    const db = getDb();

    // Verify candidate exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(candidateId);
    if (!user) throw new Error(`Candidate with id ${candidateId} not found`);

    // Resolve or insert canonical skill
    let resolvedSkillId = skillId;
    let skillRow = resolvedSkillId ? db.prepare('SELECT id, name FROM skills WHERE id = ?').get(resolvedSkillId) : null;
    if (!skillRow && skillName) {
      skillRow = db.prepare('SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?)').get(skillName.trim());
    }
    if (!skillRow) {
      resolvedSkillId = resolvedSkillId || `sk-${uuidv4().slice(0, 8)}`;
      const now = new Date().toISOString();
      const sName = skillName || resolvedSkillId;
      const domainRow = db.prepare('SELECT id FROM domains WHERE id = ? OR id = ? LIMIT 1').get('dom-frontend', 'dom-fullstack')
        || db.prepare('SELECT id FROM domains LIMIT 1').get();
      const validDomainId = domainRow ? domainRow.id : 'dom-frontend';
      db.prepare(`
        INSERT INTO skills (id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'General', '1-5', '["github_pr","project_repo","assessment_score","practical_coding"]', '["practical_coding"]', 1, ?, ?)
      `).run(resolvedSkillId, validDomainId, sName.trim(), `${sName} competency`, now, now);
    } else {
      resolvedSkillId = skillRow.id;
    }

    // Deduplication check: Has identical evidence already been recorded?
    const evidenceHash = this.generateEvidenceHash(candidateId, resolvedSkillId, evidenceType, referenceUrl, title);
    const existingLedgerItem = db.prepare(`
      SELECT id, score, max_score, demonstrated_level FROM skill_evidence_ledger
      WHERE candidate_id = ? AND skill_id = ? AND evidence_type = ? AND reference_url = ? AND title = ?
    `).get(candidateId, resolvedSkillId, evidenceType, referenceUrl || '', title);

    const now = new Date().toISOString();

    if (existingLedgerItem) {
      // Update existing record if score or metadata changed, without creating duplicate
      db.prepare(`
        UPDATE skill_evidence_ledger SET
          score = ?,
          max_score = ?,
          demonstrated_level = ?,
          metadata = ?,
          created_at = ?
        WHERE id = ?
      `).run(
        score,
        maxScore,
        demonstratedLevel,
        JSON.stringify({ ...metadata, evidenceHash, updated: true }),
        now,
        existingLedgerItem.id
      );

      this.aggregateStudentProfile(candidateId);
      return { id: existingLedgerItem.id, isNew: false, skillId: resolvedSkillId };
    }

    const ledgerId = `sel-${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO skill_evidence_ledger (
        id, candidate_id, skill_id, evidence_type, source, title, reference_url,
        score, max_score, demonstrated_level, validity_status, rule_version, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID', ?, ?, ?)
    `).run(
      ledgerId,
      candidateId,
      resolvedSkillId,
      evidenceType,
      source || 'evidence_engine',
      title,
      referenceUrl || '',
      score,
      maxScore,
      demonstratedLevel,
      SCORING_RULE_VERSION,
      JSON.stringify({ ...metadata, evidenceHash }),
      now
    );

    // Also sync to legacy skill_evidence for recruiter verification compatibility
    const legacyEvidenceId = `se-${uuidv4().slice(0, 8)}`;
    const existingLegacy = db.prepare(`
      SELECT id FROM skill_evidence WHERE candidate_id = ? AND skill_id = ? AND reference_url = ?
    `).get(candidateId, resolvedSkillId, referenceUrl || '');

    if (!existingLegacy) {
      db.prepare(`
        INSERT INTO skill_evidence (
          id, candidate_id, skill_id, evidence_type, title, reference_url, metadata,
          source, verification_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)
      `).run(
        legacyEvidenceId,
        candidateId,
        resolvedSkillId,
        evidenceType === 'github_repo' ? 'project_repo' : 'assessment_score',
        title,
        referenceUrl || '',
        JSON.stringify(metadata),
        source || 'evidence_engine',
        now,
        now
      );
    }

    // Trigger profile recalculation
    this.aggregateStudentProfile(candidateId);

    return { id: ledgerId, isNew: true, skillId: resolvedSkillId };
  }

  /**
   * Aggregates all ledger evidence into the canonical student competency profile.
   * Applies the documented proficiency aggregation policy:
   *  - 0 items: INSUFFICIENT_EVIDENCE, demonstrated_proficiency = null, confidence = NONE
   *  - 1 item: PROVISIONAL, capped at Level 2, confidence = LOW
   *  - 2 items: PROVISIONAL, capped at Level 3, confidence = MEDIUM
   *  - 3+ items: VERIFIED, up to Level 5, confidence = HIGH
   *  - Conflicting check: score variance > 35 points in last 90 days -> CONFLICTING
   *  - Outdated check: newest evidence > 180 days -> OUTDATED
   */
  static aggregateStudentProfile(candidateId) {
    const db = getDb();

    // 1. Fetch all ledger evidence for this candidate
    const ledgerItems = db.prepare(`
      SELECT * FROM skill_evidence_ledger
      WHERE candidate_id = ? AND validity_status = 'VALID'
      ORDER BY created_at ASC
    `).all(candidateId);

    // Group by skill_id
    const grouped = new Map();
    for (const item of ledgerItems) {
      if (!grouped.has(item.skill_id)) {
        grouped.set(item.skill_id, []);
      }
      grouped.get(item.skill_id).push(item);
    }

    const nowTime = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const upsertProfile = db.prepare(`
      INSERT INTO canonical_skill_profiles (
        candidate_id, skill_id, demonstrated_proficiency, evidence_status,
        confidence, evidence_count, last_evidence_at, scoring_rule_version,
        reassessment_recommended, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(candidate_id, skill_id) DO UPDATE SET
        demonstrated_proficiency = excluded.demonstrated_proficiency,
        evidence_status = excluded.evidence_status,
        confidence = excluded.confidence,
        evidence_count = excluded.evidence_count,
        last_evidence_at = excluded.last_evidence_at,
        scoring_rule_version = excluded.scoring_rule_version,
        reassessment_recommended = excluded.reassessment_recommended,
        updated_at = excluded.updated_at
    `);

    // Sync legacy candidate_skills table without downgrading verified/diagnostic_tested/unverified
    const upsertCandidateSkill = db.prepare(`
      INSERT INTO candidate_skills (
        id, candidate_id, skill_id, proficiency, verification_status, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'evidence_engine', ?, ?)
      ON CONFLICT(candidate_id, skill_id) DO UPDATE SET
        proficiency = MAX(candidate_skills.proficiency, excluded.proficiency),
        verification_status = CASE
          WHEN candidate_skills.verification_status = 'verified' THEN 'verified'
          WHEN candidate_skills.verification_status = 'diagnostic_tested' THEN 'diagnostic_tested'
          WHEN candidate_skills.verification_status = 'unverified' THEN 'unverified'
          ELSE excluded.verification_status
        END,
        updated_at = excluded.updated_at
    `);

    for (const [skillId, items] of grouped.entries()) {
      const evidenceCount = items.length;
      const newestItem = items[items.length - 1];
      const lastEvidenceAt = newestItem.created_at;
      const ageDays = (nowTime - new Date(lastEvidenceAt).getTime()) / MS_PER_DAY;

      // Extract valid scores
      const scores = items
        .filter(i => typeof i.score === 'number' && i.max_score > 0)
        .map(i => Math.round((i.score / i.max_score) * 100));

      let rawLevel = 1;
      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore >= 90) rawLevel = 5;
        else if (avgScore >= 80) rawLevel = 4;
        else if (avgScore >= 60) rawLevel = 3;
        else if (avgScore >= 40) rawLevel = 2;
        else rawLevel = 1;
      } else {
        // Fallback to highest demonstrated_level recorded
        const levels = items.map(i => i.demonstrated_level).filter(Boolean);
        if (levels.length > 0) {
          rawLevel = Math.max(...levels);
        }
      }

      // Evidence capping rule
      let demonstratedProficiency = rawLevel;
      let evidenceStatus = 'PROVISIONAL';
      let confidence = 'LOW';

      if (evidenceCount === 1) {
        demonstratedProficiency = Math.min(2, rawLevel);
        evidenceStatus = 'PROVISIONAL';
        confidence = 'LOW';
      } else if (evidenceCount === 2) {
        demonstratedProficiency = Math.min(3, rawLevel);
        evidenceStatus = 'PROVISIONAL';
        confidence = 'MEDIUM';
      } else {
        demonstratedProficiency = rawLevel;
        evidenceStatus = 'VERIFIED';
        confidence = 'HIGH';
      }

      let reassessmentRecommended = 0;

      // Check for conflicting evidence (variance > 35 points within 90 days)
      if (scores.length >= 2) {
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        if (maxScore - minScore > 35) {
          evidenceStatus = 'CONFLICTING';
          confidence = 'LOW';
          reassessmentRecommended = 1;
        }
      }

      // Check for outdated evidence (> 180 days old)
      if (ageDays > 180) {
        evidenceStatus = 'OUTDATED';
        confidence = 'LOW';
        reassessmentRecommended = 1;
      }

      const now = new Date().toISOString();

      upsertProfile.run(
        candidateId,
        skillId,
        demonstratedProficiency,
        evidenceStatus,
        confidence,
        evidenceCount,
        lastEvidenceAt,
        SCORING_RULE_VERSION,
        reassessmentRecommended,
        now
      );

      // Map to legacy candidate_skills
      const legacyStatus = evidenceStatus === 'VERIFIED' ? 'verified' : 'evidence_submitted';
      upsertCandidateSkill.run(
        `cs-${uuidv4().slice(0, 8)}`,
        candidateId,
        skillId,
        demonstratedProficiency,
        legacyStatus,
        now,
        now
      );
    }
  }

  /**
   * Retrieves canonical profile for a candidate.
   * If a targetRole is provided, ensures all benchmark skills are represented (even if unassessed).
   */
  static getCanonicalProfile(candidateId, targetRole = null) {
    const db = getDb();

    const storedProfiles = db.prepare(`
      SELECT cp.*, s.name as skill_name, s.category, d.title as domain_title
      FROM canonical_skill_profiles cp
      JOIN skills s ON cp.skill_id = s.id
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE cp.candidate_id = ?
    `).all(candidateId);

    const profileMap = new Map();
    const mappedStoredProfiles = storedProfiles.map(existing => ({
      skillId: existing.skill_id,
      skillName: existing.skill_name,
      category: existing.category,
      demonstratedProficiency: existing.demonstrated_proficiency,
      evidenceStatus: existing.evidence_status,
      confidence: existing.confidence,
      evidenceCount: existing.evidence_count,
      lastEvidenceAt: existing.last_evidence_at,
      reassessmentRecommended: Boolean(existing.reassessment_recommended)
    }));

    for (const p of mappedStoredProfiles) {
      if (p.skillName) {
        profileMap.set(p.skillName.toLowerCase(), p);
      }
    }

    if (!targetRole) {
      return mappedStoredProfiles;
    }

    const benchmark = RoleBenchmarkService.getRoleBenchmark(targetRole);
    const enrichedSkills = [];

    for (const req of benchmark.requiredSkills) {
      const existing = profileMap.get(req.skillName.toLowerCase());

      if (existing) {
        enrichedSkills.push({
          skillId: existing.skillId,
          skillName: existing.skillName,
          category: existing.category || req.category,
          demonstratedProficiency: existing.demonstratedProficiency,
          evidenceStatus: existing.evidenceStatus,
          confidence: existing.confidence,
          evidenceCount: existing.evidenceCount,
          lastEvidenceAt: existing.lastEvidenceAt,
          reassessmentRecommended: Boolean(existing.reassessmentRecommended),
          requiredProficiency: req.requiredProficiency,
          weight: req.weight,
          isMandatory: req.isMandatory,
          prerequisites: req.prerequisites,
          whyItMatters: req.whyItMatters
        });
      } else {
        // Explicitly unassessed competency (Do NOT invent proficiency!)
        enrichedSkills.push({
          skillId: req.skillId,
          skillName: req.skillName,
          category: req.category,
          demonstratedProficiency: null, // explicit null
          evidenceStatus: 'INSUFFICIENT_EVIDENCE',
          confidence: 'NONE',
          evidenceCount: 0,
          lastEvidenceAt: null,
          reassessmentRecommended: false,
          requiredProficiency: req.requiredProficiency,
          weight: req.weight,
          isMandatory: req.isMandatory,
          prerequisites: req.prerequisites,
          whyItMatters: req.whyItMatters
        });
      }
    }

    return enrichedSkills;
  }

  /**
   * Calculates deterministic skill gap analysis for a candidate and target role.
   * Follows: gap = max(0, requiredProficiency - demonstratedProficiency)
   * With explicit states: VERIFIED_GAP, PRELIMINARY_GAP, EVIDENCE_NEEDED, BENCHMARK_MET, REASSESSMENT_RECOMMENDED
   */
  static calculateSkillGaps(candidateId, targetRole) {
    const benchmark = RoleBenchmarkService.getRoleBenchmark(targetRole);
    const profileSkills = this.getCanonicalProfile(candidateId, targetRole);

    const candidateSkillMap = new Map();
    for (const s of profileSkills) {
      candidateSkillMap.set(s.skillName.toLowerCase(), {
        proficiency: s.demonstratedProficiency || 0,
        status: s.evidenceStatus
      });
    }

    // Apply dependency-aware prioritization
    const prioritized = DependencyGraphService.prioritizeCompetencies(
      benchmark.requiredSkills,
      candidateSkillMap
    );

    const gapItems = [];
    let verifiedGapsCount = 0;
    let preliminaryGapsCount = 0;
    let evidenceNeededCount = 0;
    let benchmarkMetCount = 0;

    for (const p of prioritized) {
      const cSkill = profileSkills.find(s => s.skillName.toLowerCase() === p.skillName.toLowerCase());
      const demonstratedProficiency = cSkill?.demonstratedProficiency ?? null;
      const evidenceStatus = cSkill?.evidenceStatus ?? 'INSUFFICIENT_EVIDENCE';
      const confidence = cSkill?.confidence ?? 'NONE';

      let gapStatus = 'EVIDENCE_NEEDED';
      let gapLevel = p.requiredProficiency;

      if (evidenceStatus === 'INSUFFICIENT_EVIDENCE' || demonstratedProficiency === null) {
        gapStatus = 'EVIDENCE_NEEDED';
        gapLevel = p.requiredProficiency;
        evidenceNeededCount++;
      } else if (evidenceStatus === 'CONFLICTING' || evidenceStatus === 'OUTDATED') {
        gapStatus = 'REASSESSMENT_RECOMMENDED';
        gapLevel = Math.max(0, p.requiredProficiency - demonstratedProficiency);
        preliminaryGapsCount++;
      } else if (demonstratedProficiency >= p.requiredProficiency) {
        gapStatus = 'BENCHMARK_MET';
        gapLevel = 0;
        benchmarkMetCount++;
      } else if (evidenceStatus === 'VERIFIED') {
        gapStatus = 'VERIFIED_GAP';
        gapLevel = p.requiredProficiency - demonstratedProficiency;
        verifiedGapsCount++;
      } else {
        gapStatus = 'PRELIMINARY_GAP';
        gapLevel = p.requiredProficiency - demonstratedProficiency;
        preliminaryGapsCount++;
      }

      let recommendedAction = 'Proficiency goal met. Reinforce through capstones.';
      if (gapStatus === 'EVIDENCE_NEEDED') {
        recommendedAction = p.hasUnmetPrerequisites
          ? `Complete prerequisites (${p.unmetPrerequisites.join(', ')}) then complete diagnostic assessment.`
          : `Take the diagnostic skill assessment or submit repository evidence for ${p.skillName}.`;
      } else if (gapStatus === 'REASSESSMENT_RECOMMENDED') {
        recommendedAction = `Retake verified diagnostic assessment to resolve conflicting or outdated evidence.`;
      } else if (gapLevel >= 2) {
        recommendedAction = p.hasUnmetPrerequisites
          ? `Priority blocker: Resolve prerequisites (${p.unmetPrerequisites.join(', ')}) before advancing.`
          : `Complete foundational interactive challenge and submit targeted project evidence.`;
      } else if (gapLevel === 1) {
        recommendedAction = `Practice intermediate problem-solving challenges to reach Level ${p.requiredProficiency}.`;
      }

      gapItems.push({
        skillId: p.skillId,
        skillName: p.skillName,
        category: p.category,
        requiredProficiency: p.requiredProficiency,
        demonstratedProficiency: demonstratedProficiency || 0,
        gapLevel,
        gapStatus,
        confidence,
        evidenceStatus,
        priority: p.priorityLevel,
        priorityScore: p.priorityScore,
        priorityRationale: p.rationale,
        whyItMatters: p.whyItMatters,
        isMandatory: p.isMandatory,
        weight: p.weight,
        prerequisites: p.prerequisites,
        hasUnmetPrerequisites: p.hasUnmetPrerequisites,
        unmetPrerequisites: p.unmetPrerequisites,
        recommendedAction
      });
    }

    return {
      targetRole: benchmark.roleTitle,
      domainTitle: benchmark.domainTitle,
      benchmarkVersion: benchmark.benchmarkVersion,
      totalCompetencies: gapItems.length,
      metrics: {
        verifiedGaps: verifiedGapsCount,
        preliminaryGaps: preliminaryGapsCount,
        evidenceNeeded: evidenceNeededCount,
        benchmarkMet: benchmarkMetCount,
        highPriorityGaps: gapItems.filter(g => g.priority === 'High').length,
        mediumPriorityGaps: gapItems.filter(g => g.priority === 'Medium').length,
      },
      gapItems
    };
  }

  /**
   * Calculates transparent, weighted career readiness score.
   * Formula: Readiness = 100 * sum(weight * min(requiredLevel, demonstratedLevel)) / sum(weight * requiredLevel)
   * Separates readiness score, evidence coverage, mandatory skill status, and uncertainty.
   */
  static calculateCareerReadiness(candidateId, targetRole) {
    const benchmark = RoleBenchmarkService.getRoleBenchmark(targetRole);
    const gapsAnalysis = this.calculateSkillGaps(candidateId, targetRole);

    let totalPossibleWeightedPoints = 0;
    let earnedWeightedPoints = 0;
    let supportedSkillsCount = 0;
    let mandatoryTotal = 0;
    let mandatoryMet = 0;
    let highConfidenceCount = 0;

    for (const item of gapsAnalysis.gapItems) {
      const weight = item.weight || 1.0;
      const required = item.requiredProficiency;
      const demonstrated = item.evidenceStatus !== 'INSUFFICIENT_EVIDENCE'
        ? item.demonstratedProficiency
        : 0;

      totalPossibleWeightedPoints += weight * required;
      earnedWeightedPoints += weight * Math.min(required, demonstrated);

      if (item.evidenceStatus !== 'INSUFFICIENT_EVIDENCE' && item.demonstratedProficiency > 0) {
        supportedSkillsCount++;
      }

      if (item.confidence === 'HIGH') {
        highConfidenceCount++;
      }

      if (item.isMandatory) {
        mandatoryTotal++;
        if (item.demonstratedProficiency >= required) {
          mandatoryMet++;
        }
      }
    }

    const readinessScore = totalPossibleWeightedPoints > 0
      ? Math.round((earnedWeightedPoints / totalPossibleWeightedPoints) * 100)
      : 0;

    const evidenceCoverage = gapsAnalysis.gapItems.length > 0
      ? Math.round((supportedSkillsCount / gapsAnalysis.gapItems.length) * 100)
      : 0;

    let uncertainty = 'HIGH';
    if (evidenceCoverage >= 80 && highConfidenceCount >= Math.ceil(gapsAnalysis.gapItems.length / 2)) {
      uncertainty = 'LOW';
    } else if (evidenceCoverage >= 50) {
      uncertainty = 'MEDIUM';
    }

    return {
      targetRole: benchmark.roleTitle,
      benchmarkVersion: benchmark.benchmarkVersion,
      readinessScore,
      evidenceCoverage,
      mandatorySkillsStatus: {
        allMandatoryMet: mandatoryMet === mandatoryTotal && mandatoryTotal > 0,
        mandatoryMetCount: mandatoryMet,
        mandatoryTotalCount: mandatoryTotal
      },
      evidenceSufficiency: {
        supportedSkillsCount,
        totalRequiredSkills: gapsAnalysis.gapItems.length,
        uncertainty
      },
      scoringPolicyNotice: 'Calculated using deterministic role-weighted formula. Unassessed skills are included in denominator. This score reflects demonstrated technical evidence alignment and is not a probability or guarantee of employment.'
    };
  }

  /**
   * Retrieves complete provenance audit log for a specific competency of a candidate.
   */
  static getProvenance(candidateId, skillIdOrName) {
    const db = getDb();

    return db.prepare(`
      SELECT sel.*, s.name as skill_name, s.category
      FROM skill_evidence_ledger sel
      JOIN skills s ON sel.skill_id = s.id
      WHERE sel.candidate_id = ? AND (sel.skill_id = ? OR LOWER(s.name) = LOWER(?))
      ORDER BY sel.created_at DESC
    `).all(candidateId, skillIdOrName, skillIdOrName).map(item => ({
      ...item,
      metadata: JSON.parse(item.metadata || '{}')
    }));
  }

  /**
   * Generates dependency-aware personalized learning recommendations.
   * Prioritizes foundational blockers without unmet prerequisites.
   */
  static generateLearningRecommendations(candidateId, targetRole) {
    const benchmark = RoleBenchmarkService.getRoleBenchmark(targetRole);
    const gapsAnalysis = this.calculateSkillGaps(candidateId, targetRole);
    const canonicalProfile = this.getCanonicalProfile(candidateId);

    const candidateSkillMap = new Map();
    for (const p of canonicalProfile) {
      candidateSkillMap.set(p.skillName.toLowerCase(), {
        proficiency: p.demonstratedProficiency,
        status: p.evidenceStatus
      });
      candidateSkillMap.set(p.skillId.toLowerCase(), {
        proficiency: p.demonstratedProficiency,
        status: p.evidenceStatus
      });
    }

    const recommendations = [];

    for (const item of gapsAnalysis.gapItems) {
      if (item.gapLevel > 0 || item.gapStatus === 'EVIDENCE_NEEDED') {
        const prereqCheck = DependencyGraphService.checkPrerequisites(
          item.skillName,
          benchmark.requiredSkills,
          candidateSkillMap
        );

        const blockerImpact = DependencyGraphService.calculateBlockerImpact(
          item.skillName,
          benchmark.requiredSkills
        );

        let recommendedActivity = `Complete hands-on practical challenge in ${item.skillName}`;
        if (item.evidenceStatus === 'EVIDENCE_NEEDED') {
          recommendedActivity = `Take initial diagnostic assessment or submit GitHub project demonstrating ${item.skillName}`;
        } else if (item.demonstratedProficiency < 3) {
          recommendedActivity = `Complete foundational exercises and guided project for ${item.skillName}`;
        }

        const verificationCriteria = item.isMandatory
          ? `Achieve verified Level ${item.requiredProficiency} via practical coding challenge or proctored assessment (mandatory for ${benchmark.roleTitle})`
          : `Demonstrate Level ${item.requiredProficiency} through verified project implementation or assessment`;

        recommendations.push({
          skillId: item.skillId,
          skillName: item.skillName,
          category: item.category,
          requiredProficiency: item.requiredProficiency,
          demonstratedProficiency: item.demonstratedProficiency,
          gapLevel: item.gapLevel,
          gapStatus: item.gapStatus,
          isMandatory: item.isMandatory,
          priority: item.priority,
          reason: item.priorityRationale,
          prerequisites: item.prerequisites,
          prerequisitesUnmet: prereqCheck.unmetPrerequisites,
          blockerScore: blockerImpact,
          recommendedActivity,
          verificationCriteria
        });
      }
    }

    recommendations.sort((a, b) => {
      if (a.prerequisitesUnmet.length === 0 && b.prerequisitesUnmet.length > 0) return -1;
      if (a.prerequisitesUnmet.length > 0 && b.prerequisitesUnmet.length === 0) return 1;
      if (b.blockerScore !== a.blockerScore) return b.blockerScore - a.blockerScore;
      if (a.isMandatory && !b.isMandatory) return -1;
      if (!a.isMandatory && b.isMandatory) return 1;
      return b.gapLevel - a.gapLevel;
    });

    return recommendations;
  }
}

