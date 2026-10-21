import { initDb } from '../../config/db.js';
import { INTEGRITY_RISK_CONFIG } from '../../config/integrityRiskConfig.js';

export class IntegrityRiskService {
  /**
   * Tokenize code for shingling, discarding whitespace and comments.
   * Pure function.
   */
  static tokenizeCode(code = '') {
    if (!code || typeof code !== 'string') return [];
    // Remove single line and multi-line comments
    const stripped = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/#.*$/gm, '');

    const tokens = stripped.match(/\w+|[^\s\w]/g);
    return tokens || [];
  }

  /**
   * Generate k-token shingles (default 5-token shingles)
   * Pure function.
   */
  static getShingles(tokens = [], k = INTEGRITY_RISK_CONFIG.thresholds.shingleTokenSize) {
    const shingles = new Set();
    if (!Array.isArray(tokens) || tokens.length < k) {
      return shingles;
    }
    for (let i = 0; i <= tokens.length - k; i++) {
      shingles.add(tokens.slice(i, i + k).join(' '));
    }
    return shingles;
  }

  /**
   * Compute Jaccard similarity between two sets of shingles.
   * Pure function: |A ∩ B| / |A ∪ B|
   */
  static jaccardSimilarity(setA, setB) {
    if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    const [smaller, larger] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    for (const item of smaller) {
      if (larger.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Helper to clamp numbers between min and max
   */
  static clamp(val, min = 0, max = 1) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Calculate all 8 normalized integrity features (0 to 1).
   * Pure function.
   */
  static calculateFeatures({
    events = [],
    finalCode = '',
    solveTimeSeconds = 0,
    peerSolveTimes = [],
    cameraActive = false,
    cameraOffSeconds = 0,
    peerCodeSubmissions = [], // [{ sessionId, code }]
    runResults = [],
  } = {}) {
    // 1. Paste features
    let pasteCount = 0;
    let pastedChars = 0;
    for (const evt of events) {
      if (evt.type === 'paste_blocked' || evt.type === 'paste') {
        pasteCount++;
        let pLen = 0;
        try {
          const meta = typeof evt.meta === 'string' ? JSON.parse(evt.meta) : (evt.meta || {});
          pLen = Number(meta.pastedLength || meta.charCount || meta.length || meta.textLength || 0);
        } catch {}
        pastedChars += (pLen > 0 ? pLen : 80); // default conservative estimate if length omitted
      }
    }
    const paste = Math.min(pasteCount / 5, 1);
    const finalCodeLength = finalCode ? finalCode.length : 0;
    const pasteRatio = finalCodeLength > 0 ? Math.min(pastedChars / finalCodeLength, 1) : (pasteCount > 0 ? 1 : 0);

    // 2. Blur and tab switch features
    let tabSwitchOrBlurCount = 0;
    let blurSeconds = 0;
    let lastBlurTs = null;

    for (const evt of events) {
      const ts = new Date(evt.ts).getTime();
      if (evt.type === 'visibility_hidden' || evt.type === 'blur' || evt.type === 'fullscreen_exit') {
        tabSwitchOrBlurCount++;
        if (!lastBlurTs) lastBlurTs = ts;
      } else if (evt.type === 'visibility_visible' || evt.type === 'focus') {
        if (lastBlurTs) {
          const diffSec = Math.max(0, Math.round((ts - lastBlurTs) / 1000));
          blurSeconds += diffSec;
          lastBlurTs = null;
        }
      }
    }
    // If ended while away, count until session end/solve time
    if (lastBlurTs && solveTimeSeconds > 0) {
      blurSeconds += 10;
    }

    const blur = Math.min(tabSwitchOrBlurCount / 10, 1);
    const blurTime = Math.min(blurSeconds / 120, 1);

    // 3. Fast solve time (vs >= 10 peers)
    let fast = 0;
    const minPeers = INTEGRITY_RISK_CONFIG.thresholds.minPeerCountForFast;
    if (Array.isArray(peerSolveTimes) && peerSolveTimes.length >= minPeers && solveTimeSeconds > 0) {
      const n = peerSolveTimes.length;
      const mean = peerSolveTimes.reduce((a, b) => a + b, 0) / n;
      const variance = peerSolveTimes.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      if (std > 0) {
        const timeZ = (solveTimeSeconds - mean) / std;
        fast = this.clamp(-timeZ / 3, 0, 1);
      }
    }

    // 4. Camera proctoring feature
    let camera = 0;
    if (cameraActive && solveTimeSeconds > 0) {
      camera = this.clamp(cameraOffSeconds / solveTimeSeconds, 0, 1);
    } else {
      // Check if camera-related events exist
      const cameraEvents = events.filter(e => ['camera_unauthorized', 'no_face', 'multiple_faces'].includes(e.type));
      if (cameraEvents.length > 0) {
        camera = Math.min(cameraEvents.length / 5, 1);
      }
    }

    // 5. Code similarity (5-token shingles vs recent peer submissions)
    let similarity = 0;
    const matchedSessionIds = [];
    if (finalCode && finalCode.length >= 20 && Array.isArray(peerCodeSubmissions) && peerCodeSubmissions.length > 0) {
      const thisTokens = this.tokenizeCode(finalCode);
      const thisShingles = this.getShingles(thisTokens);

      if (thisShingles.size > 0) {
        for (const peer of peerCodeSubmissions) {
          if (!peer.code) continue;
          const peerTokens = this.tokenizeCode(peer.code);
          const peerShingles = this.getShingles(peerTokens);
          const sim = this.jaccardSimilarity(thisShingles, peerShingles);
          if (sim > similarity) {
            similarity = sim;
          }
          if (sim >= INTEGRITY_RISK_CONFIG.thresholds.highSimilarityThreshold) {
            matchedSessionIds.push({ sessionId: peer.sessionId, similarity: Math.round(sim * 100) });
          }
        }
      }
    }

    // 6. First try pass
    let firstTry = 0;
    if (Array.isArray(runResults) && runResults.length > 0) {
      const firstRun = runResults[0];
      const visiblePassed = Number(firstRun.visible_passed || 0);
      const visibleTotal = Number(firstRun.visible_total || 0);
      const allPassed = visibleTotal > 0 && visiblePassed === visibleTotal;
      if (allPassed && fast > 0.5) {
        firstTry = 1;
      }
    }

    return {
      features: {
        paste,
        pasteRatio,
        blur,
        blurTime,
        fast,
        camera,
        similarity,
        firstTry,
      },
      raw: {
        pasteCount,
        pastedChars,
        finalCodeLength,
        tabSwitchOrBlurCount,
        blurSeconds,
        solveTimeSeconds,
        cameraOffSeconds,
        matchedSessionIds,
      },
    };
  }

  /**
   * Compute final risk score, band, contributions, and top 3 explainable reasons.
   * Formula: x = sum(w_i * f_i) - b; risk = round(100 / (1 + e^(-x)))
   * Pure function.
   */
  static scoreFeatures(features, raw = {}) {
    const { weights, bias, bands } = INTEGRITY_RISK_CONFIG;

    let x = -bias;
    const contributions = {};
    const reasonCandidates = [];

    for (const [key, weight] of Object.entries(weights)) {
      const fVal = features[key] ?? 0;
      const cont = weight * fVal;
      contributions[key] = Math.round(cont * 100) / 100;
      x += cont;

      // Build plain-English candidate reason
      if (cont > 0.25) {
        let label = '';
        if (key === 'pasteRatio' && features.pasteRatio > 0.2) {
          label = `Pasted code covers ${Math.round(features.pasteRatio * 100)}% of the submitted solution`;
        } else if (key === 'paste' && (raw.pasteCount || features.paste > 0.2)) {
          label = `${raw.pasteCount || Math.round(features.paste * 5)} paste event(s) detected during coding`;
        } else if (key === 'similarity' && features.similarity >= 0.5) {
          label = `Code shares ${Math.round(features.similarity * 100)}% token similarity with another submission`;
        } else if (key === 'blurTime' && (raw.blurSeconds || features.blurTime > 0.2)) {
          label = `${raw.blurSeconds || Math.round(features.blurTime * 120)}s total time spent away from assessment tab`;
        } else if (key === 'blur' && (raw.tabSwitchOrBlurCount || features.blur > 0.2)) {
          label = `${raw.tabSwitchOrBlurCount || Math.round(features.blur * 10)} tab switch or window blur events`;
        } else if (key === 'fast' && features.fast > 0.4) {
          label = `Solved question in unusually fast time compared to peer benchmark`;
        } else if (key === 'camera' && features.camera > 0.2) {
          label = `Proctor camera absent or face not recognized for ${Math.round(features.camera * 100)}% of test duration`;
        } else if (key === 'firstTry' && features.firstTry === 1) {
          label = `All assertions passed on initial execution in exceptionally short duration`;
        }
        if (label) {
          reasonCandidates.push({ key, cont, label });
        }
      }
    }

    // Logistic sigmoid transformation
    const score = Math.round(100 / (1 + Math.exp(-x)));
    const band = score < bands.low ? 'low' : score < bands.high ? 'medium' : 'high';

    // Sort reasons by highest contribution
    reasonCandidates.sort((a, b) => b.cont - a.cont);
    const topReasons = reasonCandidates.slice(0, 3).map(r => r.label);

    if (topReasons.length === 0) {
      if (band === 'low') {
        topReasons.push('Standard test progression with no notable anomalies');
      } else {
        topReasons.push('Aggregate pattern of minor timing and focus shifts');
      }
    }

    return {
      score,
      band,
      features,
      contributions,
      reasons: topReasons,
      matchedSessionIds: raw.matchedSessionIds || [],
      modelVersion: INTEGRITY_RISK_CONFIG.modelVersion,
    };
  }

  /**
   * Compute risk for a session from database and persist to integrity_risk_scores.
   */
  static computeAndSave(sessionId, customDb = null) {
    const db = customDb || initDb();

    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session) {
      throw new Error(`Assessment session not found: ${sessionId}`);
    }

    // 1. Fetch integrity events
    const events = db.prepare(`
      SELECT type, ts, meta FROM integrity_events
      WHERE session_id = ? ORDER BY ts ASC
    `).all(sessionId);

    // 2. Fetch code snapshots (latest submit or autosave)
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(sessionId);

    const finalCode = snapshots[0]?.code || '';
    const questionId = snapshots[0]?.question_id || null;

    // 3. Compute solve time
    let solveTimeSeconds = 0;
    if (session.started_at && session.submitted_at) {
      solveTimeSeconds = Math.max(0, Math.round((new Date(session.submitted_at).getTime() - new Date(session.started_at).getTime()) / 1000));
    }

    // 4. Fetch peer solve times on the same question/domain
    let peerSolveTimes = [];
    if (questionId) {
      const peers = db.prepare(`
        SELECT (strftime('%s', s.submitted_at) - strftime('%s', s.started_at)) as duration
        FROM assessment_sessions s
        JOIN submission_snapshots sn ON s.id = sn.session_id
        WHERE sn.question_id = ? AND s.status IN ('graded', 'submitted') AND s.id != ?
          AND s.started_at IS NOT NULL AND s.submitted_at IS NOT NULL
        LIMIT 200
      `).all(questionId, sessionId);
      peerSolveTimes = peers.map(p => Number(p.duration)).filter(d => d > 0 && d < 7200);
    }

    // 5. Fetch peer submissions on the same question (last 90 days, up to 500)
    let peerCodeSubmissions = [];
    if (questionId) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      peerCodeSubmissions = db.prepare(`
        SELECT session_id as sessionId, code
        FROM submission_snapshots
        WHERE question_id = ? AND session_id != ? AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 500
      `).all(questionId, sessionId, ninetyDaysAgo);
    }

    // 6. Fetch run results
    const runResults = db.prepare(`
      SELECT visible_passed, visible_total, status, time_ms
      FROM run_results
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    // Calculate features
    const { features, raw } = this.calculateFeatures({
      events,
      finalCode,
      solveTimeSeconds,
      peerSolveTimes,
      peerCodeSubmissions,
      runResults,
    });

    const scoreResult = this.scoreFeatures(features, raw);
    const now = new Date().toISOString();

    // Persist into integrity_risk_scores
    db.prepare(`
      INSERT INTO integrity_risk_scores (
        session_id, score, band, features_json, reasons_json, model_version, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        score = excluded.score,
        band = excluded.band,
        features_json = excluded.features_json,
        reasons_json = excluded.reasons_json,
        model_version = excluded.model_version,
        computed_at = excluded.computed_at;
    `).run(
      sessionId,
      scoreResult.score,
      scoreResult.band,
      JSON.stringify(scoreResult.features),
      JSON.stringify(scoreResult.reasons),
      scoreResult.modelVersion,
      now
    );

    return {
      ...scoreResult,
      sessionId,
      computedAt: now,
    };
  }

  /**
   * Get cached risk score for a session or compute it if missing
   */
  static getOrCompute(sessionId, customDb = null) {
    const db = customDb || initDb();
    const existing = db.prepare(`SELECT * FROM integrity_risk_scores WHERE session_id = ?`).get(sessionId);
    if (existing) {
      const features = JSON.parse(existing.features_json || '{}');
      const contributions = {};
      for (const [key, weight] of Object.entries(INTEGRITY_RISK_CONFIG.weights)) {
        contributions[key] = Math.round((weight * (features[key] ?? 0)) * 100) / 100;
      }
      return {
        sessionId: existing.session_id,
        score: existing.score,
        band: existing.band,
        features,
        contributions,
        reasons: JSON.parse(existing.reasons_json || '[]'),
        modelVersion: existing.model_version,
        computedAt: existing.computed_at,
      };
    }
    return this.computeAndSave(sessionId, db);
  }
}
