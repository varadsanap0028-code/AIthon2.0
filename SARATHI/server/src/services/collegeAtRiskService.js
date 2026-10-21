import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { MIN_COLLEGE_COHORT_SIZE } from './collegeAnalyticsService.js';

function audit(actorId, action, resourceId, payload) {
  try {
    repository.execute(
      `INSERT INTO audit_events (id, org_id, actor_id, action, resource_type, resource_id, payload, created_at)
       VALUES (?, NULL, ?, ?, 'remediation_assignments', ?, ?, ?);`,
      [`ae-${uuidv4().slice(0, 8)}`, actorId || null, action, resourceId || null, JSON.stringify(payload || {}), new Date().toISOString()]
    );
  } catch {}
}

export const collegeAtRiskService = {
  getAtRiskStudents(institutionId, institutionName, opts = {}) {
    const benchmark = Number.isInteger(opts.benchmark) ? opts.benchmark : 60;
    const hodBranch = opts.hodBranch || null;

    let branchSql = '';
    const params = [institutionId || '', institutionName];
    if (hodBranch) {
      branchSql = 'AND (cp.branch = ? OR cp.degree LIKE \'%\' || ? || \'%\')';
      params.push(hodBranch);
    }

    const students = repository.query(
      `SELECT u.id, u.full_name, u.email, cp.branch, cp.degree, cp.target_role
       FROM users u LEFT JOIN candidate_profiles cp ON u.id = cp.id
       WHERE (u.institution_id = ? OR u.institution = ?) AND u.role = 'candidate' ${branchSql};`,
      params
    );

    if (students.length < MIN_COLLEGE_COHORT_SIZE) {
      return { benchmark, suppressed: true, notice: 'Insufficient cohort size', students: [], totalCount: 0 };
    }

    const ids = students.map((s) => s.id);
    const ph = ids.map(() => '?').join(',');
    let scoreRows = [];
    let skillRows = [];
    try {
      scoreRows = repository.query(
        `SELECT candidate_id as id, AVG(score) as avg_score FROM assessment_results WHERE candidate_id IN (${ph}) GROUP BY candidate_id;`, ids);
      skillRows = repository.query(
        `SELECT cs.candidate_id as id, s.name as name, cs.proficiency as level
         FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id WHERE cs.candidate_id IN (${ph});`, ids);
    } catch {}

    const scoreMap = new Map(scoreRows.map((r) => [r.id, Math.round(r.avg_score)]));
    const profMap = new Map();
    for (const r of skillRows) {
      if (!profMap.has(r.id)) profMap.set(r.id, []);
      profMap.get(r.id).push({ name: r.name, level: r.level });
    }

    let remap = new Map();
    try {
      const rems = repository.query(`SELECT candidate_id, status FROM remediation_assignments WHERE candidate_id IN (${ph});`, ids);
      remap = new Map(rems.map((r) => [r.candidate_id, r.status]));
    } catch {}

    const atRisk = [];
    for (const s of students) {
      const sks = profMap.get(s.id) || [];
      const ownProf = sks.length > 0 ? Math.round((sks.reduce((a, b) => a + b.level, 0) / sks.length) / 5 * 100) : 70;
      const readiness = Math.min(100, Math.round(ownProf * 0.6 + (scoreMap.get(s.id) ?? 75) * 0.4));
      if (readiness < benchmark) {
        const missing = sks.filter((k) => k.level < 3).map((k) => k.name);
        atRisk.push({
          id: s.id, name: s.full_name, email: s.email, branch: s.branch || 'CSE',
          readinessScore: readiness, benchmark,
          missingCompetencies: missing.length > 0 ? missing : ['Data Structures'],
          remediationStatus: remap.get(s.id) || 'pending',
        });
      }
    }
    atRisk.sort((a, b) => a.readinessScore - b.readinessScore);
    return { benchmark, suppressed: false, students: atRisk, totalCount: atRisk.length };
  },

  assignRemediation(institutionId, actorId, input) {
    const now = new Date().toISOString();
    const existing = repository.queryOne('SELECT id FROM remediation_assignments WHERE candidate_id = ?;', [input.candidateId]);
    if (existing) {
      repository.execute(
        `UPDATE remediation_assignments SET missing_skills = ?, status = 'assigned', benchmark = ?, assigned_by = ?, updated_at = ? WHERE id = ?;`,
        [JSON.stringify(input.missingSkills || []), input.benchmark ?? 60, actorId || null, now, existing.id]
      );
      audit(actorId, 'college.remediation.assign', existing.id, { candidateId: input.candidateId });
      return { id: existing.id, status: 'assigned' };
    }
    const id = `rem-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO remediation_assignments (id, institution_id, candidate_id, assigned_by, missing_skills, status, benchmark, assigned_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?, ?);`,
      [id, institutionId || null, input.candidateId, actorId || null, JSON.stringify(input.missingSkills || []), input.benchmark ?? 60, now, now]
    );
    audit(actorId, 'college.remediation.assign', id, { candidateId: input.candidateId });
    return { id, status: 'assigned' };
  },

  updateRemediation(id, actorId, status) {
    const row = repository.queryOne('SELECT * FROM remediation_assignments WHERE id = ?;', [id]);
    if (!row) throw Object.assign(new Error('Remediation not found'), { status: 404 });
    repository.execute('UPDATE remediation_assignments SET status = ?, updated_at = ? WHERE id = ?;', [status, new Date().toISOString(), id]);
    audit(actorId, 'college.remediation.status', id, { status });
    return { id, status };
  },
};
