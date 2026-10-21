import { initDb } from '../../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { logAdminAction } from './adminAuditService.js';
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';

/**
 * Normalizes a string for duplicate detection.
 */
function normalizeSkillName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshteinDistance(s1, s2) {
  const a = String(s1 || '').toLowerCase();
  const b = String(s2 || '').toLowerCase();
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Verifies if an IP address is in private, loopback, or link-local ranges.
 */
export function isPrivateOrReservedIp(ip) {
  if (!ip) return true;
  const cleanIp = ip.replace(/^::ffff:/, '');

  if (cleanIp === 'localhost' || cleanIp === '::1' || cleanIp === '0.0.0.0') return true;

  // IPv4 checks
  const ipv4Match = cleanIp.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const oct1 = parseInt(ipv4Match[1], 10);
    const oct2 = parseInt(ipv4Match[2], 10);

    if (oct1 === 127) return true; // 127.0.0.0/8 loopback
    if (oct1 === 10) return true; // 10.0.0.0/8 private
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true; // 172.16.0.0/12 private
    if (oct1 === 192 && oct2 === 168) return true; // 192.168.0.0/16 private
    if (oct1 === 169 && oct2 === 254) return true; // 169.254.0.0/16 link-local
    if (oct1 === 0) return true; // 0.0.0.0/8
    if (oct1 >= 224) return true; // multicast / reserved
  }

  // IPv6 checks
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd') || cleanIp.startsWith('fe80')) return true;

  return false;
}

/**
 * Performs SSRF-safe link verification.
 */
export async function verifyUrlSafe(targetUrl, timeoutMs = 5000) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { ok: false, status: 'invalid_url', message: 'Malformed URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, status: 'unsupported_protocol', message: 'Only HTTP and HTTPS are permitted' };
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '169.254.169.254') {
    return { ok: false, status: 'blocked', message: 'SSRF protection: loopback/link-local address forbidden' };
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        return { ok: false, status: 'blocked', message: `SSRF protection: resolved IP ${addr.address} is private or reserved` };
      }
    }
  } catch (dnsErr) {
    return { ok: false, status: 'dns_failed', message: `DNS lookup failed: ${dnsErr.message}` };
  }

  // Perform request with timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res = await fetch(targetUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Sarathi-Admin-LinkChecker/1.0' }
    });

    if (res.status === 405) {
      res = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Sarathi-Admin-LinkChecker/1.0', Range: 'bytes=0-100' }
      });
    }

    clearTimeout(timer);
    return {
      ok: res.status >= 200 && res.status < 400,
      statusCode: res.status,
      status: res.status >= 200 && res.status < 400 ? 'ok' : 'http_error',
      message: `HTTP ${res.status}`
    };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 'fetch_failed', message: err.message };
  }
}

export class AdminContentService {
  // =================== DOMAINS ===================
  static listDomains() {
    const db = initDb();
    const domains = db.prepare(`
      SELECT d.*,
             COUNT(s.id) as skill_count,
             SUM(CASE WHEN s.active = 1 AND COALESCE(s.is_archived, 0) = 0 THEN 1 ELSE 0 END) as active_skill_count
      FROM domains d
      LEFT JOIN skills s ON s.domain_id = d.id
      GROUP BY d.id
      ORDER BY d.title ASC;
    `).all();
    return domains;
  }

