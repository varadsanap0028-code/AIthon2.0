import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb } from '../../config/db.js';
import { assessmentV2 } from '../../config/index.js';
import { QuestionBankService } from './questionBankService.js';

export class SessionService {
  /**
   * Create a new assessment session
   */
  static createSession({ userId, mode = 'practice', domainId, role = 'Software Engineer', scope = 'full', consent = {}, accommodation = {} }) {
    const db = initDb();

    if (mode === 'secure' && (!consent || !consent.agreed)) {
      throw new Error('Consent is required to start a Secure assessment session.');
    }

    db.exec('BEGIN IMMEDIATE;');
    try {
      // Check if an active non-expired session already exists for this candidate
      const existing = SessionService.getActiveSession(userId, domainId);
      if (existing) {
        db.exec('COMMIT;');
        return {
          ...existing,
          id: existing.id || existing.sessionId,
          sessionId: existing.sessionId || existing.id,
          isResumed: true,
        };
      }

      // Retrieve question IDs from previous sessions to enforce overlap avoidance
      const previousSessions = db.prepare(`
        SELECT question_ids FROM assessment_sessions
        WHERE user_id = ? AND domain_id = ?
        ORDER BY started_at DESC LIMIT 3
      `).all(userId, domainId);

      const previousQuestionIds = new Set();
      for (const ps of previousSessions) {
        try {
          const ids = JSON.parse(ps.question_ids || '[]');
          ids.forEach(id => previousQuestionIds.add(id));
        } catch {}
      }

      const seed = Date.now() + Math.floor(Math.random() * 100000);
      const clientQuestions = QuestionBankService.sampleQuestionsForSession({
        domainId,
        roleTitle: role,
        scope,
        seed,
        previousQuestionIds: Array.from(previousQuestionIds),
      });
      const questionIds = clientQuestions.map(q => q.id);

      // Calculate time limit
      const baseMinutes = scope === 'quiz_only' ? 20 : scope === 'practical_only' ? 35 : 45;
      const multiplier = Number(accommodation?.extendedTimeMultiplier || (accommodation?.extendedTime ? 1.5 : 1.0));
      const totalMinutes = Math.round(baseMinutes * multiplier);

      const now = new Date();
      const expires = new Date(now.getTime() + totalMinutes * 60 * 1000);

      const sessionId = `sess-${Date.now()}-${uuidv4().slice(0, 8)}`;
      const startedAt = now.toISOString();
      const expiresAt = expires.toISOString();
      const deadlineAt = expiresAt;

      const rules = {
        timeLimitMinutes: totalMinutes,
        pasteAllowed: mode === 'practice' || Boolean(accommodation?.disabledRestrictions || accommodation?.screenReaderMode),
        blurTracking: mode === 'secure',
        cameraRequired: mode === 'secure' && assessmentV2.cameraEnabled,
        accommodationsAllowed: true,
      };

      const sessionData = {
        consent,
        rules,
        draftAnswers: {},
        freshnessAudit: clientQuestions.audit || null,
        questionVersions: clientQuestions.audit?.questionVersions || {},
      };

      db.prepare(`
        INSERT INTO assessment_sessions (
          id, user_id, mode, domain_id, role, question_ids, bank_version,
          status, started_at, expires_at, deadline_at, save_version,
          consent_json, accommodation_json, engine_version
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 'in_progress', ?, ?, ?, 1, ?, ?, 'v2')
      `).run(
        sessionId,
        userId,
        mode,
        domainId,
        role,
        JSON.stringify(questionIds),
        startedAt,
        expiresAt,
        deadlineAt,
        JSON.stringify(sessionData),
        JSON.stringify(accommodation)
      );

      db.exec('COMMIT;');

      return {
        id: sessionId,
        sessionId,
        mode,
        domainId,
        role,
        status: 'in_progress',
        startedAt,
        expiresAt,
        deadlineAt,
        saveVersion: 1,
        questions: clientQuestions,
        rules,
        accommodation,
      };
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch {}
      throw err;
    }
  }

