import { repository } from '../data/repository.js';

function audit(actorId, action, resourceId, payload) {
  try {
    repository.execute(
      `INSERT INTO audit_events (id, org_id, actor_id, action, resource_type, resource_id, payload, created_at)
       VALUES ('ae-' || substr(hex(randomblob(4)), 1, 8), NULL, ?, ?, 'college_settings', ?, ?, ?);`,
      [actorId || null, action, resourceId || null, JSON.stringify(payload || {}), new Date().toISOString()]
    );
  } catch {}
}

export const collegeSettingsService = {
  getSettings(institutionId, institutionName) {
    let row = null;
    if (institutionId) {
      row = repository.queryOne('SELECT * FROM college_settings WHERE institution_id = ?;', [institutionId]);
    }
    if (!row) {
      row = repository.queryOne('SELECT * FROM college_settings WHERE institution_name = ?;', [institutionName]);
    }
    if (!row) {
      return {
        institutionId: institutionId || null,
        institutionName,
        benchmarkThreshold: 60,
        branches: ['CSE', 'IT', 'AI/DS', 'ECE'],
        batchYear: 2026,
        updatedAt: null,
      };
    }
    return {
      institutionId: row.institution_id,
      institutionName: row.institution_name,
      benchmarkThreshold: row.benchmark_threshold,
      branches: JSON.parse(row.branches || '[]'),
      batchYear: row.batch_year,
      updatedAt: row.updated_at,
    };
  },

  updateSettings(institutionId, institutionName, actorId, input) {
    const now = new Date().toISOString();
    const current = this.getSettings(institutionId, institutionName);
    const key = institutionId || `inst-${institutionName}`;
    repository.execute(
      `INSERT INTO college_settings (institution_id, institution_name, benchmark_threshold, branches, batch_year, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(institution_id) DO UPDATE SET
         institution_name = excluded.institution_name,
         benchmark_threshold = excluded.benchmark_threshold,
         branches = excluded.branches,
         batch_year = excluded.batch_year,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at;`,
      [key, institutionName,
       input.benchmarkThreshold ?? current.benchmarkThreshold,
       JSON.stringify(input.branches ?? current.branches),
       input.batchYear ?? current.batchYear,
       actorId || null, now]
    );
    audit(actorId, 'college.settings.update', key, input);
    return this.getSettings(institutionId || key, institutionName);
  },

  listCollegeUsers(institutionId, institutionName) {
    const rows = repository.query(
      `SELECT id, email, full_name, role, institution, institution_id, status, created_at
       FROM users WHERE (institution_id = ? OR institution = ?) AND role = 'college';`,
      [institutionId || '', institutionName]
    );
    return rows.map((r) => ({
      id: r.id, email: r.email, fullName: r.full_name, role: r.role,
      institution: r.institution, status: r.status || 'active', createdAt: r.created_at,
    }));
  },
};
