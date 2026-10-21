import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { MIN_COLLEGE_COHORT_SIZE } from './collegeAnalyticsService.js';

function audit(orgId, actorId, action, resourceType, resourceId, payload) {
  try {
    repository.execute(
      `INSERT INTO audit_events (id, org_id, actor_id, action, resource_type, resource_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [`ae-${uuidv4().slice(0, 8)}`, orgId || null, actorId || null, action, resourceType, resourceId || null, JSON.stringify(payload || {}), new Date().toISOString()]
    );
  } catch {}
}

function rowToDrive(r, eligibleCount = 0, appliedCount = 0) {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    packageLpa: r.package_lpa,
    status: r.status,
    eligibility: {
      branches: JSON.parse(r.eligible_branches || '[]'),
      minReadiness: r.min_readiness,
      requiredSkills: JSON.parse(r.required_skills || '[]'),
      verifiedPassportRequired: Boolean(r.verified_passport_req),
    },
    applications: appliedCount,
    eligibleStudents: eligibleCount,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function checkEligibility(student, drive, readiness, verifiedSkillNames) {
  const elig = drive.eligibility;
  if (elig.branches?.length > 0 && student.branch && !elig.branches.includes(student.branch)) {
    return { eligible: false, reason: `Branch ${student.branch} not eligible` };
  }
  if ((readiness ?? 0) < (elig.minReadiness ?? 0)) {
    return { eligible: false, reason: `Readiness ${readiness} below ${elig.minReadiness}` };
  }
  const missing = (elig.requiredSkills || []).filter((s) => !verifiedSkillNames.includes(s));
  if (missing.length > 0) {
    return { eligible: false, reason: `Missing verified skills: ${missing.join(', ')}` };
  }
  if (elig.verifiedPassportRequired && verifiedSkillNames.length === 0) {
    return { eligible: false, reason: 'Verified passport required' };
  }
  return { eligible: true, reason: null };
}

export const collegeDrivesService = {
  listDrives(institutionName, status = null) {
    let sql = 'SELECT * FROM placement_drives WHERE institution_name = ?';
    const params = [institutionName];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC;';
    const rows = repository.query(sql, params);
    return rows.map((r) => {
      let applied = 0;
      try {
        const c = repository.queryOne('SELECT COUNT(*) as n FROM drive_applications WHERE drive_id = ?;', [r.id]);
        applied = c?.n || 0;
      } catch {}
      return rowToDrive(r, 0, applied);
    });
  },

  createDrive(institutionId, institutionName, actorId, input) {
    const now = new Date().toISOString();
    const id = `drv-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO placement_drives (id, institution_id, institution_name, company, role, package_lpa, status, eligible_branches, min_readiness, required_skills, verified_passport_req, start_date, end_date, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, institutionId || null, institutionName, input.company, input.role, input.packageLpa ?? 0,
       input.status || 'upcoming', JSON.stringify(input.branches || []), input.minReadiness ?? 60,
       JSON.stringify(input.requiredSkills || []), input.verifiedPassportRequired ? 1 : 0,
       input.startDate || null, input.endDate || null, actorId || null, now, now]
    );
    audit(null, actorId, 'college.drive.create', 'placement_drives', id, { company: input.company, role: input.role });
    return rowToDrive(repository.queryOne('SELECT * FROM placement_drives WHERE id = ?;', [id]));
  },

  updateDrive(driveId, actorId, patch) {
    const row = repository.queryOne('SELECT * FROM placement_drives WHERE id = ?;', [driveId]);
    if (!row) throw Object.assign(new Error('Drive not found'), { status: 404 });
    const now = new Date().toISOString();
    const sets = [];
    const vals = [];
    const map = {
      company: 'company', role: 'role', packageLpa: 'package_lpa', status: 'status',
      minReadiness: 'min_readiness', startDate: 'start_date', endDate: 'end_date',
    };
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] !== undefined) {
        sets.push(`${col} = ?`);
        vals.push(patch[k]);
      }
    }
    if (patch.branches !== undefined) {
      sets.push('eligible_branches = ?');
      vals.push(JSON.stringify(patch.branches));
    }
    if (patch.requiredSkills !== undefined) {
      sets.push('required_skills = ?');
      vals.push(JSON.stringify(patch.requiredSkills));
    }
    if (patch.verifiedPassportRequired !== undefined) {
      sets.push('verified_passport_req = ?');
      vals.push(patch.verifiedPassportRequired ? 1 : 0);
    }
    if (sets.length === 0) return rowToDrive(row);
    sets.push('updated_at = ?');
    vals.push(now, driveId);
    repository.execute(`UPDATE placement_drives SET ${sets.join(', ')} WHERE id = ?;`, vals);
    audit(null, actorId, 'college.drive.update', 'placement_drives', driveId, patch);
    return rowToDrive(repository.queryOne('SELECT * FROM placement_drives WHERE id = ?;', [driveId]));
  },

  eligibleStudents(driveId) {
    const drive = repository.queryOne('SELECT * FROM placement_drives WHERE id = ?;', [driveId]);
    if (!drive) throw Object.assign(new Error('Drive not found'), { status: 404 });
    const d = rowToDrive(drive);

    const students = repository.query(
      `SELECT u.id, u.full_name, u.email, cp.branch, cp.degree, cp.target_role
       FROM users u LEFT JOIN candidate_profiles cp ON u.id = cp.id
       WHERE (u.institution_id = ? OR u.institution = ?) AND u.role = 'candidate';`,
      [drive.institution_id || '', drive.institution_name]
    );
    if (students.length < MIN_COLLEGE_COHORT_SIZE) {
      return { suppressed: true, notice: 'Insufficient cohort size', students: [] };
    }

    const ids = students.map((s) => s.id);
    const ph = ids.map(() => '?').join(',');
    const scoreRows = repository.query(
      `SELECT candidate_id as id, AVG(score) as avg_score FROM assessment_results WHERE candidate_id IN (${ph}) GROUP BY candidate_id;`, ids);
    const scoreMap = new Map(scoreRows.map((r) => [r.id, Math.round(r.avg_score)]));
    const skillRows = repository.query(
      `SELECT cs.candidate_id as id, s.name as name, cs.proficiency as level, cs.verification_status as status
       FROM candidate_skills cs JOIN skills s ON s.id = cs.skill_id WHERE cs.candidate_id IN (${ph});`, ids);
    const profMap = new Map();
    const verifiedMap = new Map();
    for (const r of skillRows) {
      if (!profMap.has(r.id)) { profMap.set(r.id, []); verifiedMap.set(r.id, []); }
      profMap.get(r.id).push(r.level);
      if (r.status === 'verified') verifiedMap.get(r.id).push(r.name);
    }

    const eligible = [];
    for (const s of students) {
      const sks = profMap.get(s.id) || [];
      const ownProf = sks.length > 0 ? Math.round((sks.reduce((a, b) => a + b, 0) / sks.length) / 5 * 100) : 70;
      const readiness = Math.min(100, Math.round(ownProf * 0.6 + (scoreMap.get(s.id) ?? 75) * 0.4));
      const check = checkEligibility({ branch: s.branch }, d, readiness, verifiedMap.get(s.id) || []);
      if (check.eligible) {
        eligible.push({ id: s.id, name: s.full_name, email: s.email, branch: s.branch, readinessScore: readiness, targetRole: s.target_role });
      }
    }
    return { suppressed: false, students: eligible };
  },
};
