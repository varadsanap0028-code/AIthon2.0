import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

function audit(actorId, action, resourceId, payload) {
  try {
    repository.execute(
      `INSERT INTO audit_events (id, org_id, actor_id, action, resource_type, resource_id, payload, created_at)
       VALUES (?, NULL, ?, ?, 'curriculum_recommendations', ?, ?, ?);`,
      [`ae-${uuidv4().slice(0, 8)}`, actorId || null, action, resourceId || null, JSON.stringify(payload || {}), new Date().toISOString()]
    );
  } catch {}
}

const TYPE_LABELS = {
  lab_update: 'Lab Update',
  capstone_rubric: 'Capstone Rubric',
  bootcamp: 'Bootcamp',
};

export const collegeCurriculumService = {
  listRecommendations(institutionName) {
    const rows = repository.query(
      'SELECT * FROM curriculum_recommendations WHERE institution_name = ? ORDER BY created_at DESC;', [institutionName]);
    return rows.map((r) => ({
      id: r.id, skill: r.skill, type: r.rec_type, typeLabel: TYPE_LABELS[r.rec_type] || r.rec_type,
      title: r.title, description: r.description, branches: JSON.parse(r.branches || '[]'),
      status: r.status, createdAt: r.created_at,
    }));
  },

  autoGenerate(institutionName, skillGapMatrix) {
    const existing = new Set(
      repository.query('SELECT skill, rec_type FROM curriculum_recommendations WHERE institution_name = ?;', [institutionName])
        .map((r) => `${r.skill}|${r.rec_type}`)
    );
    const now = new Date().toISOString();
    const created = [];
    const top = [...(skillGapMatrix || [])].sort((a, b) => b.gapPercentage - a.gapPercentage).slice(0, 6);
    for (const g of top) {
      if (g.severity !== 'high') continue;
      const plans = [
        { recType: 'lab_update', title: `Lab module: ${g.skill}`, description: `Add a 2-week practical ${g.skill} module to the Semester 6 lab.` },
        { recType: 'capstone_rubric', title: `Capstone rubric: ${g.skill}`, description: `Require ${g.skill} evidence in final-year capstone evaluation rubrics.` },
        { recType: 'bootcamp', title: `Weekend bootcamp: ${g.skill}`, description: `Run an intensive ${g.skill} bootcamp before placement drives.` },
      ];
      for (const p of plans.slice(0, 1)) {
        const key = `${g.skill}|${p.recType}`;
        if (existing.has(key)) continue;
        const id = `cur-${uuidv4().slice(0, 8)}`;
        repository.execute(
          `INSERT INTO curriculum_recommendations (id, institution_id, institution_name, skill, rec_type, title, description, branches, status, created_at, updated_at)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'planned', ?, ?);`,
          [id, institutionName, g.skill, p.recType, p.title, p.description, JSON.stringify([g.branch]), now, now]
        );
        created.push(id);
        existing.add(key);
      }
    }
    return created;
  },

  createRecommendation(institutionId, institutionName, actorId, input) {
    const now = new Date().toISOString();
    const id = `cur-${uuidv4().slice(0, 8)}`;
    repository.execute(
      `INSERT INTO curriculum_recommendations (id, institution_id, institution_name, skill, rec_type, title, description, branches, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?, ?);`,
      [id, institutionId || null, institutionName, input.skill, input.recType, input.title, input.description, JSON.stringify(input.branches || []), actorId || null, now, now]
    );
    audit(actorId, 'college.curriculum.create', id, { skill: input.skill });
    return { id, status: 'planned' };
  },

  updateStatus(id, actorId, status) {
    const row = repository.queryOne('SELECT * FROM curriculum_recommendations WHERE id = ?;', [id]);
    if (!row) throw Object.assign(new Error('Recommendation not found'), { status: 404 });
    repository.execute('UPDATE curriculum_recommendations SET status = ?, updated_at = ? WHERE id = ?;', [status, new Date().toISOString(), id]);
    audit(actorId, 'college.curriculum.status', id, { status });
    return { id, status };
  },
};
