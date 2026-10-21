import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IntegrityRiskService } from '../../services/admin/integrityRiskService.js';
import { INTEGRITY_RISK_CONFIG } from '../../config/integrityRiskConfig.js';

describe('Phase 5: IntegrityRiskService Unit Tests', () => {
  test('1. tokenizeCode strips comments and handles punctuation correctly', () => {
    const code = `
      // Single line comment
      /* Multi-line
         comment */
      function add(a, b) {
        # Python style comment
        return a + b;
      }
    `;
    const tokens = IntegrityRiskService.tokenizeCode(code);
    assert.ok(Array.isArray(tokens));
    assert.ok(tokens.includes('function'));
    assert.ok(tokens.includes('add'));
    assert.ok(tokens.includes('return'));
    assert.ok(!tokens.includes('Single'));
    assert.ok(!tokens.includes('Multi-line'));
  });

  test('2. getShingles generates sliding window of k tokens', () => {
    const tokens = ['a', 'b', 'c', 'd', 'e', 'f'];
    const shingles = IntegrityRiskService.getShingles(tokens, 5);
    assert.equal(shingles.size, 2);
    assert.ok(shingles.has('a b c d e'));
    assert.ok(shingles.has('b c d e f'));

    // Shorter than k produces empty set
    const shortShingles = IntegrityRiskService.getShingles(['a', 'b'], 5);
    assert.equal(shortShingles.size, 0);
  });

  test('3. jaccardSimilarity returns exact intersection over union', () => {
    const setA = new Set(['tok1', 'tok2', 'tok3']);
    const setB = new Set(['tok2', 'tok3', 'tok4']);

    const sim = IntegrityRiskService.jaccardSimilarity(setA, setB);
    // Intersection: tok2, tok3 (2) | Union: tok1, tok2, tok3, tok4 (4) -> 2/4 = 0.5
    assert.equal(sim, 0.5);

    // Disjoint sets
    const setC = new Set(['x', 'y']);
    assert.equal(IntegrityRiskService.jaccardSimilarity(setA, setC), 0);

    // Empty sets
    assert.equal(IntegrityRiskService.jaccardSimilarity(new Set(), setA), 0);
  });

  test('4. Clean session calculation yields low risk band (<35)', () => {
    const cleanFeatures = IntegrityRiskService.calculateFeatures({
      events: [
        { type: 'focus', ts: '2026-10-20T10:00:00Z', meta: {} },
      ],
      finalCode: 'function solve() { return 42; }',
      solveTimeSeconds: 600,
      peerSolveTimes: [550, 620, 580, 610, 590, 630, 570, 600, 640, 595], // 10 peers
      peerCodeSubmissions: [],
      runResults: [{ visible_passed: 5, visible_total: 5 }],
    });

    assert.equal(cleanFeatures.features.paste, 0);
    assert.equal(cleanFeatures.features.pasteRatio, 0);
    assert.equal(cleanFeatures.features.blur, 0);
    assert.equal(cleanFeatures.features.blurTime, 0);
    assert.equal(cleanFeatures.features.similarity, 0);

    const scored = IntegrityRiskService.scoreFeatures(cleanFeatures.features, cleanFeatures.raw);
    assert.ok(scored.score < 35, `Expected score < 35 for clean session, got ${scored.score}`);
    assert.equal(scored.band, 'low');
    assert.ok(scored.reasons.length > 0);
  });

  test('5. Paste-heavy and focus-loss session yields high risk band (>=65)', () => {
    const suspiciousEvents = [
      { type: 'paste_blocked', ts: '2026-10-20T10:01:00Z', meta: { pastedLength: 300 } },
      { type: 'paste_blocked', ts: '2026-10-20T10:02:00Z', meta: { pastedLength: 300 } },
      { type: 'paste_blocked', ts: '2026-10-20T10:03:00Z', meta: { pastedLength: 300 } },
      { type: 'paste_blocked', ts: '2026-10-20T10:04:00Z', meta: { pastedLength: 300 } },
      { type: 'paste_blocked', ts: '2026-10-20T10:04:30Z', meta: { pastedLength: 300 } },
      { type: 'visibility_hidden', ts: '2026-10-20T10:05:00Z', meta: {} },
      { type: 'visibility_visible', ts: '2026-10-20T10:07:00Z', meta: {} }, // 120s away
      { type: 'fullscreen_exit', ts: '2026-10-20T10:08:00Z', meta: {} },
    ];

    const finalCode = 'const x = ' + 'a'.repeat(900); // 900 chars, pasted 1200 -> pasteRatio = 1.0

    const { features, raw } = IntegrityRiskService.calculateFeatures({
      events: suspiciousEvents,
      finalCode,
      solveTimeSeconds: 600,
    });

    assert.ok(features.paste >= 0.8);
    assert.equal(features.pasteRatio, 1);
    assert.ok(features.blurTime >= 0.8);

    const scored = IntegrityRiskService.scoreFeatures(features, raw);
    assert.ok(scored.score >= 65, `Expected high risk >= 65, got ${scored.score}`);
    assert.equal(scored.band, 'high');
    assert.ok(scored.reasons.some(r => r.includes('paste') || r.includes('Pasted')));
  });

  test('6. Copycat code similarity detects matched session and generates reason', () => {
    const codeA = `
      function fibonacci(n) {
        if (n <= 1) return n;
        let prev = 0, curr = 1;
        for (let i = 2; i <= n; i++) {
          let temp = prev + curr;
          prev = curr;
          curr = temp;
        }
        return curr;
      }
    `;

    const codeB = `
      function fibonacci(n) {
        if (n <= 1) return n;
        let prev = 0, curr = 1;
        for (let i = 2; i <= n; i++) {
          let temp = prev + curr;
          prev = curr;
          curr = temp;
        }
        return curr;
      }
    `;

    const { features, raw } = IntegrityRiskService.calculateFeatures({
      events: [],
      finalCode: codeA,
      solveTimeSeconds: 300,
      peerCodeSubmissions: [{ sessionId: 'ses-peer-1', code: codeB }],
    });

    assert.equal(features.similarity, 1.0);
    assert.equal(raw.matchedSessionIds.length, 1);
    assert.equal(raw.matchedSessionIds[0].sessionId, 'ses-peer-1');

    const scored = IntegrityRiskService.scoreFeatures(features, raw);
    assert.ok(scored.reasons.some(r => r.includes('similarity')));
  });

  test('7. Fast solve time requires >= 10 peers to activate', () => {
    // Only 5 peers -> fast should be 0
    const fewPeers = IntegrityRiskService.calculateFeatures({
      events: [],
      finalCode: 'let a = 1;',
      solveTimeSeconds: 20,
      peerSolveTimes: [500, 600, 700, 800, 900],
    });
    assert.equal(fewPeers.features.fast, 0);

    // 12 peers with mean=600 and std~50 -> solveTime=30 is extremely fast (z ~ -11.4 -> fast=1)
    const twelvePeers = IntegrityRiskService.calculateFeatures({
      events: [],
      finalCode: 'let a = 1;',
      solveTimeSeconds: 30,
      peerSolveTimes: [580, 590, 600, 610, 620, 595, 605, 615, 585, 600, 610, 590],
    });
    assert.ok(twelvePeers.features.fast > 0.8);
  });
});
