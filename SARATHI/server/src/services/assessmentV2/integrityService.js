import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb } from '../../config/db.js';

// In-memory rate limiting map for event ingestion: sessionId -> timestamps[]
const rateLimits = new Map();

export class IntegrityService {
  /**
   * Record a client integrity indicator event.
   * Integrity events provide signals for review and NEVER alter technical scores or candidate_skills.
   */
  static recordEvent(sessionId, userId, { type, ts, meta = {} }) {
    const db = initDb();

    const session = db.prepare(`SELECT id, user_id, status FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress') {
      return { success: false, reason: 'Session is not active' };
    }

    // Rate limiting: max 60 events per minute per session
    const now = Date.now();
    const timestamps = (rateLimits.get(sessionId) || []).filter(t => now - t < 60000);
    if (timestamps.length >= 60) {
      return { success: false, reason: 'Rate limit exceeded' };
    }
    timestamps.push(now);
    rateLimits.set(sessionId, timestamps);

    const eventId = `ie-${uuidv4().slice(0, 12)}`;
    const eventTs = ts || new Date().toISOString();

    db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, sessionId, type, eventTs, JSON.stringify(meta));

    return { success: true, eventId };
  }

  /**
   * Record a batch of client integrity events with rate limiting
   */
  static recordBatch(sessionId, userId, events = []) {
    const db = initDb();

    const session = db.prepare(`SELECT id, user_id, status FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status !== 'in_progress' || !Array.isArray(events) || events.length === 0) {
      return { success: false, reason: 'Session not active or empty batch' };
    }

    const insertStmt = db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    const cappedEvents = events.slice(0, 50);
    for (const evt of cappedEvents) {
      if (!evt.type) continue;
      const eventId = `ie-${uuidv4().slice(0, 12)}`;
      const eventTs = evt.ts || new Date().toISOString();
      insertStmt.run(eventId, sessionId, evt.type, eventTs, JSON.stringify(evt.meta || {}));
      inserted++;
    }

    return { success: true, count: inserted };
  }

  /**
   * Compute integrity summary for a session
   */
  static getIntegritySummary(sessionId) {
    const db = initDb();
    const events = db.prepare(`
      SELECT type, ts, meta
      FROM integrity_events
      WHERE session_id = ?
      ORDER BY ts ASC
    `).all(sessionId);

    let awayCount = 0;
    let longestAwaySec = 0;
    let lastAwayTs = null;
    let offlineCount = 0;

    for (const evt of events) {
      const evtTime = new Date(evt.ts).getTime();

      if (evt.type === 'visibility_hidden' || evt.type === 'blur') {
        awayCount++;
        if (!lastAwayTs) {
          lastAwayTs = evtTime;
        }
      } else if (evt.type === 'visibility_visible' || evt.type === 'focus') {
        if (lastAwayTs) {
          const awaySec = Math.round((evtTime - lastAwayTs) / 1000);
          if (awaySec > longestAwaySec) longestAwaySec = awaySec;
          lastAwayTs = null;
        }
      } else if (evt.type === 'offline_start') {
        offlineCount++;
      }
    }

    const level = (awayCount > 5 || longestAwaySec > 60) ? 'notable' : 'none';

    return {
      eventCount: events.length,
      awayCount,
      longestAwaySec,
      offlinePeriods: offlineCount,
      level,
    };
  }

  /**
   * Get raw events for reviewer timeline
   */
  static getEventsForSession(sessionId) {
    const db = initDb();
    return db.prepare(`
      SELECT id, type, ts, meta
      FROM integrity_events
      WHERE session_id = ?
      ORDER BY ts ASC
    `).all(sessionId);
  }

  /**
   * Retention cleanup job: deletes detailed events older than retentionDays
   */
  static cleanupOldEvents(retentionDays = 30) {
    const db = initDb();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
      DELETE FROM integrity_events
      WHERE ts < ?
        AND session_id IN (SELECT id FROM assessment_sessions WHERE status IN ('graded', 'expired'))
    `).run(cutoffDate);

    return { deletedCount: result.changes };
  }
}
