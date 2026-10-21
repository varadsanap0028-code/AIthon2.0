import { initDb } from '../../config/db.js';

// In-memory 30s cache map: range -> { timestamp, data }
const cache = new Map();
const CACHE_TTL_MS = 30 * 1000;

/**
 * Calculates percentage delta between current and previous values.
 * Returns null if previous period value is 0 (avoids division by zero).
 *
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}
 */
export function calculateDelta(current, previous) {
  if (previous === 0 || previous === null || previous === undefined) {
    return null;
  }
  const pct = ((current - previous) / previous) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Generates an array of YYYY-MM-DD string dates between startDate and endDate inclusive.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string[]}
 */
export function generateDateSequence(startDate, endDate) {
  const dates = [];
  const curr = new Date(startDate);
  curr.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return dates;
}

export const adminAnalyticsService = {
  /**
   * Clears the in-memory analytics cache (useful in tests).
   */
  clearCache() {
    cache.clear();
  },

  /**
   * Retrieves high-level platform overview metrics, time series, and attention items.
   *
   * @param {object} options
   * @param {'7d'|'30d'|'90d'} [options.range='7d']
   * @param {boolean} [options.fresh=false]
   * @returns {object} Platform analytics overview payload
   */
  getOverviewMetrics({ range = '7d', fresh = false } = {}) {
    const validRange = ['7d', '30d', '90d'].includes(range) ? range : '7d';
    const nowMs = Date.now();

    if (!fresh && cache.has(validRange)) {
      const cached = cache.get(validRange);
      if (nowMs - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const days = validRange === '90d' ? 90 : validRange === '30d' ? 30 : 7;
    const now = new Date();
    const currentEnd = now.toISOString();

    const currentStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const currentStart = currentStartDate.toISOString();

    const prevStartDate = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
    const prevStart = prevStartDate.toISOString();
    const prevEnd = currentStart;

    const db = initDb();

    // ==========================================
    // 1. KPIS (Current vs Previous)
    // ==========================================

    // Total Users
    const totalUsersRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL AND created_at <= ?;'
    ).get(currentEnd);
    const prevTotalUsersRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL AND created_at <= ?;'
    ).get(prevEnd);
    const totalUsers = totalUsersRow?.cnt || 0;
    const prevTotalUsers = prevTotalUsersRow?.cnt || 0;

    // New Users
    const newUsersRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ?;'
    ).get(currentStart, currentEnd);
    const prevNewUsersRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM users WHERE deleted_at IS NULL AND created_at >= ? AND created_at < ?;'
    ).get(prevStart, prevEnd);
    const newUsers = newUsersRow?.cnt || 0;
    const prevNewUsers = prevNewUsersRow?.cnt || 0;

    // Active Students (action in range: login, application, assessment)
    const activeStudentsRow = db.prepare(`
      SELECT COUNT(DISTINCT id) as cnt FROM (
        SELECT id FROM users WHERE role = 'candidate' AND last_login_at >= ?
        UNION
        SELECT candidate_id as id FROM applications WHERE applied_at >= ?
        UNION
        SELECT user_id as id FROM assessment_sessions WHERE started_at >= ?
      );
    `).get(currentStart, currentStart, currentStart);
    const prevActiveStudentsRow = db.prepare(`
      SELECT COUNT(DISTINCT id) as cnt FROM (
        SELECT id FROM users WHERE role = 'candidate' AND last_login_at >= ? AND last_login_at < ?
        UNION
        SELECT candidate_id as id FROM applications WHERE applied_at >= ? AND applied_at < ?
        UNION
        SELECT user_id as id FROM assessment_sessions WHERE started_at >= ? AND started_at < ?
      );
    `).get(prevStart, prevEnd, prevStart, prevEnd, prevStart, prevEnd);
    const activeStudents = activeStudentsRow?.cnt || 0;
    const prevActiveStudents = prevActiveStudentsRow?.cnt || 0;

    // Active Recruiters (login or job posted in range)
    const activeRecruitersRow = db.prepare(`
      SELECT COUNT(DISTINCT id) as cnt FROM (
        SELECT id FROM users WHERE role = 'recruiter' AND last_login_at >= ?
        UNION
        SELECT creator_id as id FROM jobs WHERE created_at >= ?
      );
    `).get(currentStart, currentStart);
    const prevActiveRecruitersRow = db.prepare(`
      SELECT COUNT(DISTINCT id) as cnt FROM (
        SELECT id FROM users WHERE role = 'recruiter' AND last_login_at >= ? AND last_login_at < ?
        UNION
        SELECT creator_id as id FROM jobs WHERE created_at >= ? AND created_at < ?
      );
    `).get(prevStart, prevEnd, prevStart, prevEnd);
    const activeRecruiters = activeRecruitersRow?.cnt || 0;
    const prevActiveRecruiters = prevActiveRecruitersRow?.cnt || 0;

    // Open Jobs
    const openJobsRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM jobs WHERE status = 'published' AND created_at <= ?;"
    ).get(currentEnd);
    const prevOpenJobsRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM jobs WHERE status = 'published' AND created_at <= ?;"
    ).get(prevEnd);
    const openJobs = openJobsRow?.cnt || 0;
    const prevOpenJobs = prevOpenJobsRow?.cnt || 0;

    // Applications submitted
    const appsRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM applications WHERE applied_at >= ? AND applied_at <= ?;'
    ).get(currentStart, currentEnd);
    const prevAppsRow = db.prepare(
      'SELECT COUNT(*) as cnt FROM applications WHERE applied_at >= ? AND applied_at < ?;'
    ).get(prevStart, prevEnd);
    const applications = appsRow?.cnt || 0;
    const prevApplications = prevAppsRow?.cnt || 0;

    // Tests Completed
    const testsRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM assessment_sessions
      WHERE (status = 'submitted' OR status = 'graded')
        AND (submitted_at >= ? OR started_at >= ?)
        AND (submitted_at <= ? OR started_at <= ?);
    `).get(currentStart, currentStart, currentEnd, currentEnd);
    const prevTestsRow = db.prepare(`
      SELECT COUNT(*) as cnt FROM assessment_sessions
      WHERE (status = 'submitted' OR status = 'graded')
        AND (submitted_at >= ? OR started_at >= ?)
        AND (submitted_at < ? OR started_at < ?);
    `).get(prevStart, prevStart, prevEnd, prevEnd);
    const testsCompleted = testsRow?.cnt || 0;
    const prevTestsCompleted = prevTestsRow?.cnt || 0;

    // Test Pass Rate (score >= 60)
    const passedTestsRow = db.prepare(`
      SELECT COUNT(*) as cnt 
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      WHERE (s.status = 'submitted' OR s.status = 'graded')
        AND (s.submitted_at >= ? OR s.started_at >= ?)
        AND (s.submitted_at <= ? OR s.started_at <= ?)
        AND sc.technical_score >= 60;
    `).get(currentStart, currentStart, currentEnd, currentEnd);
    const prevPassedTestsRow = db.prepare(`
      SELECT COUNT(*) as cnt 
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      WHERE (s.status = 'submitted' OR s.status = 'graded')
        AND (s.submitted_at >= ? OR s.started_at >= ?)
        AND (s.submitted_at < ? OR s.started_at < ?)
        AND sc.technical_score >= 60;
    `).get(prevStart, prevStart, prevEnd, prevEnd);
    const passedTests = passedTestsRow?.cnt || 0;
    const prevPassedTests = prevPassedTestsRow?.cnt || 0;

    const testPassRate = testsCompleted > 0 ? Math.round((passedTests / testsCompleted) * 1000) / 10 : 0;
    const prevTestPassRate = prevTestsCompleted > 0 ? Math.round((prevPassedTests / prevTestsCompleted) * 1000) / 10 : 0;

    // Pending Approvals
    let pendingApprovals = 0;
    let prevPendingApprovals = 0;
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='business_verifications';").get();
      if (tableCheck) {
        const curRow = db.prepare("SELECT COUNT(*) as cnt FROM business_verifications WHERE status = 'pending';").get();
        pendingApprovals = curRow?.cnt || 0;
      }
    } catch {}

    // Flagged Sessions
    let flaggedSessions = 0;
    let prevFlaggedSessions = 0;
    try {
      const row = db.prepare(`
        SELECT COUNT(DISTINCT s.id) as cnt
        FROM assessment_sessions s
        LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
        WHERE s.mode = 'secure'
          AND s.started_at >= ?
          AND (
            ir.decision IN ('needs_followup', 'concern_confirmed')
            OR (ir.id IS NULL AND EXISTS (
              SELECT 1 FROM integrity_events ie 
              WHERE ie.session_id = s.id 
                AND ie.type IN ('fullscreen_exit', 'paste_blocked', 'camera_unauthorized')
            ))
          );
      `).get(currentStart);
      const pRow = db.prepare(`
        SELECT COUNT(DISTINCT s.id) as cnt
        FROM assessment_sessions s
        LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
        WHERE s.mode = 'secure'
          AND s.started_at >= ? AND s.started_at < ?
          AND (
            ir.decision IN ('needs_followup', 'concern_confirmed')
            OR (ir.id IS NULL AND EXISTS (
              SELECT 1 FROM integrity_events ie 
              WHERE ie.session_id = s.id 
                AND ie.type IN ('fullscreen_exit', 'paste_blocked', 'camera_unauthorized')
            ))
          );
      `).get(prevStart, prevEnd);
      flaggedSessions = row?.cnt || 0;
      prevFlaggedSessions = pRow?.cnt || 0;
    } catch {}

    const kpis = {
      totalUsers: {
        value: totalUsers,
        previous: prevTotalUsers,
        deltaPct: calculateDelta(totalUsers, prevTotalUsers),
      },
      newUsers: {
        value: newUsers,
        previous: prevNewUsers,
        deltaPct: calculateDelta(newUsers, prevNewUsers),
      },
      activeStudents: {
        value: activeStudents,
        previous: prevActiveStudents,
        deltaPct: calculateDelta(activeStudents, prevActiveStudents),
      },
      activeRecruiters: {
        value: activeRecruiters,
        previous: prevActiveRecruiters,
        deltaPct: calculateDelta(activeRecruiters, prevActiveRecruiters),
      },
      openJobs: {
        value: openJobs,
        previous: prevOpenJobs,
        deltaPct: calculateDelta(openJobs, prevOpenJobs),
      },
      applications: {
        value: applications,
        previous: prevApplications,
        deltaPct: calculateDelta(applications, prevApplications),
      },
      testsCompleted: {
        value: testsCompleted,
        previous: prevTestsCompleted,
        deltaPct: calculateDelta(testsCompleted, prevTestsCompleted),
      },
      testPassRate: {
        value: testPassRate,
        previous: prevTestPassRate,
        deltaPct: calculateDelta(testPassRate, prevTestPassRate),
      },
      pendingApprovals: {
        value: pendingApprovals,
        previous: prevPendingApprovals,
        deltaPct: calculateDelta(pendingApprovals, prevPendingApprovals),
      },
      flaggedSessions: {
        value: flaggedSessions,
        previous: prevFlaggedSessions,
        deltaPct: calculateDelta(flaggedSessions, prevFlaggedSessions),
      },
    };

    // ==========================================
    // 2. TIME SERIES (Zero-filled per date)
    // ==========================================
    const dateSequence = generateDateSequence(currentStartDate, now);

    // A. Signups By Role
    const signupsRows = db.prepare(`
      SELECT substr(created_at, 1, 10) as date, role, COUNT(*) as count
      FROM users
      WHERE deleted_at IS NULL AND created_at >= ? AND created_at <= ?
      GROUP BY substr(created_at, 1, 10), role;
    `).all(currentStart, currentEnd);

    const signupsMap = new Map();
    for (const r of signupsRows) {
      if (!signupsMap.has(r.date)) {
        signupsMap.set(r.date, { student: 0, recruiter: 0, college: 0, reviewer: 0 });
      }
      const entry = signupsMap.get(r.date);
      if (r.role === 'candidate' || r.role === 'student') entry.student += r.count;
      else if (r.role === 'recruiter') entry.recruiter += r.count;
      else if (r.role === 'college') entry.college += r.count;
      else if (r.role === 'assessor' || r.role === 'reviewer') entry.reviewer += r.count;
    }

    const signupsByRole = dateSequence.map((d) => {
      const counts = signupsMap.get(d) || { student: 0, recruiter: 0, college: 0, reviewer: 0 };
      return {
        date: d,
        student: counts.student,
        recruiter: counts.recruiter,
        college: counts.college,
        reviewer: counts.reviewer,
      };
    });

    // B. Applications Per Day
    const appsPerDayRows = db.prepare(`
      SELECT substr(applied_at, 1, 10) as date, COUNT(*) as count
      FROM applications
      WHERE applied_at >= ? AND applied_at <= ?
      GROUP BY substr(applied_at, 1, 10);
    `).all(currentStart, currentEnd);

    const appsMap = new Map(appsPerDayRows.map((r) => [r.date, r.count]));
    const applicationsPerDay = dateSequence.map((d) => ({
      date: d,
      count: appsMap.get(d) || 0,
    }));

    // C. Tests (Started vs Completed vs Passed)
    const testsStartedRows = db.prepare(`
      SELECT substr(started_at, 1, 10) as date, COUNT(*) as count
      FROM assessment_sessions
      WHERE started_at >= ? AND started_at <= ?
      GROUP BY substr(started_at, 1, 10);
    `).all(currentStart, currentEnd);

    const testsCompletedRows = db.prepare(`
      SELECT substr(COALESCE(submitted_at, started_at), 1, 10) as date, COUNT(*) as count
      FROM assessment_sessions
      WHERE (status = 'submitted' OR status = 'graded')
        AND (submitted_at >= ? OR started_at >= ?)
        AND (submitted_at <= ? OR started_at <= ?)
      GROUP BY substr(COALESCE(submitted_at, started_at), 1, 10);
    `).all(currentStart, currentStart, currentEnd, currentEnd);

    const testsPassedRows = db.prepare(`
      SELECT substr(COALESCE(s.submitted_at, s.started_at), 1, 10) as date, COUNT(*) as count
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      WHERE (s.status = 'submitted' OR s.status = 'graded')
        AND (s.submitted_at >= ? OR s.started_at >= ?)
        AND (s.submitted_at <= ? OR s.started_at <= ?)
        AND sc.technical_score >= 60
      GROUP BY substr(COALESCE(s.submitted_at, s.started_at), 1, 10);
    `).all(currentStart, currentStart, currentEnd, currentEnd);

    const startedMap = new Map(testsStartedRows.map((r) => [r.date, r.count]));
    const completedMap = new Map(testsCompletedRows.map((r) => [r.date, r.count]));
    const passedMap = new Map(testsPassedRows.map((r) => [r.date, r.count]));

    const testsSeries = dateSequence.map((d) => ({
      date: d,
      started: startedMap.get(d) || 0,
      completed: completedMap.get(d) || 0,
      passed: passedMap.get(d) || 0,
    }));

    // ==========================================
    // 3. ROLE MIX
    // ==========================================
    const roleRows = db.prepare(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE deleted_at IS NULL
      GROUP BY role
      ORDER BY count DESC;
    `).all();

    const roleMix = roleRows.map((r) => ({
      role: r.role === 'candidate' ? 'Student' : r.role === 'platform_admin' ? 'Platform Admin' : r.role.charAt(0).toUpperCase() + r.role.slice(1),
      count: r.count,
    }));

    // ==========================================
    // 4. FUNNEL (Candidate Conversion Steps)
    // ==========================================
    const signedUpCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'candidate' AND deleted_at IS NULL;").get()?.cnt || 0;
    const profileCompletedCount = db.prepare(`
      SELECT COUNT(DISTINCT id) as cnt FROM candidate_profiles
      WHERE (headline IS NOT NULL AND headline != '')
         OR (bio IS NOT NULL AND bio != '')
         OR (github_url IS NOT NULL AND github_url != '');
    `).get()?.cnt || 0;
    const testStartedCount = db.prepare("SELECT COUNT(DISTINCT user_id) as cnt FROM assessment_sessions;").get()?.cnt || 0;
    const testPassedCount = db.prepare(`
      SELECT COUNT(DISTINCT s.user_id) as cnt 
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      WHERE sc.technical_score >= 60;
    `).get()?.cnt || 0;
    const appliedCount = db.prepare("SELECT COUNT(DISTINCT candidate_id) as cnt FROM applications;").get()?.cnt || 0;

    const funnel = [
      { step: 'Signed up', count: signedUpCount },
      { step: 'Profile completed', count: Math.min(signedUpCount, profileCompletedCount) },
      { step: 'Test started', count: Math.min(signedUpCount, testStartedCount) },
      { step: 'Test passed', count: Math.min(testStartedCount, testPassedCount) },
      { step: 'Applied', count: Math.min(signedUpCount, appliedCount) },
    ];

    // ==========================================
    // 5. SCORE DISTRIBUTION (10 Buckets: 0-10 .. 90-100)
    // ==========================================
    const scoresRows = db.prepare(`
      SELECT technical_score as score
      FROM session_scores;
    `).all();

    const buckets = [
      '0-10', '11-20', '21-30', '31-40', '41-50',
      '51-60', '61-70', '71-80', '81-90', '91-100',
    ];
    const bucketCounts = Object.fromEntries(buckets.map((b) => [b, 0]));

    for (const row of scoresRows) {
      const s = Math.max(0, Math.min(100, Math.round(row.score)));
      if (s <= 10) bucketCounts['0-10']++;
      else if (s <= 20) bucketCounts['11-20']++;
      else if (s <= 30) bucketCounts['21-30']++;
      else if (s <= 40) bucketCounts['31-40']++;
      else if (s <= 50) bucketCounts['41-50']++;
      else if (s <= 60) bucketCounts['51-60']++;
      else if (s <= 70) bucketCounts['61-70']++;
      else if (s <= 80) bucketCounts['71-80']++;
      else if (s <= 90) bucketCounts['81-90']++;
      else bucketCounts['90-100']++;
    }

    const scoreDistribution = buckets.map((bucket) => ({
      bucket,
      count: bucketCounts[bucket],
    }));

    // ==========================================
    // 6. TOP SKILLS TESTED (Top 8 by attempts)
    // ==========================================
    // Query demonstrated skills from candidate_skills or session question mappings
    const skillsRows = db.prepare(`
      SELECT s.name as skill, COUNT(*) as attempts, AVG(cs.proficiency * 20) as avgScore
      FROM candidate_skills cs
      JOIN skills s ON s.id = cs.skill_id
      GROUP BY cs.skill_id
      ORDER BY attempts DESC
      LIMIT 8;
    `).all();

    const topSkillsTested = skillsRows.map((r) => ({
      skill: r.skill,
      attempts: r.attempts,
      avgScore: Math.round((r.avgScore || 0) * 10) / 10,
    }));

    // ==========================================
    // 7. ATTENTION ITEMS
    // ==========================================
    const attention = [];
    const fortyEightHoursAgo = new Date(nowMs - 48 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

    // A. Recruiter approvals waiting > 48h
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='business_verifications';").get();
      if (tableCheck) {
        const row = db.prepare(`
          SELECT COUNT(*) as cnt 
          FROM business_verifications 
          WHERE status = 'pending' AND created_at < ?;
        `).get(fortyEightHoursAgo);
        const cnt = row?.cnt || 0;
        if (cnt > 0) {
          attention.push({
            id: 'attn-approvals-48h',
            severity: 'warning',
            title: 'Recruiter approvals waiting > 48h',
            count: cnt,
            href: '/admin/approvals?status=pending',
          });
        }
      }
    } catch {}

    // B. Flagged sessions unreviewed > 24h
    try {
      const row = db.prepare(`
        SELECT COUNT(DISTINCT s.id) as cnt
        FROM assessment_sessions s
        LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
        WHERE s.mode = 'secure'
          AND s.started_at < ?
          AND ir.id IS NULL
          AND EXISTS (
            SELECT 1 FROM integrity_events ie 
            WHERE ie.session_id = s.id 
              AND ie.type IN ('fullscreen_exit', 'paste_blocked', 'camera_unauthorized')
          );
      `).get(twentyFourHoursAgo);
      const cnt = row?.cnt || 0;
      if (cnt > 0) {
        attention.push({
          id: 'attn-flagged-24h',
          severity: 'danger',
          title: 'Flagged sessions unreviewed > 24h',
          count: cnt,
          href: '/admin/integrity?status=pending_review',
        });
      }
    } catch {}

    const result = {
      range: validRange,
      generatedAt: currentEnd,
      kpis,
      series: {
        signupsByRole,
        applicationsPerDay,
        tests: testsSeries,
      },
      roleMix,
      funnel,
      scoreDistribution,
      topSkillsTested,
      attention,
    };

    // Cache result
    cache.set(validRange, { timestamp: nowMs, data: result });

    return result;
  },
};

export default adminAnalyticsService;