  static createDomain({ title, description, iconName, badgeColor }, adminId, req) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Domain title is required');
    }
    const db = initDb();
    const id = `dom-${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM domains WHERE id = ?;').get(id);
    if (existing) {
      throw new Error(`Domain with ID '${id}' already exists`);
    }

    db.prepare(`
      INSERT INTO domains (id, title, description, icon_name, badge_color, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?);
    `).run(id, title.trim(), description || '', iconName || null, badgeColor || null, now, now);

    const created = db.prepare('SELECT * FROM domains WHERE id = ?;').get(id);
    logAdminAction(db, {
      adminId,
      action: 'domain.create',
      entityType: 'domain',
      entityId: id,
      after: created,
      reason: 'Created domain taxonomy',
      req
    });
    return created;
  }

  static updateDomain(id, { title, description, iconName, badgeColor, active }, adminId, req) {
    const db = initDb();
    const existing = db.prepare('SELECT * FROM domains WHERE id = ?;').get(id);
    if (!existing) throw new Error('Domain not found');

    const now = new Date().toISOString();
    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newDesc = description !== undefined ? description : existing.description;
    const newIcon = iconName !== undefined ? iconName : existing.icon_name;
    const newColor = badgeColor !== undefined ? badgeColor : existing.badge_color;
    const newActive = active !== undefined ? (active ? 1 : 0) : existing.active;

    db.prepare(`
      UPDATE domains
      SET title = ?, description = ?, icon_name = ?, badge_color = ?, active = ?, updated_at = ?
      WHERE id = ?;
    `).run(newTitle, newDesc, newIcon, newColor, newActive, now, id);

    const updated = db.prepare('SELECT * FROM domains WHERE id = ?;').get(id);
    logAdminAction(db, {
      adminId,
      action: 'domain.update',
      entityType: 'domain',
      entityId: id,
      before: existing,
      after: updated,
      reason: 'Updated domain properties',
      req
    });
    return updated;
  }

  static archiveDomain(id, adminId, req) {
    const db = initDb();
    const existing = db.prepare('SELECT * FROM domains WHERE id = ?;').get(id);
    if (!existing) throw new Error('Domain not found');

    const now = new Date().toISOString();
    db.prepare('UPDATE domains SET active = 0, updated_at = ? WHERE id = ?;').run(now, id);
    const updated = db.prepare('SELECT * FROM domains WHERE id = ?;').get(id);

    logAdminAction(db, {
      adminId,
      action: 'domain.archive',
      entityType: 'domain',
      entityId: id,
      before: existing,
      after: updated,
      reason: 'Soft-archived domain',
      req
    });
    return updated;
  }

  // =================== SKILLS ===================
  static listSkills({ q, domain, active, archived, page = 1, pageSize = 20 }) {
    const db = initDb();
    const whereClauses = [];
    const params = [];

    if (q && q.trim()) {
      whereClauses.push('(s.name LIKE ? OR s.id LIKE ? OR s.category LIKE ? OR EXISTS (SELECT 1 FROM skill_aliases a WHERE a.skill_id = s.id AND a.alias LIKE ?))');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }
    if (domain) {
      whereClauses.push('s.domain_id = ?');
      params.push(domain);
    }
    if (active !== undefined && active !== '') {
      whereClauses.push('s.active = ?');
      params.push(active === 'true' || active === true || active === 1 ? 1 : 0);
    }
    if (archived !== undefined && archived !== '') {
      whereClauses.push('COALESCE(s.is_archived, 0) = ?');
      params.push(archived === 'true' || archived === true || archived === 1 ? 1 : 0);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countRow = db.prepare(`SELECT COUNT(*) as total FROM skills s ${whereSql};`).get(...params);
    const total = countRow?.total || 0;

    const offset = Math.max(0, (page - 1) * pageSize);
    const items = db.prepare(`
      SELECT s.*, d.title as domain_title
      FROM skills s
      LEFT JOIN domains d ON s.domain_id = d.id
      ${whereSql}
      ORDER BY s.name ASC
      LIMIT ? OFFSET ?;
    `).all(...params, pageSize, offset);

    // Attach aliases and quick usage count to items
    const getAliases = db.prepare('SELECT alias FROM skill_aliases WHERE skill_id = ? ORDER BY alias ASC;');
    for (const item of items) {
      item.aliases = getAliases.all(item.id).map(r => r.alias);
      item.usageCount = this.getSkillUsageCount(item.id, db).totalUsage;
    }

    return {
      items,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static getSkillUsageCount(skillId, db = initDb()) {
    const candidateSkills = db.prepare('SELECT COUNT(*) as count FROM candidate_skills WHERE skill_id = ?;').get(skillId)?.count || 0;
    const jobRequirements = db.prepare('SELECT COUNT(*) as count FROM job_skill_requirements WHERE skill_id = ?;').get(skillId)?.count || 0;
    const questions = db.prepare('SELECT COUNT(*) as count FROM assessment_questions WHERE skill_id = ?;').get(skillId)?.count || 0;
    const evidence = db.prepare('SELECT COUNT(*) as count FROM skill_evidence WHERE skill_id = ?;').get(skillId)?.count || 0;
    const ledger = db.prepare('SELECT COUNT(*) as count FROM skill_evidence_ledger WHERE skill_id = ?;').get(skillId)?.count || 0;
    const challenges = db.prepare('SELECT COUNT(*) as count FROM practical_challenges WHERE skill_id = ?;').get(skillId)?.count || 0;
    const benchmarkSkills = db.prepare('SELECT COUNT(*) as count FROM role_benchmark_skills WHERE skill_id = ?;').get(skillId)?.count || 0;

    const totalUsage = candidateSkills + jobRequirements + questions + evidence + ledger + challenges + benchmarkSkills;

    return {
      totalUsage,
      breakdown: {
        candidateSkills,
        jobRequirements,
        questions,
        evidence,
        ledger,
        challenges,
        benchmarkSkills
      }
    };
  }

  static getSkill(id) {
    const db = initDb();
    const skill = db.prepare(`
      SELECT s.*, d.title as domain_title
      FROM skills s
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE s.id = ?;
    `).get(id);

    if (!skill) return null;

    skill.aliases = db.prepare('SELECT id, alias, created_at FROM skill_aliases WHERE skill_id = ?;').all(id);
    skill.usage = this.getSkillUsageCount(id, db);
    return skill;
  }

  static createSkill({ id, domainId, name, description, category, proficiencyScale = '1-5', acceptedEvidenceTypes, assessmentTypes }, adminId, req) {
    if (!name || typeof name !== 'string' || !name.trim()) throw new Error('Skill name is required');
    if (!domainId) throw new Error('Domain ID is required');

    const db = initDb();
    const skillId = id ? id.trim() : `sk-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM skills WHERE id = ?;').get(skillId);
    if (existing) throw new Error(`Skill with ID '${skillId}' already exists`);

    const domain = db.prepare('SELECT id FROM domains WHERE id = ?;').get(domainId);
    if (!domain) throw new Error(`Domain '${domainId}' does not exist`);

    db.prepare(`
      INSERT INTO skills (
        id, domain_id, name, description, category,
        proficiency_scale, accepted_evidence_types, assessment_types,
        active, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?);
    `).run(
      skillId,
      domainId,
      name.trim(),
      description || '',
      category || 'General',
      proficiencyScale,
      JSON.stringify(acceptedEvidenceTypes || ['assessment', 'project', 'work_experience']),
      JSON.stringify(assessmentTypes || ['mcq', 'coding_challenge']),
      now,
      now
    );

    const created = this.getSkill(skillId);
    logAdminAction(db, {
      adminId,
      action: 'skill.create',
      entityType: 'skill',
      entityId: skillId,
      after: created,
      reason: 'Created new skill taxonomy entry',
      req
    });
    return created;
  }

  static updateSkill(id, { domainId, name, description, category, proficiencyScale, acceptedEvidenceTypes, assessmentTypes, active }, adminId, req) {
    const db = initDb();
    const existing = this.getSkill(id);
    if (!existing) throw new Error('Skill not found');

    const now = new Date().toISOString();
    const newName = name !== undefined ? name.trim() : existing.name;
    const newDomain = domainId !== undefined ? domainId : existing.domain_id;
    const newDesc = description !== undefined ? description : existing.description;
    const newCat = category !== undefined ? category : existing.category;
    const newScale = proficiencyScale !== undefined ? proficiencyScale : existing.proficiency_scale;
    const newEvidence = acceptedEvidenceTypes !== undefined ? JSON.stringify(acceptedEvidenceTypes) : existing.accepted_evidence_types;
    const newAssess = assessmentTypes !== undefined ? JSON.stringify(assessmentTypes) : existing.assessment_types;
    const newActive = active !== undefined ? (active ? 1 : 0) : existing.active;

    db.prepare(`
      UPDATE skills
      SET name = ?, domain_id = ?, description = ?, category = ?,
          proficiency_scale = ?, accepted_evidence_types = ?, assessment_types = ?,
          active = ?, updated_at = ?
      WHERE id = ?;
    `).run(newName, newDomain, newDesc, newCat, newScale, newEvidence, newAssess, newActive, now, id);

    const updated = this.getSkill(id);
    logAdminAction(db, {
      adminId,
      action: 'skill.update',
      entityType: 'skill',
      entityId: id,
      before: existing,
      after: updated,
      reason: 'Updated skill taxonomy metadata',
      req
    });
    return updated;
  }

  static archiveSkill(id, adminId, req) {
    const db = initDb();
    const existing = this.getSkill(id);
    if (!existing) throw new Error('Skill not found');

    const now = new Date().toISOString();
    db.prepare('UPDATE skills SET is_archived = 1, active = 0, updated_at = ? WHERE id = ?;').run(now, id);

    const updated = this.getSkill(id);
    logAdminAction(db, {
      adminId,
      action: 'skill.archive',
      entityType: 'skill',
      entityId: id,
      before: existing,
      after: updated,
      reason: 'Soft-archived skill',
      req
    });
    return updated;
  }

  static deleteSkill(id, adminId, req) {
    const db = initDb();
    const existing = this.getSkill(id);
    if (!existing) throw new Error('Skill not found');

    const usage = this.getSkillUsageCount(id, db);
    if (usage.totalUsage > 0) {
      const err = new Error(`Cannot delete skill: referenced by ${usage.totalUsage} active entities`);
      err.status = 409;
      err.usage = usage;
      throw err;
    }

    db.prepare('DELETE FROM skills WHERE id = ?;').run(id);

    logAdminAction(db, {
      adminId,
      action: 'skill.delete',
      entityType: 'skill',
      entityId: id,
      before: existing,
      reason: 'Hard-deleted unreferenced skill',
      req
    });
    return { success: true, id };
  }

  // =================== ALIASES ===================
  static addSkillAlias(skillId, alias, adminId, req) {
    if (!alias || !alias.trim()) throw new Error('Alias string cannot be empty');
    const db = initDb();
    const cleanAlias = alias.trim();

    const skill = db.prepare('SELECT id, name FROM skills WHERE id = ?;').get(skillId);
    if (!skill) throw new Error('Skill not found');

    // Check collision across existing skills or aliases
    const existingAlias = db.prepare('SELECT a.*, s.name as owner_name FROM skill_aliases a JOIN skills s ON a.skill_id = s.id WHERE LOWER(a.alias) = LOWER(?);').get(cleanAlias);
    if (existingAlias) {
      const err = new Error(`Alias '${cleanAlias}' is already registered to skill '${existingAlias.owner_name}' (${existingAlias.skill_id})`);
      err.status = 409;
      throw err;
    }

    const existingSkill = db.prepare('SELECT id, name FROM skills WHERE LOWER(name) = LOWER(?);').get(cleanAlias);
    if (existingSkill && existingSkill.id !== skillId) {
      const err = new Error(`Cannot add alias: A canonical skill '${existingSkill.name}' (${existingSkill.id}) already exists with this name`);
      err.status = 409;
      throw err;
    }

    const id = `alias-${uuidv4()}`;
    const now = new Date().toISOString();
    db.prepare('INSERT INTO skill_aliases (id, skill_id, alias, created_at) VALUES (?, ?, ?, ?);').run(id, skillId, cleanAlias, now);

    logAdminAction(db, {
      adminId,
      action: 'skill.add_alias',
      entityType: 'skill',
      entityId: skillId,
      after: { id, alias: cleanAlias },
      reason: `Added alias '${cleanAlias}' to skill '${skill.name}'`,
      req
    });
    return { id, skillId, alias: cleanAlias, createdAt: now };
  }

  static removeSkillAlias(skillId, aliasId, adminId, req) {
    const db = initDb();
    const alias = db.prepare('SELECT * FROM skill_aliases WHERE id = ? AND skill_id = ?;').get(aliasId, skillId);
    if (!alias) throw new Error('Alias not found for this skill');

    db.prepare('DELETE FROM skill_aliases WHERE id = ?;').run(aliasId);

    logAdminAction(db, {
      adminId,
      action: 'skill.remove_alias',
      entityType: 'skill',
      entityId: skillId,
      before: alias,
      reason: `Removed alias '${alias.alias}' from skill`,
      req
    });
    return { success: true, aliasId };
  }

  // =================== MERGE SKILLS ===================
  static mergeSkills({ sourceId, targetId, reason, dryRun = false }, adminId, req) {
    if (!sourceId || !targetId) throw new Error('sourceId and targetId are required');
    if (sourceId === targetId) throw new Error('Source and target skill cannot be the same');

    const db = initDb();
    const source = this.getSkill(sourceId);
    const target = this.getSkill(targetId);

    if (!source) throw new Error(`Source skill '${sourceId}' not found`);
    if (!target) throw new Error(`Target skill '${targetId}' not found`);

    const sourceUsage = this.getSkillUsageCount(sourceId, db);

    const impact = {
      source: { id: source.id, name: source.name },
      target: { id: target.id, name: target.name },
      dryRun: Boolean(dryRun),
      affectedRows: sourceUsage.breakdown,
      totalAffected: sourceUsage.totalUsage
    };

    if (dryRun) {
      return impact;
    }

    // Atomic execution inside transaction
    db.exec('BEGIN IMMEDIATE;');
    try {
      // 1. candidate_skills: resolve duplicate candidate_id + skill_id conflicts by keeping higher proficiency
      const existingTargetCandidateSkills = new Set(
        db.prepare('SELECT candidate_id FROM candidate_skills WHERE skill_id = ?;').all(targetId).map(r => r.candidate_id)
      );
      const sourceCandidateSkills = db.prepare('SELECT * FROM candidate_skills WHERE skill_id = ?;').all(sourceId);

      for (const scs of sourceCandidateSkills) {
        if (existingTargetCandidateSkills.has(scs.candidate_id)) {
          // Keep the higher proficiency
          db.prepare(`
            UPDATE candidate_skills
            SET proficiency = MAX(proficiency, ?)
            WHERE candidate_id = ? AND skill_id = ?;
          `).run(scs.proficiency || 1, scs.candidate_id, targetId);
          db.prepare('DELETE FROM candidate_skills WHERE id = ?;').run(scs.id);
        } else {
          db.prepare('UPDATE candidate_skills SET skill_id = ? WHERE id = ?;').run(targetId, scs.id);
        }
      }

      // 2. job_skill_requirements: resolve unique(job_id, skill_id)
      const existingJobSkills = new Set(
        db.prepare('SELECT job_id FROM job_skill_requirements WHERE skill_id = ?;').all(targetId).map(r => r.job_id)
      );
      const sourceJobSkills = db.prepare('SELECT * FROM job_skill_requirements WHERE skill_id = ?;').all(sourceId);
      for (const sjs of sourceJobSkills) {
        if (existingJobSkills.has(sjs.job_id)) {
          db.prepare('DELETE FROM job_skill_requirements WHERE id = ?;').run(sjs.id);
        } else {
          db.prepare('UPDATE job_skill_requirements SET skill_id = ? WHERE id = ?;').run(targetId, sjs.id);
        }
      }

      // 3. assessment_questions
      db.prepare('UPDATE assessment_questions SET skill_id = ? WHERE skill_id = ?;').run(targetId, sourceId);

      // 4. skill_evidence
      db.prepare('UPDATE skill_evidence SET skill_id = ? WHERE skill_id = ?;').run(targetId, sourceId);

      // 5. skill_evidence_ledger
      db.prepare('UPDATE skill_evidence_ledger SET skill_id = ? WHERE skill_id = ?;').run(targetId, sourceId);

      // 6. practical_challenges
      db.prepare('UPDATE practical_challenges SET skill_id = ? WHERE skill_id = ?;').run(targetId, sourceId);

      // 7. role_benchmark_skills: resolve unique(benchmark_id, skill_id)
      const existingBmSkills = new Set(
        db.prepare('SELECT benchmark_id FROM role_benchmark_skills WHERE skill_id = ?;').all(targetId).map(r => r.benchmark_id)
      );
      const sourceBmSkills = db.prepare('SELECT * FROM role_benchmark_skills WHERE skill_id = ?;').all(sourceId);
      for (const sb of sourceBmSkills) {
        if (existingBmSkills.has(sb.benchmark_id)) {
          db.prepare('DELETE FROM role_benchmark_skills WHERE id = ?;').run(sb.id);
        } else {
          db.prepare('UPDATE role_benchmark_skills SET skill_id = ? WHERE id = ?;').run(targetId, sb.id);
        }
      }

      // 8. Re-point existing aliases from source to target
      db.prepare('UPDATE skill_aliases SET skill_id = ? WHERE skill_id = ?;').run(targetId, sourceId);

      // 9. Add source name as an alias for target skill (if not already existing)
      const now = new Date().toISOString();
      const existingAliasCheck = db.prepare('SELECT id FROM skill_aliases WHERE LOWER(alias) = LOWER(?);').get(source.name);
      if (!existingAliasCheck) {
        db.prepare('INSERT INTO skill_aliases (id, skill_id, alias, created_at) VALUES (?, ?, ?, ?);').run(
          `alias-${uuidv4()}`,
          targetId,
          source.name,
          now
        );
      }

      // 10. Archive the source skill
      db.prepare('UPDATE skills SET is_archived = 1, active = 0, updated_at = ? WHERE id = ?;').run(now, sourceId);

      logAdminAction(db, {
        adminId,
        action: 'skill.merge',
        entityType: 'skill',
        entityId: targetId,
        before: { sourceId, targetId },
        after: impact,
        reason: reason || `Merged skill '${source.name}' into '${target.name}'`,
        req
      });

      db.exec('COMMIT;');
      return { success: true, impact };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  // =================== DUPLICATE DETECTION ===================
  static findDuplicateSkills() {
    const db = initDb();
    const skills = db.prepare(`
      SELECT s.id, s.name, s.domain_id, s.category, d.title as domain_title
      FROM skills s
      LEFT JOIN domains d ON s.domain_id = d.id
      WHERE COALESCE(s.is_archived, 0) = 0
      ORDER BY s.domain_id, s.name ASC;
    `).all();

    const duplicates = [];

    for (let i = 0; i < skills.length; i++) {
      for (let j = i + 1; j < skills.length; j++) {
        const s1 = skills[i];
        const s2 = skills[j];

        if (s1.domain_id !== s2.domain_id) continue;

        const norm1 = normalizeSkillName(s1.name);
        const norm2 = normalizeSkillName(s2.name);

        let matchType = null;
        if (norm1 === norm2) {
          matchType = 'exact_normalized';
        } else {
          const dist = levenshteinDistance(norm1, norm2);
          if (dist <= 2 && Math.min(norm1.length, norm2.length) >= 4) {
            matchType = `edit_distance_${dist}`;
          }
        }

        if (matchType) {
          const usage1 = this.getSkillUsageCount(s1.id, db).totalUsage;
          const usage2 = this.getSkillUsageCount(s2.id, db).totalUsage;
          duplicates.push({
            domainId: s1.domain_id,
            domainTitle: s1.domain_title,
            matchType,
            skillA: { ...s1, usage: usage1 },
            skillB: { ...s2, usage: usage2 }
          });
        }
      }
    }

    return duplicates;
  }

  // =================== BENCHMARKS ===================
  static listBenchmarks() {
    const db = initDb();
    const rows = db.prepare(`
      SELECT rb.*, d.title as domain_title, COUNT(rbs.id) as skill_count
      FROM role_benchmarks rb
      LEFT JOIN domains d ON rb.domain_id = d.id
      LEFT JOIN role_benchmark_skills rbs ON rbs.benchmark_id = rb.id
      GROUP BY rb.id
      ORDER BY rb.title ASC;
    `).all();
    return rows;
  }

  static getBenchmark(id) {
    const db = initDb();
    const row = db.prepare(`
      SELECT rb.*, d.title as domain_title
      FROM role_benchmarks rb
      LEFT JOIN domains d ON rb.domain_id = d.id
      WHERE rb.id = ? OR rb.role_id = ?;
    `).get(id, id);

    if (!row) return null;

    const skills = db.prepare(`
      SELECT rbs.*, s.name as skill_name, s.category
      FROM role_benchmark_skills rbs
      LEFT JOIN skills s ON rbs.skill_id = s.id
      WHERE rbs.benchmark_id = ?
      ORDER BY rbs.weight DESC;
    `).all(row.id);

    return {
      ...row,
      requiredSkills: skills.map(s => ({
        skillId: s.skill_id,
        skillName: s.skill_name || s.skill_id,
        category: s.category || 'General',
        targetLevel: s.target_level,
        weight: s.weight,
        isMandatory: s.is_mandatory === 1,
        prerequisites: (() => {
          try { return JSON.parse(s.prerequisites_json || '[]'); } catch { return []; }
        })(),
        whyItMatters: s.why_it_matters || ''
      }))
    };
  }

  static saveBenchmark({ id, roleId, title, domainId, description, benchmarkVersion = '2026.1', skills = [] }, adminId, req) {
    if (!title || !title.trim()) throw new Error('Benchmark title is required');
    const db = initDb();
    const now = new Date().toISOString();
    const targetRoleId = roleId ? roleId.trim() : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const benchmarkId = id || `rb-${uuidv4()}`;

    db.exec('BEGIN IMMEDIATE;');
    try {
      const existing = db.prepare('SELECT * FROM role_benchmarks WHERE id = ? OR role_id = ?;').get(benchmarkId, targetRoleId);

      if (existing) {
        db.prepare(`
          UPDATE role_benchmarks
          SET title = ?, domain_id = ?, description = ?, benchmark_version = ?, updated_at = ?
          WHERE id = ?;
        `).run(title.trim(), domainId || 'dom-frontend', description || '', benchmarkVersion, now, existing.id);
      } else {
        db.prepare(`
          INSERT INTO role_benchmarks (id, role_id, title, domain_id, description, benchmark_version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `).run(benchmarkId, targetRoleId, title.trim(), domainId || 'dom-frontend', description || '', benchmarkVersion, now, now);
      }

      const activeBmId = existing ? existing.id : benchmarkId;

      // Replace benchmark skills
      db.prepare('DELETE FROM role_benchmark_skills WHERE benchmark_id = ?;').run(activeBmId);

      const insertRbs = db.prepare(`
        INSERT INTO role_benchmark_skills (id, benchmark_id, skill_id, target_level, weight, is_mandatory, prerequisites_json, why_it_matters)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);

      for (const s of skills) {
        if (!s.skillId) continue;
        const targetLevel = Math.max(1, Math.min(5, Number(s.targetLevel || s.requiredProficiency || 3)));
        const weight = Math.max(0.1, Number(s.weight || 1.0));
        const isMandatory = s.isMandatory !== undefined ? (s.isMandatory ? 1 : 0) : 1;
        const prereqs = Array.isArray(s.prerequisites) ? s.prerequisites : [];

        insertRbs.run(
          `rbs-${uuidv4()}`,
          activeBmId,
          s.skillId,
          targetLevel,
          weight,
          isMandatory,
          JSON.stringify(prereqs),
          s.whyItMatters || ''
        );
      }

      const result = this.getBenchmark(activeBmId);

      logAdminAction(db, {
        adminId,
        action: existing ? 'benchmark.update' : 'benchmark.create',
        entityType: 'benchmark',
        entityId: activeBmId,
        before: existing,
        after: result,
        reason: `Saved role benchmark '${title}' with ${skills.length} skills`,
        req
      });

      db.exec('COMMIT;');
      return result;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  // =================== LEARNING RESOURCES ===================
  static listResources({ q, domain, linkStatus, archived, page = 1, pageSize = 20 }) {
    const db = initDb();
    const whereClauses = [];
    const params = [];

    if (q && q.trim()) {
      whereClauses.push('(title LIKE ? OR provider LIKE ? OR slug LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }
    if (domain) {
      whereClauses.push('domain = ?');
      params.push(domain);
    }
    if (linkStatus) {
      whereClauses.push('COALESCE(link_status, "untested") = ?');
      params.push(linkStatus);
    }
    if (archived !== undefined && archived !== '') {
      whereClauses.push('COALESCE(is_archived, 0) = ?');
      params.push(archived === 'true' || archived === true || archived === 1 ? 1 : 0);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) as total FROM learning_resources ${whereSql};`).get(...params)?.total || 0;

    const offset = Math.max(0, (page - 1) * pageSize);
    const items = db.prepare(`
      SELECT * FROM learning_resources
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?;
    `).all(...params, pageSize, offset);

    return {
      items,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static async checkResourceLink(id, adminId, req) {
    const db = initDb();
    const res = db.prepare('SELECT * FROM learning_resources WHERE id = ?;').get(id);
    if (!res) throw new Error('Resource not found');

    const result = await verifyUrlSafe(res.url);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE learning_resources
      SET link_status = ?, link_status_code = ?, last_checked_at = ?
      WHERE id = ?;
    `).run(result.status, result.statusCode || null, now, id);

    logAdminAction(db, {
      adminId,
      action: 'resource.check_link',
      entityType: 'resource',
      entityId: id,
      after: { linkStatus: result.status, statusCode: result.statusCode },
      reason: `Link verification: ${result.message}`,
      req
    });

    return { id, ...result, checkedAt: now };
  }

  static async checkAllLinks(adminId, req, concurrency = 5) {
    const db = initDb();
    const resources = db.prepare('SELECT id, url FROM learning_resources WHERE COALESCE(is_archived, 0) = 0;').all();

    let processed = 0;
    let errors = 0;
    const results = [];

    // Chunk with concurrency limit
    for (let i = 0; i < resources.length; i += concurrency) {
      const chunk = resources.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async r => {
          const check = await verifyUrlSafe(r.url);
          const now = new Date().toISOString();
          db.prepare(`
            UPDATE learning_resources
            SET link_status = ?, link_status_code = ?, last_checked_at = ?
            WHERE id = ?;
          `).run(check.status, check.statusCode || null, now, r.id);
          if (!check.ok) errors++;
          processed++;
          return { id: r.id, url: r.url, ...check };
        })
      );
      results.push(...chunkResults);
    }

    logAdminAction(db, {
      adminId,
      action: 'resource.check_all_links',
      entityType: 'resource',
      after: { total: resources.length, processed, errors },
      reason: `Bulk link verification completed with ${errors} faulty links`,
      req
    });

    return { total: resources.length, processed, errors, results };
  }

  static importResources(resourcesArray, adminId, req, previewOnly = false) {
    if (!Array.isArray(resourcesArray) || resourcesArray.length === 0) {
      throw new Error('Resources payload must be a non-empty array');
    }
    if (resourcesArray.length > 500) {
      throw new Error('Import batch size exceeds maximum of 500 rows');
    }

    const errors = [];
    const validRows = [];

    resourcesArray.forEach((row, idx) => {
      const line = idx + 1;
      if (!row.title || !row.title.trim()) errors.push({ line, field: 'title', message: 'Title is required' });
      if (!row.url || !row.url.trim()) errors.push({ line, field: 'url', message: 'URL is required' });
      if (!row.domain || !row.domain.trim()) errors.push({ line, field: 'domain', message: 'Domain is required' });

      if (row.url) {
        try {
          const u = new URL(row.url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            errors.push({ line, field: 'url', message: 'URL must be HTTP or HTTPS' });
          }
        } catch {
          errors.push({ line, field: 'url', message: 'Invalid URL format' });
        }
      }

      validRows.push({
        id: row.id || `res-${uuidv4()}`,
        slug: row.slug || `${(row.title || 'resource').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${uuidv4().slice(0, 6)}`,
        title: row.title?.trim(),
        domain: row.domain?.trim(),
        provider: row.provider?.trim() || 'External',
        type: row.type || 'documentation',
        resourceType: row.resourceType || row.type || 'documentation',
        source: row.source || 'web',
        url: row.url?.trim(),
        level: row.level || 'Beginner',
        isFree: row.isFree !== undefined ? (row.isFree ? 1 : 0) : 1
      });
    });

    if (errors.length > 0) {
      const err = new Error(`Import validation failed on ${errors.length} rows`);
      err.status = 400;
      err.rowErrors = errors;
      throw err;
    }

    if (previewOnly) {
      return { previewOnly: true, total: validRows.length, rows: validRows.slice(0, 50) };
    }

    // Atomic all-or-nothing commit
    const db = initDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
      const now = new Date().toISOString();
      const insertStmt = db.prepare(`
        INSERT INTO learning_resources (
          id, slug, domain, skill_tags, title, provider, type,
          resource_type, source, url, is_free, level, created_at,
          link_status, is_archived
        ) VALUES (?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'untested', 0);
      `);

      for (const r of validRows) {
        insertStmt.run(r.id, r.slug, r.domain, r.title, r.provider, r.type, r.resourceType, r.source, r.url, r.isFree, r.level, now);
      }

      logAdminAction(db, {
        adminId,
        action: 'resource.import',
        entityType: 'resource',
        after: { importedCount: validRows.length },
        reason: `Bulk imported ${validRows.length} learning resources`,
        req
      });

      db.exec('COMMIT;');
      return { success: true, importedCount: validRows.length };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static exportResources() {
    const db = initDb();
    return db.prepare('SELECT * FROM learning_resources WHERE COALESCE(is_archived, 0) = 0 ORDER BY domain, title ASC;').all();
  }
}
