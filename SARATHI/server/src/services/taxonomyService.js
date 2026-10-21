import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

export const taxonomyService = {
  getDomains() {
    return repository.query('SELECT * FROM domains WHERE active = 1 ORDER BY title ASC;');
  },

  getDomainById(domainId) {
    return repository.queryOne('SELECT * FROM domains WHERE id = ?;', [domainId]);
  },

  getSkillsByDomain(domainId) {
    const rows = repository.query(
      'SELECT * FROM skills WHERE domain_id = ? AND active = 1 ORDER BY name ASC;',
      [domainId]
    );
    return rows.map(r => ({
      ...r,
      accepted_evidence_types: JSON.parse(r.accepted_evidence_types || '[]'),
      assessment_types: JSON.parse(r.assessment_types || '[]'),
    }));
  },

  getAllSkills() {
    const rows = repository.query(
      `SELECT s.*, d.title as domain_title, d.badge_color 
       FROM skills s 
       JOIN domains d ON d.id = s.domain_id 
       WHERE s.active = 1 AND d.active = 1 
       ORDER BY d.title ASC, s.name ASC;`
    );
    return rows.map(r => ({
      ...r,
      accepted_evidence_types: JSON.parse(r.accepted_evidence_types || '[]'),
      assessment_types: JSON.parse(r.assessment_types || '[]'),
    }));
  },

  searchSkills(query) {
    const q = `%${(query || '').trim()}%`;
    const rows = repository.query(
      `SELECT s.*, d.title as domain_title 
       FROM skills s 
       JOIN domains d ON d.id = s.domain_id 
       WHERE (s.name LIKE ? OR s.description LIKE ? OR s.category LIKE ?) AND s.active = 1
       ORDER BY s.name ASC LIMIT 50;`,
      [q, q, q]
    );
    return rows.map(r => ({
      ...r,
      accepted_evidence_types: JSON.parse(r.accepted_evidence_types || '[]'),
      assessment_types: JSON.parse(r.assessment_types || '[]'),
    }));
  },

  addSkill({ domainId, name, description, category, proficiencyScale = '1-5', acceptedEvidenceTypes = [], assessmentTypes = [] }) {
    const id = `skill-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    repository.execute(
      `INSERT INTO skills (id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        id,
        domainId,
        name.trim(),
        description || '',
        category || 'General',
        proficiencyScale,
        JSON.stringify(acceptedEvidenceTypes),
        JSON.stringify(assessmentTypes),
        now,
        now,
      ]
    );
    return this.getSkillById(id);
  },

  getSkillById(skillId) {
    const r = repository.queryOne(
      `SELECT s.*, d.title as domain_title 
       FROM skills s 
       JOIN domains d ON d.id = s.domain_id 
       WHERE s.id = ?;`,
      [skillId]
    );
    if (!r) return null;
    return {
      ...r,
      accepted_evidence_types: JSON.parse(r.accepted_evidence_types || '[]'),
      assessment_types: JSON.parse(r.assessment_types || '[]'),
    };
  }
};
