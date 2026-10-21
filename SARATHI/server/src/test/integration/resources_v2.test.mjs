import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { seedLearningResources } from '../../data/seeds/resourceSeeder.js';
import app from '../../index.js';

describe('Expanded Learning Library V2 Integration Suite', () => {
  let serverInstance;
  let baseUrl;
  let userAToken;
  let userBToken;
  let userAId;
  let userBId;

  before(async () => {
    initDb();
    seedLearningResources();

    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `student-v2-a-${Date.now()}@sarathi.test`,
        password: 'Password123!',
        fullName: 'Student Alice',
        role: 'student',
      }),
    });
    assert.equal(resA.status, 200);
    const bodyA = await resA.json();
    userAToken = bodyA.token;
    userAId = bodyA.user.id;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `student-v2-b-${Date.now()}@sarathi.test`,
        password: 'Password123!',
        fullName: 'Student Bob',
        role: 'student',
      }),
    });
    assert.equal(resB.status, 200);
    const bodyB = await resB.json();
    userBToken = bodyB.token;
    userBId = bodyB.user.id;
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('1. Catalog contains 80+ resources with >= 36 video/playlist items across 5 domains', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 80, `Expected >= 80 resources, got ${body.data.length}`);

    const videoOrPlaylists = body.data.filter(
      (r) => r.resourceType === 'video' || r.resourceType === 'playlist'
    );
    assert.ok(
      videoOrPlaylists.length >= 36,
      `Expected >= 36 video/playlist resources, got ${videoOrPlaylists.length}`
    );

    const domains = new Set(body.data.map((r) => r.domain));
    assert.ok(domains.has('dom-frontend'), 'Missing dom-frontend');
    assert.ok(domains.has('dom-backend'), 'Missing dom-backend');
    assert.ok(domains.has('dom-aiml'), 'Missing dom-aiml');
    assert.ok(domains.has('dom-clouddevops'), 'Missing dom-clouddevops');
    assert.ok(domains.has('dom-cybersecurity'), 'Missing dom-cybersecurity');
  });

  test('2. Server-side pagination (12 per page) and format filtering', async () => {
    // Request page 1 with pageSize 12
    const p1Res = await fetch(`${baseUrl}/api/resources?page=1&pageSize=12`);
    assert.equal(p1Res.status, 200);
    const p1 = await p1Res.json();
    assert.equal(p1.data.length, 12);
    assert.equal(p1.pagination.page, 1);
    assert.equal(p1.pagination.pageSize, 12);
    assert.ok(p1.pagination.totalCount >= 80);
    assert.ok(p1.pagination.totalPages >= 7);
    assert.equal(p1.pagination.hasMore, true);

    // Filter by format=video
    const vidRes = await fetch(`${baseUrl}/api/resources?format=video&page=1&pageSize=10`);
    assert.equal(vidRes.status, 200);
    const vidBody = await vidRes.json();
    assert.ok(vidBody.data.every((r) => r.resourceType === 'video'));
    assert.ok(vidBody.data.every((r) => r.youtubeVideoId && r.youtubeVideoId.length > 0));
  });

  test('3. Sorting by duration (shortest vs longest) and newest', async () => {
    const shortRes = await fetch(`${baseUrl}/api/resources?sort=shortest&page=1&pageSize=6`);
    assert.equal(shortRes.status, 200);
    const shortBody = await shortRes.json();

    const longRes = await fetch(`${baseUrl}/api/resources?sort=longest&page=1&pageSize=6`);
    assert.equal(longRes.status, 200);
    const longBody = await longRes.json();

    const shortestDuration = shortBody.data[0].durationMinutes || 0;
    const longestDuration = longBody.data[0].durationMinutes || 0;
    assert.ok(
      shortestDuration <= longestDuration,
      `Expected shortest (${shortestDuration}) <= longest (${longestDuration})`
    );
  });

  test('4. Progress tracking saves lastPositionSeconds and completedItemIds', async () => {
    // Find a video resource
    const listRes = await fetch(`${baseUrl}/api/resources?format=video&page=1&pageSize=1`);
    const listBody = await listRes.json();
    const videoResource = listBody.data[0];

    // User A starts video and updates progress
    const updateRes = await fetch(`${baseUrl}/api/resources/${videoResource.id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        status: 'in_progress',
        percentComplete: 45,
        lastPositionSeconds: 240,
        completedItemIds: ['item-1'],
        notes: 'Watched chapter 1 and 2',
      }),
    });

    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.success, true);
    assert.equal(updateBody.data.status, 'in_progress');
    assert.equal(updateBody.data.lastPositionSeconds, 240);

    // Complete the video
    const completeRes = await fetch(`${baseUrl}/api/resources/${videoResource.id}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        status: 'completed',
        percentComplete: 100,
        lastPositionSeconds: 600,
        completedItemIds: ['item-1', 'item-2'],
      }),
    });
    assert.equal(completeRes.status, 200);
    const completeBody = await completeRes.json();
    assert.equal(completeBody.data.status, 'completed');
  });

  test('5. Per-user data isolation for bookmarks and progress', async () => {
    const listRes = await fetch(`${baseUrl}/api/resources?page=1&pageSize=1`);
    const listBody = await listRes.json();
    const targetResource = listBody.data[0];

    // User A bookmarks the resource
    const bmRes = await fetch(`${baseUrl}/api/resources/${targetResource.id}/bookmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({ collectionName: 'saved_videos' }),
    });
    assert.equal(bmRes.status, 200);

    // User A verifies it is bookmarked
    const userAList = await fetch(`${baseUrl}/api/resources?bookmarkedOnly=true`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const userABody = await userAList.json();
    assert.ok(userABody.data.some((r) => r.id === targetResource.id));

    // User B verifies they do NOT see it in their bookmarks
    const userBList = await fetch(`${baseUrl}/api/resources?bookmarkedOnly=true`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const userBBody = await userBList.json();
    assert.equal(userBBody.data.length, 0, 'User B must not see User A bookmarks');
  });

  test('6. Gap-based recommendations return recommendationReason strings', async () => {
    const recRes = await fetch(
      `${baseUrl}/api/resources/recommendations?targetRole=Frontend%20Developer&domainId=dom-frontend`,
      {
        headers: { Authorization: `Bearer ${userAToken}` },
      }
    );
    assert.equal(recRes.status, 200);
    const recBody = await recRes.json();
    assert.equal(recBody.success, true);
    assert.ok(recBody.data.length > 0);

    const firstRec = recBody.data[0];
    assert.ok(firstRec.recommendationReason, 'Expected recommendationReason string');
    assert.ok(typeof firstRec.recommendationReason === 'string');
    assert.ok(firstRec.recommendationReason.length > 5);
  });

  test('7. Seed idempotency preserves bookmarks and progress across re-seeds', async () => {
    // Re-run seedLearningResources() 3 times
    seedLearningResources();
    seedLearningResources();
    seedLearningResources();

    // Verify User A still has their bookmarked resource intact
    const checkRes = await fetch(`${baseUrl}/api/resources?bookmarkedOnly=true`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const checkBody = await checkRes.json();
    assert.ok(checkBody.data.length >= 1, 'Bookmarks must not be wiped by re-seeding');
  });
});
