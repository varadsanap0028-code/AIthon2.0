import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { AdminContentService, isPrivateOrReservedIp, verifyUrlSafe } from '../../services/admin/adminContentService.js';
import { RoleBenchmarkService } from '../../services/roleBenchmarkService.js';

describe('Phase 6: AdminContentService Unit Tests', () => {
  let db;
  const testAdminId = 'usr-admin-seed';

  before(() => {
    db = initDb();
  });

  describe('SSRF Protection & URL Safety', () => {
    it('1. Correctly flags loopback, link-local, and private IP ranges', () => {
      assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
      assert.equal(isPrivateOrReservedIp('127.1.2.3'), true);
      assert.equal(isPrivateOrReservedIp('10.0.0.1'), true);
      assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
      assert.equal(isPrivateOrReservedIp('172.31.255.254'), true);
      assert.equal(isPrivateOrReservedIp('192.168.1.1'), true);
      assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
      assert.equal(isPrivateOrReservedIp('0.0.0.0'), true);
      assert.equal(isPrivateOrReservedIp('localhost'), true);
      assert.equal(isPrivateOrReservedIp('::1'), true);

      // Public IPs should pass
      assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
      assert.equal(isPrivateOrReservedIp('1.1.1.1'), false);
      assert.equal(isPrivateOrReservedIp('142.250.190.46'), false);
    });

    it('2. verifyUrlSafe blocks loopback and link-local addresses without making network request', async () => {
      const res1 = await verifyUrlSafe('http://127.0.0.1:8080/secret');
      assert.equal(res1.ok, false);
      assert.equal(res1.status, 'blocked');

      const res2 = await verifyUrlSafe('http://169.254.169.254/latest/meta-data/');
      assert.equal(res2.ok, false);
      assert.equal(res2.status, 'blocked');

      const res3 = await verifyUrlSafe('ftp://example.com/file.txt');
      assert.equal(res3.ok, false);
      assert.equal(res3.status, 'unsupported_protocol');
    });
  });

  describe('Skills Management & Usage Guard', () => {
    const testSkillId = 'sk-test-content-unit';
    const testSkillTargetId = 'sk-test-target-unit';

    before(() => {
      // Ensure clean state
      db.prepare('DELETE FROM skills WHERE id IN (?, ?);').run(testSkillId, testSkillTargetId);
      db.prepare('DELETE FROM skill_aliases WHERE skill_id IN (?, ?);').run(testSkillId, testSkillTargetId);
    });

    after(() => {
      db.prepare('DELETE FROM skills WHERE id IN (?, ?);').run(testSkillId, testSkillTargetId);
      db.prepare('DELETE FROM skill_aliases WHERE skill_id IN (?, ?);').run(testSkillId, testSkillTargetId);
    });

    it('3. Can create and retrieve a skill', () => {
      const created = AdminContentService.createSkill({
        id: testSkillId,
        domainId: 'dom-frontend',
        name: 'Unit Test Skill Alpha',
        description: 'Test skill description',
        category: 'Testing'
      }, testAdminId);

      assert.equal(created.id, testSkillId);
      assert.equal(created.name, 'Unit Test Skill Alpha');

      const retrieved = AdminContentService.getSkill(testSkillId);
      assert.equal(retrieved.id, testSkillId);
    });

    it('4. Cannot hard-delete a skill referenced by other entities (returns 409 with breakdown)', () => {
      // Create a reference in candidate_skills
      const dummyCandidateId = 'usr-dummy-candidate-p6';
      db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
        VALUES (?, 'cand-p6@test.com', 'hash', 'Test Candidate P6', 'candidate', 'active', datetime('now'), datetime('now'));
      `).run(dummyCandidateId);

      db.prepare(`
        INSERT OR REPLACE INTO candidate_skills (id, candidate_id, skill_id, proficiency, verification_status, created_at, updated_at)
        VALUES ('cs-p6-test', ?, ?, 3, 'verified', datetime('now'), datetime('now'));
      `).run(dummyCandidateId, testSkillId);

      assert.throws(() => {
        AdminContentService.deleteSkill(testSkillId, testAdminId);
      }, (err) => {
        assert.equal(err.status, 409);
        assert.ok(err.usage.breakdown.candidateSkills >= 1);
        return true;
      });

      // Cleanup candidate reference
      db.prepare("DELETE FROM candidate_skills WHERE id = 'cs-p6-test';").run();
      db.prepare('DELETE FROM users WHERE id = ?;').run(dummyCandidateId);
    });

    it('5. Can manage aliases and prevents collision', () => {
      const aliasResult = AdminContentService.addSkillAlias(testSkillId, 'Unit Alpha Alias', testAdminId);
      assert.equal(aliasResult.alias, 'Unit Alpha Alias');

      // Collision check
      assert.throws(() => {
        AdminContentService.addSkillAlias(testSkillId, 'Unit Alpha Alias', testAdminId);
      }, (err) => {
        assert.equal(err.status, 409);
        return true;
      });

      // Remove alias
      const removeResult = AdminContentService.removeSkillAlias(testSkillId, aliasResult.id, testAdminId);
      assert.equal(removeResult.success, true);
    });

    it('6. Dry-run merge returns accurate impact without modifying data', () => {
      // Create target skill
      AdminContentService.createSkill({
        id: testSkillTargetId,
        domainId: 'dom-frontend',
        name: 'Unit Test Skill Target',
        description: 'Target skill for merge'
      }, testAdminId);

      const dryRunResult = AdminContentService.mergeSkills({
        sourceId: testSkillId,
        targetId: testSkillTargetId,
        dryRun: true
      }, testAdminId);

      assert.equal(dryRunResult.dryRun, true);
      assert.equal(dryRunResult.source.id, testSkillId);
      assert.equal(dryRunResult.target.id, testSkillTargetId);

      // Verify source skill is NOT archived after dryRun
      const source = AdminContentService.getSkill(testSkillId);
      assert.equal(source.is_archived, 0);

      // Perform real merge
      const realResult = AdminContentService.mergeSkills({
        sourceId: testSkillId,
        targetId: testSkillTargetId,
        dryRun: false
      }, testAdminId);

      assert.equal(realResult.success, true);
      const updatedSource = AdminContentService.getSkill(testSkillId);
      assert.equal(updatedSource.is_archived, 1);
    });
  });

  describe('Role Benchmarks & Real-time Skill Gap Reflection', () => {
    it('7. Saving a role benchmark persists to DB and immediately alters RoleBenchmarkService output', () => {
      const roleId = 'test-benchmark-role';
      const benchmark = AdminContentService.saveBenchmark({
        roleId,
        title: 'Benchmark Quality Engineer',
        domainId: 'dom-frontend',
        description: 'Test role description',
        skills: [
          { skillId: 'sk-html5', targetLevel: 5, weight: 2.0, isMandatory: true }
        ]
      }, testAdminId);

      assert.equal(benchmark.title, 'Benchmark Quality Engineer');
      assert.equal(benchmark.requiredSkills.length, 1);
      assert.equal(benchmark.requiredSkills[0].targetLevel, 5);

      // RoleBenchmarkService should read this updated benchmark directly
      const loaded = RoleBenchmarkService.getRoleBenchmark('Benchmark Quality Engineer');
      assert.ok(loaded);
      assert.equal(loaded.roleTitle, 'Benchmark Quality Engineer');
      assert.equal(loaded.requiredSkills[0].requiredProficiency, 5);
      assert.equal(loaded.requiredSkills[0].weight, 2.0);

      // Clean up
      db.prepare('DELETE FROM role_benchmarks WHERE id = ?;').run(benchmark.id);
    });
  });

  describe('Resource Import All-or-Nothing Validation', () => {
    it('8. Rejects invalid rows with line numbers and imports zero rows on failure', () => {
      const invalidBatch = [
        { title: 'Valid 1', url: 'https://example.com/1', domain: 'dom-frontend' },
        { title: '', url: 'https://example.com/2', domain: 'dom-frontend' }, // missing title
        { title: 'Valid 3', url: 'not-a-valid-url', domain: 'dom-frontend' } // invalid url
      ];

      assert.throws(() => {
        AdminContentService.importResources(invalidBatch, testAdminId);
      }, (err) => {
        assert.equal(err.status, 400);
        assert.ok(Array.isArray(err.rowErrors));
        assert.ok(err.rowErrors.some(e => e.line === 2 && e.field === 'title'));
        assert.ok(err.rowErrors.some(e => e.line === 3 && e.field === 'url'));
        return true;
      });
    });
  });

  describe('Duplicate Detection', () => {
    it('9. Identifies near-duplicate skill names in the same domain', () => {
      const d1 = 'sk-dup-a';
      const d2 = 'sk-dup-b';
      db.prepare('DELETE FROM skills WHERE id IN (?, ?);').run(d1, d2);

      AdminContentService.createSkill({ id: d1, domainId: 'dom-frontend', name: 'PostgreSQL Database' }, testAdminId);
      AdminContentService.createSkill({ id: d2, domainId: 'dom-frontend', name: 'Postgresql Database' }, testAdminId);

      const duplicates = AdminContentService.findDuplicateSkills();
      const match = duplicates.find(d => (d.skillA.id === d1 && d.skillB.id === d2) || (d.skillA.id === d2 && d.skillB.id === d1));

      assert.ok(match);
      assert.equal(match.matchType, 'exact_normalized');

      // Cleanup
      db.prepare('DELETE FROM skills WHERE id IN (?, ?);').run(d1, d2);
    });
  });
});
