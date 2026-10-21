import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { authService } from '../../services/authService.js';

describe('Phase 6: Admin Content Management Integration Tests', () => {
  let db;
  let serverInstance;
  let baseUrl;
  let adminToken;
  let candidateToken;
  let testAdminId;

  before(async () => {
    db = initDb();
    const now = new Date().toISOString();
    const hash = await authService.hashPassword('Pass123456');

    testAdminId = `usr-test-content-admin-${Date.now()}`;
    const adminEmail = `content-admin-${Date.now()}@test.dev`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Content Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, adminEmail, hash, now, now);

    const candId = `usr-test-content-cand-${Date.now()}`;
    const candEmail = `content-cand-${Date.now()}@test.dev`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Content Cand', 'candidate', 'active', 1, ?, ?);
    `).run(candId, candEmail, hash, now, now);

    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testAdminId);
    adminToken = authService.generateToken(adminUser);

    const candUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(candId);
    candidateToken = authService.generateToken(candUser);

    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise(r => serverInstance.close(r));
    }
  });

  it('1. Non-admin is rejected with 403 on content management routes', async () => {
    const res = await fetch(`${baseUrl}/api/admin/content/domains`, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });
    assert.equal(res.status, 403);
  });

  it('2. GET /api/admin/content/domains returns domain list with skill counts', async () => {
    const res = await fetch(`${baseUrl}/api/admin/content/domains`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.domains));
    assert.ok(body.domains.length > 0);
    assert.ok(body.domains[0].id);
    assert.ok(typeof body.domains[0].skill_count === 'number');
  });

  it('3. Skills CRUD, alias registration, and audit trail', async () => {
    const testSkillId = 'sk-integ-test-skill';
    db.prepare('DELETE FROM skills WHERE id = ?;').run(testSkillId);
    db.prepare('DELETE FROM skill_aliases WHERE skill_id = ?;').run(testSkillId);

    // Create
    const createRes = await fetch(`${baseUrl}/api/admin/content/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: testSkillId,
        domainId: 'dom-frontend',
        name: 'Integ Test Skill Alpha',
        description: 'Test skill description',
        category: 'Testing'
      })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.skill.id, testSkillId);

    // Verify audit row
    const auditRow = db.prepare("SELECT * FROM admin_audit_log WHERE entity_id = ? AND action = 'skill.create';").get(testSkillId);
    assert.ok(auditRow);

    // Add Alias
    const aliasRes = await fetch(`${baseUrl}/api/admin/content/skills/${testSkillId}/aliases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ alias: 'Integ Skill Alias' })
    });
    assert.equal(aliasRes.status, 201);
    const aliasBody = await aliasRes.json();
    assert.equal(aliasBody.alias, 'Integ Skill Alias');

    // Get Skill Details
    const getRes = await fetch(`${baseUrl}/api/admin/content/skills/${testSkillId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(getRes.status, 200);
    const detail = await getRes.json();
    assert.equal(detail.skill.aliases.length, 1);
    assert.equal(detail.skill.usage.totalUsage, 0);

    // Delete skill (usage is 0, so should succeed)
    const delRes = await fetch(`${baseUrl}/api/admin/content/skills/${testSkillId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(delRes.status, 200);
  });

  it('4. GET /api/admin/content/benchmarks returns seeded benchmarks', async () => {
    const res = await fetch(`${baseUrl}/api/admin/content/benchmarks`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.benchmarks));
    assert.ok(body.benchmarks.length > 0);
  });

  it('5. Resource import preview and commit flow', async () => {
    const testSlug = `res-integ-${Date.now()}`;
    const payload = [
      {
        slug: testSlug,
        title: 'Integration Resource Test',
        domain: 'dom-frontend',
        provider: 'MDN Web Docs',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTML'
      }
    ];

    // Preview
    const previewRes = await fetch(`${baseUrl}/api/admin/content/resources/import?preview=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    assert.equal(previewRes.status, 200);
    const previewBody = await previewRes.json();
    assert.equal(previewBody.previewOnly, true);
    assert.equal(previewBody.total, 1);

    // Commit
    const commitRes = await fetch(`${baseUrl}/api/admin/content/resources/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(payload)
    });
    assert.equal(commitRes.status, 200);
    const commitBody = await commitRes.json();
    assert.equal(commitBody.importedCount, 1);

    // Cleanup
    db.prepare('DELETE FROM learning_resources WHERE slug = ?;').run(testSlug);
  });
});