  /**
   * Resume an existing session by ID
   */
  static getSession(sessionId, userId) {
    const db = initDb();
    const session = db.prepare(`
      SELECT * FROM assessment_sessions WHERE id = ?
    `).get(sessionId);

    if (!session) {
      const err = new Error('Assessment session not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (session.user_id !== userId) {
      const err = new Error('Unauthorized to access this assessment session.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Check expiration
    const now = new Date();
    const expires = new Date(session.deadline_at || session.expires_at);
    if (session.status === 'in_progress' && now > expires) {
      db.prepare(`UPDATE assessment_sessions SET status = 'expired' WHERE id = ?`).run(sessionId);
      session.status = 'expired';
    }

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const filteredQuestions = QuestionBankService.getQuestionsForClient(questionIds);

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    let accommodation = {};
    try { accommodation = JSON.parse(session.accommodation_json || '{}'); } catch {}

    // Fetch latest code snapshots
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(sessionId);

    const latestSnapshots = {};
    for (const s of snapshots) {
      if (!latestSnapshots[s.question_id]) {
        latestSnapshots[s.question_id] = s;
      }
    }

    const isAbandoned = Boolean(sessionData.abandoned);
    const resolvedStatus = isAbandoned ? 'abandoned' : session.status;

    return {
      id: session.id,
      sessionId: session.id,
      mode: session.mode,
      domainId: session.domain_id,
      role: session.role,
      status: resolvedStatus,
      isAbandoned,
      startedAt: session.started_at,
      expiresAt: session.expires_at,
      deadlineAt: session.deadline_at || session.expires_at,
      saveVersion: session.save_version || 1,
      questions: filteredQuestions,
      rules: sessionData.rules || {
        timeLimitMinutes: 45,
        pasteAllowed: session.mode === 'practice',
        blurTracking: session.mode === 'secure',
        cameraRequired: false,
        accommodationsAllowed: true,
      },
      accommodation,
      draftAnswers: sessionData.draftAnswers || {},
      snapshots: latestSnapshots,
    };
  }

  /**
   * Lightweight session state retrieval for authoritative sync and resume
   */
  static getSessionState(sessionId, userId) {
    const db = initDb();
    const session = db.prepare(`
      SELECT id, user_id, mode, status, started_at, expires_at, deadline_at, save_version, consent_json
      FROM assessment_sessions WHERE id = ?
    `).get(sessionId);

    if (!session) {
      const err = new Error('Assessment session not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (session.user_id !== userId) {
      const err = new Error('Unauthorized to access this assessment session.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const deadlineStr = session.deadline_at || session.expires_at;
    const deadlineMs = new Date(deadlineStr).getTime();
    const now = new Date();
    if (session.status === 'in_progress' && now.getTime() > deadlineMs) {
      db.prepare(`UPDATE assessment_sessions SET status = 'expired' WHERE id = ?`).run(sessionId);
      session.status = 'expired';
    }

    const remainingSeconds = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    const isAbandoned = Boolean(sessionData.abandoned);
    const resolvedStatus = isAbandoned ? 'abandoned' : session.status;

    // Fetch latest code snapshots
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(sessionId);

    const latestSnapshots = {};
    for (const s of snapshots) {
      if (!latestSnapshots[s.question_id]) {
        latestSnapshots[s.question_id] = s;
      }
    }

    return {
      sessionId: session.id,
      status: resolvedStatus,
      isAbandoned,
      startedAt: session.started_at,
      deadlineAt: deadlineStr,
      remainingSeconds,
      saveVersion: session.save_version || 1,
      draftAnswers: sessionData.draftAnswers || {},
      snapshots: latestSnapshots,
      lastSavedAt: new Date().toISOString(),
    };
  }

  /**
   * Autosave answers (MCQ choices and explanation text) with optimistic version control
   */
  static saveAnswers(sessionId, userId, answers, clientSaveVersion = undefined) {
    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress') {
      const err = new Error(`Cannot update answers for session in status: ${session.status}`);
      err.code = 'INVALID_STATE';
      throw err;
    }

    const currentVersion = Number(session.save_version || 1);

    // Version conflict detection for concurrent/stale tab edits
    if (clientSaveVersion !== undefined && Number(clientSaveVersion) < currentVersion) {
      const err = new Error(`Save conflict: client saveVersion ${clientSaveVersion} is behind server version ${currentVersion}.`);
      err.code = 'VERSION_CONFLICT';
      throw err;
    }

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    sessionData.draftAnswers = {
      ...(sessionData.draftAnswers || {}),
      ...answers,
    };

    const nextVersion = currentVersion + 1;

    db.prepare(`
      UPDATE assessment_sessions
      SET consent_json = ?, save_version = ?
      WHERE id = ?
    `).run(JSON.stringify(sessionData), nextVersion, sessionId);

    return { success: true, savedAt: new Date().toISOString(), saveVersion: nextVersion };
  }

  /**
   * Save a code snapshot
   */
  static saveSnapshot(sessionId, userId, { questionId, code, language = 'javascript', reason = 'autosave' }) {
    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress') {
      const err = new Error('Session is no longer active.');
      err.code = 'INVALID_STATE';
      throw err;
    }

    // Size limit check (20 KB max)
    const codeBytes = Buffer.byteLength(code || '', 'utf8');
    if (codeBytes > assessmentV2.codeMaxBytes) {
      const err = new Error(`Code size (${codeBytes} bytes) exceeds limit of ${assessmentV2.codeMaxBytes} bytes.`);
      err.code = 'PAYLOAD_TOO_LARGE';
      throw err;
    }

    const snapshotId = `snap-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(snapshotId, sessionId, questionId, code, language, reason, now);

    return { success: true, snapshotId, timestamp: now };
  }

  /**
   * Find an active in-progress, non-expired session for a user
   */
  static getActiveSession(userId, domainId = null) {
    const db = initDb();
    let query = `
      SELECT id, status, deadline_at, expires_at, started_at, domain_id, mode
      FROM assessment_sessions
      WHERE user_id = ? AND status = 'in_progress'
    `;
    const params = [userId];

    if (domainId) {
      query += ` AND domain_id = ?`;
      params.push(domainId);
    }

    query += ` ORDER BY started_at DESC`;

    const sessions = db.prepare(query).all(...params);
    const now = new Date();

    for (const s of sessions) {
      const expires = new Date(s.deadline_at || s.expires_at);
      if (now > expires) {
        db.prepare(`UPDATE assessment_sessions SET status = 'expired' WHERE id = ?`).run(s.id);
        continue;
      }

      return SessionService.getSession(s.id, userId);
    }

    return null;
  }

  /**
   * Abandon an active session explicitly
   */
  static abandonSession(sessionId, userId) {
    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session) {
      const err = new Error('Assessment session not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (session.user_id !== userId) {
      const err = new Error('Unauthorized to abandon this assessment session.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress') {
      const err = new Error(`Cannot abandon a session with status: ${session.status}`);
      err.code = 'INVALID_STATE';
      throw err;
    }

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}
    sessionData.abandoned = true;
    sessionData.abandonedAt = new Date().toISOString();

    db.prepare(`
      UPDATE assessment_sessions
      SET status = 'expired', consent_json = ?
      WHERE id = ?
    `).run(JSON.stringify(sessionData), sessionId);

    return { success: true, sessionId, status: 'abandoned' };
  }
}

