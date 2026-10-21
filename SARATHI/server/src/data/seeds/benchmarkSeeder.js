import { initDb } from '../../config/db.js';
import { ROLE_BENCHMARKS } from '../../services/roleBenchmarkService.js';
import { v4 as uuidv4 } from 'uuid';

export function seedRoleBenchmarks(db = initDb()) {
  const now = new Date().toISOString();
  const insertRb = db.prepare(`
    INSERT OR IGNORE INTO role_benchmarks (id, role_id, title, domain_id, description, benchmark_version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `);
  const insertSkill = db.prepare(`
    INSERT OR IGNORE INTO skills (id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, '1-5', '[]', '[]', 1, ?, ?);
  `);
  const insertRbs = db.prepare(`
    INSERT OR IGNORE INTO role_benchmark_skills (id, benchmark_id, skill_id, target_level, weight, is_mandatory, prerequisites_json, why_it_matters)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const [title, bm] of Object.entries(ROLE_BENCHMARKS)) {
    const roleId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let rbRow = db.prepare('SELECT id FROM role_benchmarks WHERE role_id = ?;').get(roleId);
    let rbId = rbRow?.id || `rb-${uuidv4()}`;

    let domainId = bm.domainId || 'dom-frontend';
    const dCheck = db.prepare('SELECT id FROM domains WHERE id = ?;').get(domainId);
    if (!dCheck) domainId = 'dom-frontend';

    if (!rbRow) {
      insertRb.run(rbId, roleId, bm.roleTitle || title, domainId, bm.description || '', bm.benchmarkVersion || '2026.1', now, now);
    }

    if (Array.isArray(bm.requiredSkills)) {
      for (const s of bm.requiredSkills) {
        insertSkill.run(s.skillId, domainId, s.skillName, s.whyItMatters || '', s.category || 'General', now, now);
        insertRbs.run(
          `rbs-${uuidv4()}`,
          rbId,
          s.skillId,
          s.requiredProficiency || 3,
          s.weight || 1.0,
          s.isMandatory ? 1 : 0,
          JSON.stringify(s.prerequisites || []),
          s.whyItMatters || ''
        );
      }
    }
  }

  const count = db.prepare('SELECT COUNT(*) as count FROM role_benchmarks;').get();
  return count?.count || 0;
}

if (process.argv[1]?.endsWith('benchmarkSeeder.js')) {
  const seeded = seedRoleBenchmarks();
  console.log(`Successfully seeded ${seeded} role benchmarks.`);
}
