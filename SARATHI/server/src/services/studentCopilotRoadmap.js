// studentCopilotRoadmap.js — roadmap progress and skill gap functions
import { repository } from '../data/repository.js';

function roadProgress(userId) {
  const rows = repository.query('SELECT track_key, completed_task_ids, task_progress FROM student_roadmaps WHERE user_id = ?;', [userId]);
  const map = new Map();
  for (const r of rows) {
    let c = [];
    let p = {};
    try { c = JSON.parse(r.completed_task_ids || '[]'); } catch {}
    try { p = JSON.parse(r.task_progress || '{}'); } catch {}
    map.set(r.track_key, {
      done: Math.max(Object.values(p).filter(v => v?.status === 'completed').length || c.length, 0),
      total: Math.max(Object.keys(p).length, c.length, 0),
    });
  }
  return map;
}

function getRoadmapProgress(userId) {
  const progressMap = roadProgress(userId);
  const data = {};
  for (const [key, val] of progressMap) {
    data[key] = { done: val.done, total: val.total, pct: val.total > 0 ? Math.round((val.done / val.total) * 100) : 0 };
  }
  return data;
}

function studentSkillGap(userId, myTrack) {
  const gaps = [];
  try {
    const rows = repository.query(
      `SELECT s.name as skill_name, s.id as skill_id,
              cs.proficiency, cs.verification_status,
              rb.target_level
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       LEFT JOIN role_benchmark_skills rbs ON rbs.skill_id = s.id
       LEFT JOIN role_benchmarks rb ON rb.id = rbs.benchmark_id
       WHERE cs.candidate_id = ? AND s.active = 1
       ORDER BY rb.target_level DESC NULLS LAST, cs.proficiency ASC`,
      [userId]
    );

    for (const r of rows) {
      const target = (r.target_level && r.target_level > 0) ? r.target_level : 3;
      const current = r.proficiency || 1;
      const diff = Math.abs(target - current);
      if (diff >= 2) {
        const level = diff >= 3 ? 'Advanced' : 'Intermediate';
        gaps.push({
          skill: r.skill_name,
          current,
          target,
          difficulty: level,
          recommendation: diff >= 3
            ? `Reach L${target} through focused study + project + assessment verification.`
            : `Bridge to L${target} with targeted practice on core concepts.`,
        });
      }
    }
  } catch {}
  return {
    gaps,
    summary: `You have ${gaps.length} skill gap(s) against the ${myTrack?.canonicalRoleTitle || 'Full-Stack Developer'} benchmark.`,
  };
}

function skillsVerifiedCount(userId) {
  let count = 0;
  try {
    const rows = repository.query(
      `SELECT COUNT(*) as c FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ? AND cs.verification_status = 'verified'`,
      [userId]
    );
    count = rows[0]?.c || 0;
  } catch {}
  return count;
}

function skillsTotal(userId) {
  let count = 0;
  try {
    const rows = repository.query(
      `SELECT COUNT(*) as c FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ?`,
      [userId]
    );
    count = rows[0]?.c || 0;
  } catch {}
  return count;
}

function verifiedSkillsList(userId) {
  let list = '';
  try {
    const rows = repository.query(
      `SELECT s.name as skill_name FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       WHERE cs.candidate_id = ? AND cs.verification_status = 'verified'
       ORDER BY cs.proficiency DESC`,
      [userId]
    );
    list = rows.map(r => `• **${r.skill_name}**`).join('\n');
  } catch {}
  return list || 'No verified skills yet.';
}

export { roadProgress, getRoadmapProgress, studentSkillGap, skillsVerifiedCount, skillsTotal, verifiedSkillsList };
