/**
 * SARATHI Admin Portal — Platform Analytics & Cross-Domain Insights Service
 * PRD Phase 8
 * Pure explainable statistics, zero external ML dependencies.
 */

import { initDb } from '../../config/db.js';
import {
  mean,
  median,
  mad,
  movingAverage,
  linearRegression,
  predictionInterval,
  modifiedZScore,
  pearson,
  wilsonInterval,
  clamp,
} from '../stats/statsService.js';
import { RECRUITER_TRUST_CONFIG } from '../../config/recruiterTrustConfig.js';

// In-memory 60s cache
const CACHE_TTL_MS = 60 * 1000;
const insightsCache = new Map();

function getCached(key) {
  const entry = insightsCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCached(key, data) {
  insightsCache.set(key, { data, timestamp: Date.now() });
}

export class AdminInsightsService {
  constructor(db = null) {
    this.db = db || initDb();
  }

  /**
   * 1. Forecast Metric (7-day MA + OLS + 95% Prediction Interval)
   */
  async getForecast({ metric = 'applications', horizon = 14 }) {
    const validMetrics = ['signups', 'applications', 'tests'];
    const chosenMetric = validMetrics.includes(metric) ? metric : 'applications';
    const horizonDays = Math.min(Math.max(parseInt(horizon, 10) || 14, 1), 60);

    const cacheKey = `forecast_${chosenMetric}_${horizonDays}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Query daily counts over last 90 days
    let query = '';
    if (chosenMetric === 'signups') {
      query = `
        SELECT substr(created_at, 1, 10) as day, count(*) as count
        FROM users
        WHERE created_at >= date('now', '-90 days')
        GROUP BY day
        ORDER BY day ASC
      `;
    } else if (chosenMetric === 'applications') {
      query = `
        SELECT substr(applied_at, 1, 10) as day, count(*) as count
        FROM applications
        WHERE applied_at >= date('now', '-90 days')
        GROUP BY day
        ORDER BY day ASC
      `;
    } else if (chosenMetric === 'tests') {
      query = `
        SELECT substr(started_at, 1, 10) as day, count(*) as count
        FROM assessment_sessions
        WHERE started_at >= date('now', '-90 days')
        GROUP BY day
        ORDER BY day ASC
      `;
    }

    const rows = this.db.prepare(query).all();

    // Map into daily series
    const dayMap = new Map();
    rows.forEach((r) => dayMap.set(r.day, r.count));

    // Build contiguous 90-day series
    const daysCount = 90;
    const history = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dayStr = d.toISOString().slice(0, 10);
      history.push({
        date: dayStr,
        value: dayMap.get(dayStr) || 0,
      });
    }

    const totalActiveDays = history.filter((h) => h.value > 0).length;
    if (totalActiveDays < 5) {
      const result = {
        insufficientData: true,
        metric: chosenMetric,
        horizon: horizonDays,
        message: 'Insufficient historical data (fewer than 5 active data points in the last 90 days).',
        history,
        forecast: [],
        model: null,
        confidence: 'low',
      };
      setCached(cacheKey, result);
      return result;
    }

    const rawValues = history.map((h) => h.value);
    const smoothed = movingAverage(rawValues, 7);

    // OLS on smoothed series
    const xs = [];
    const ys = [];
    for (let i = 0; i < smoothed.length; i++) {
      if (smoothed[i] !== null) {
        xs.push(i);
        ys.push(smoothed[i]);
      }
    }

    const model = linearRegression(xs, ys);
    if (!model) {
      const result = {
        insufficientData: true,
        metric: chosenMetric,
        horizon: horizonDays,
        message: 'Unable to calibrate regression model on historical series.',
        history,
        forecast: [],
        model: null,
        confidence: 'low',
      };
      setCached(cacheKey, result);
      return result;
    }

    // Fitted history
    const fitted = history.map((h, idx) => {
      const yHat = model.intercept + model.slope * idx;
      return {
        date: h.date,
        actual: h.value,
        smoothed: smoothed[idx] !== null ? Math.round(smoothed[idx] * 10) / 10 : null,
        fitted: Math.max(0, Math.round(yHat * 10) / 10),
      };
    });

    // Forecast series
    const forecast = [];
    const lastDate = new Date(history[history.length - 1].date);

    for (let step = 1; step <= horizonDays; step++) {
      const futureDate = new Date(lastDate.getTime() + step * 86400000);
      const xIdx = history.length - 1 + step;
      const pred = predictionInterval(xIdx, model);

      forecast.push({
        date: futureDate.toISOString().slice(0, 10),
        value: Math.max(0, Math.round(pred.fitted * 10) / 10),
        lower: Math.max(0, Math.round(pred.lower * 10) / 10),
        upper: Math.max(0, Math.round(pred.upper * 10) / 10),
      });
    }

    const confidence = model.r2 < 0.2 || model.n < 30 ? 'low' : 'high';

    const result = {
      insufficientData: false,
      metric: chosenMetric,
      horizon: horizonDays,
      history,
      fitted,
      forecast,
      model: {
        slope: Math.round(model.slope * 1000) / 1000,
        intercept: Math.round(model.intercept * 10) / 10,
        r2: Math.round(model.r2 * 1000) / 1000,
        residualStd: Math.round(model.residualStd * 100) / 100,
        n: model.n,
      },
      confidence,
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 2. Anomalies Detection (Trailing 28d Modified Z-Score)
   */
  async getAnomalies({ days = 60 }) {
    const daysCount = Math.min(Math.max(parseInt(days, 10) || 60, 30), 120);
    const cacheKey = `anomalies_${daysCount}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const startDate = new Date(now.getTime() - (daysCount + 28) * 86400000).toISOString().slice(0, 10);

    const metricsQueries = {
      signups: `SELECT substr(created_at, 1, 10) as day, count(*) as count FROM users WHERE created_at >= ? GROUP BY day`,
      applications: `SELECT substr(applied_at, 1, 10) as day, count(*) as count FROM applications WHERE applied_at >= ? GROUP BY day`,
      tests_started: `SELECT substr(started_at, 1, 10) as day, count(*) as count FROM assessment_sessions WHERE started_at >= ? GROUP BY day`,
      avg_test_score: `
        SELECT substr(s.started_at, 1, 10) as day, avg((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) as count
        FROM assessment_sessions s
        JOIN session_scores sc ON s.id = sc.session_id
        WHERE s.started_at >= ?
        GROUP BY day
      `,
      approval_submissions: `SELECT substr(submitted_at, 1, 10) as day, count(*) as count FROM business_verifications WHERE submitted_at >= ? GROUP BY day`,
      integrity_flags: `
        SELECT substr(s.started_at, 1, 10) as day, count(*) as count
        FROM assessment_sessions s
        JOIN integrity_risk_scores irs ON s.id = irs.session_id
        WHERE s.started_at >= ? AND irs.score >= 65
        GROUP BY day
      `,
    };

    const investigateUrls = {
      signups: '/admin/users',
      applications: '/admin/insights',
      tests_started: '/admin/integrity',
      avg_test_score: '/admin/integrity',
      approval_submissions: '/admin/approvals',
      integrity_flags: '/admin/integrity',
    };

    const flagged = [];
    const series = {};

    for (const [metricKey, query] of Object.entries(metricsQueries)) {
      let rows = [];
      try {
        rows = this.db.prepare(query).all(startDate);
      } catch {
        rows = [];
      }

      const rowMap = new Map();
      rows.forEach((r) => rowMap.set(r.day, r.count));

      // Build daily sequence
      const fullSeries = [];
      const totalDays = daysCount + 28;
      for (let i = totalDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dayStr = d.toISOString().slice(0, 10);
        fullSeries.push({
          date: dayStr,
          value: rowMap.get(dayStr) || 0,
        });
      }

      // Compute modified z-score for the target evaluation window
      const metricPoints = [];
      for (let i = 28; i < fullSeries.length; i++) {
        const cur = fullSeries[i];
        const trailing28 = fullSeries.slice(i - 28, i).map((p) => p.value);
        const med = median(trailing28) ?? 0;
        const madVal = mad(trailing28) ?? 0;
        const mz = modifiedZScore(cur.value, med, madVal);

        const isAnomaly = Math.abs(mz) > 3.5;
        if (isAnomaly) {
          flagged.push({
            date: cur.date,
            metric: metricKey,
            value: Math.round(cur.value * 10) / 10,
            expected: Math.round(med * 10) / 10,
            mz: Math.round(mz * 10) / 10,
            direction: mz > 0 ? 'spike' : 'drop',
            investigateUrl: investigateUrls[metricKey],
          });
        }

        metricPoints.push({
          date: cur.date,
          value: Math.round(cur.value * 10) / 10,
          expected: Math.round(med * 10) / 10,
          mz: Math.round(mz * 10) / 10,
          isAnomaly,
        });
      }

      series[metricKey] = metricPoints;
    }

    flagged.sort((a, b) => b.date.localeCompare(a.date));

    const result = {
      days: daysCount,
      flaggedCount: flagged.length,
      flagged,
      series,
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 3. Recruiter Trust Score (0-100)
   */
  async getRecruiterTrust({ orgId = null } = {}) {
    const cacheKey = `recruiter_trust_${orgId || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    let orgsQuery = `
      SELECT o.id, o.name, o.verification_status, o.created_at,
             bv.tax_identifier, bv.document_type,
             (SELECT count(*) FROM jobs j WHERE j.org_id = o.id AND j.deleted_at IS NULL) as job_count,
             (SELECT count(*) FROM jobs j WHERE j.org_id = o.id AND j.deleted_at IS NULL AND length(j.description) >= 100) as complete_job_count,
             (SELECT count(*) FROM applications a WHERE a.org_id = o.id) as app_count,
             (SELECT count(*) FROM applications a WHERE a.org_id = o.id AND a.stage != 'new_applicant') as advanced_app_count,
             (SELECT count(*) FROM applications a WHERE a.org_id = o.id AND a.stage = 'rejected') as rejected_app_count,
             (SELECT count(*) FROM applications a WHERE a.org_id = o.id AND a.stage = 'rejected' AND a.rejection_reason IS NOT NULL AND length(a.rejection_reason) > 5) as reasoned_rejected_count,
             (SELECT count(*) FROM support_tickets st WHERE st.category = 'billing' AND st.subject LIKE '%' || o.name || '%') as complaint_count
      FROM organisations o
      LEFT JOIN business_verifications bv ON bv.org_id = o.id
    `;

    const params = [];
    if (orgId) {
      orgsQuery += ' WHERE o.id = ?';
      params.push(orgId);
    } else {
      orgsQuery += ' ORDER BY o.name ASC LIMIT 100';
    }

    const rows = this.db.prepare(orgsQuery).all(...params);
    const { weights, bands } = RECRUITER_TRUST_CONFIG;
    const now = Date.now();

    const companies = rows.map((r) => {
      // 1. Approval status (max 35)
      let approvalScore = weights.approvalStatus.none;
      if (r.verification_status === 'verified') approvalScore = weights.approvalStatus.approved;
      else if (r.verification_status === 'pending') approvalScore = weights.approvalStatus.waiting;
      else if (r.verification_status === 'rejected') approvalScore = weights.approvalStatus.rejected;

      // 2. Corporate email / domain verified (max 10)
      // Check if recruiter users under this org have non-free email domains
      let isCorporate = true;
      try {
        const recUser = this.db.prepare(`
          SELECT email FROM users u
          JOIN business_verifications bv ON bv.user_id = u.id
          WHERE bv.org_id = ? LIMIT 1
        `).get(r.id);
        if (recUser && recUser.email) {
          const domain = recUser.email.split('@')[1] || '';
          if (['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(domain.toLowerCase())) {
            isCorporate = false;
          }
        }
      } catch {}

      const corporateEmailScore = isCorporate ? weights.corporateEmail.verified : weights.corporateEmail.unverified;

      // 3. Account age (max 10, caps at 90 days)
      const ageDays = Math.max(0, (now - new Date(r.created_at).getTime()) / 86400000);
      const ageScore = Math.min(weights.accountAge.max, Math.round((ageDays / weights.accountAge.capDays) * weights.accountAge.max * 10) / 10);

      // 4. Complete job descriptions (max 10)
      let jobDescScore = weights.completeJobDescriptions.max;
      if (r.job_count > 0) {
        jobDescScore = Math.round((r.complete_job_count / r.job_count) * weights.completeJobDescriptions.max * 10) / 10;
      }

      // 5. Hiring velocity (max 15)
      let velocityScore = 10; // Default baseline if no applications yet
      if (r.app_count > 0) {
        velocityScore = Math.round((r.advanced_app_count / r.app_count) * weights.hiringVelocity.max * 10) / 10;
      }

      // 6. Reasoned rejections (max 10)
      let reasonedScore = weights.reasonedRejections.max;
      if (r.rejected_app_count > 0) {
        reasonedScore = Math.round((r.reasoned_rejected_count / r.rejected_app_count) * weights.reasonedRejections.max * 10) / 10;
      }

      // 7. Clean support record (max 10)
      const complaintScore = Math.max(0, weights.cleanSupportRecord.max - (r.complaint_count || 0) * 5);

      const totalScore = clamp(
        Math.round(
          approvalScore +
          corporateEmailScore +
          ageScore +
          jobDescScore +
          velocityScore +
          reasonedScore +
          complaintScore
        ),
        0,
        100
      );

      let band = 'Risky';
      let bandColor = bands.risky.color;
      if (totalScore >= bands.trusted.min) {
        band = bands.trusted.label;
        bandColor = bands.trusted.color;
      } else if (totalScore >= bands.watch.min) {
        band = bands.watch.label;
        bandColor = bands.watch.color;
      }

      return {
        orgId: r.id,
        name: r.name,
        verificationStatus: r.verification_status,
        score: totalScore,
        band,
        bandColor,
        components: {
          approvalStatus: { score: approvalScore, max: weights.approvalStatus.max },
          corporateEmail: { score: corporateEmailScore, max: weights.corporateEmail.max },
          accountAge: { score: ageScore, max: weights.accountAge.max, ageDays: Math.round(ageDays) },
          completeJobDescriptions: { score: jobDescScore, max: weights.completeJobDescriptions.max, totalJobs: r.job_count },
          hiringVelocity: { score: velocityScore, max: weights.hiringVelocity.max, totalApps: r.app_count },
          reasonedRejections: { score: reasonedScore, max: weights.reasonedRejections.max, rejectedCount: r.rejected_app_count },
          cleanSupportRecord: { score: complaintScore, max: weights.cleanSupportRecord.max, complaints: r.complaint_count },
        },
      };
    });

    const result = orgId ? companies[0] || null : { companies, total: companies.length };
    setCached(cacheKey, result);
    return result;
  }

  /**
   * 4. Skill Gap Market Index (Demand vs Supply shares, gap in [-1, 1])
   */
  async getSkillGapMarket() {
    const cacheKey = 'skill_gap_market';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Demand: sum(weight) per skill in open/active jobs
    const demandRows = this.db.prepare(`
      SELECT jsr.skill_id, s.name as skill_name, sum(jsr.weight) as demand_weight, count(distinct jsr.job_id) as job_count
      FROM job_skill_requirements jsr
      JOIN jobs j ON j.id = jsr.job_id AND j.deleted_at IS NULL
      JOIN skills s ON s.id = jsr.skill_id
      GROUP BY jsr.skill_id
    `).all();

    // Supply: count of students with verified / intermediate proficiency (>= 2)
    const supplyRows = this.db.prepare(`
      SELECT cs.skill_id, s.name as skill_name, count(distinct cs.candidate_id) as candidate_count
      FROM candidate_skills cs
      JOIN skills s ON s.id = cs.skill_id
      WHERE cs.proficiency >= 2
      GROUP BY cs.skill_id
    `).all();

    // Catalog stats: learning resources per skill
    const resources = this.db.prepare(`
      SELECT skill_tags FROM learning_resources
    `).all();
    const resourceMap = new Map();
    resources.forEach((r) => {
      try {
        const tags = typeof r.skill_tags === 'string' ? JSON.parse(r.skill_tags) : (r.skill_tags || []);
        tags.forEach((tag) => {
          resourceMap.set(tag, (resourceMap.get(tag) || 0) + 1);
        });
      } catch {}
    });

    // Aggregate demand and supply maps
    const allSkills = new Map();

    let totalDemandWeight = 0;
    demandRows.forEach((r) => {
      totalDemandWeight += r.demand_weight;
      allSkills.set(r.skill_id, {
        skillId: r.skill_id,
        skillName: r.skill_name,
        demandWeight: r.demand_weight,
        jobCount: r.job_count,
        candidateCount: 0,
      });
    });

    let totalSupplyCount = 0;
    supplyRows.forEach((r) => {
      totalSupplyCount += r.candidate_count;
      if (allSkills.has(r.skill_id)) {
        allSkills.get(r.skill_id).candidateCount = r.candidate_count;
      } else {
        allSkills.set(r.skill_id, {
          skillId: r.skill_id,
          skillName: r.skill_name,
          demandWeight: 0,
          jobCount: 0,
          candidateCount: r.candidate_count,
        });
      }
    });

    const evaluated = [];
    allSkills.forEach((item) => {
      const demandShare = totalDemandWeight > 0 ? item.demandWeight / totalDemandWeight : 0;
      const supplyShare = totalSupplyCount > 0 ? item.candidateCount / totalSupplyCount : 0;
      const maxShare = Math.max(demandShare, supplyShare, 0.00001);
      const gapIndex = clamp((demandShare - supplyShare) / maxShare, -1, 1);

      evaluated.push({
        skillId: item.skillId,
        skillName: item.skillName,
        demandWeight: item.demandWeight,
        jobCount: item.jobCount,
        candidateCount: item.candidateCount,
        demandShare: Math.round(demandShare * 1000) / 10,
        supplyShare: Math.round(supplyShare * 1000) / 10,
        gapIndex: Math.round(gapIndex * 100) / 100,
        existingResources: resourceMap.get(item.skillId) || 0,
        status: gapIndex > 0.1 ? 'under_supplied' : gapIndex < -0.1 ? 'over_supplied' : 'balanced',
      });
    });

    const topUnderSupplied = evaluated
      .filter((e) => e.gapIndex > 0)
      .sort((a, b) => b.gapIndex - a.gapIndex)
      .slice(0, 15);

    const topOverSupplied = evaluated
      .filter((e) => e.gapIndex < 0)
      .sort((a, b) => a.gapIndex - b.gapIndex)
      .slice(0, 15);

    const result = {
      totalDemandWeight,
      totalSupplyCount,
      evaluatedCount: evaluated.length,
      topUnderSupplied,
      topOverSupplied,
      allSkills: evaluated,
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 5. Funnel Cohorts (Weekly signup cohorts with 14-day conversion steps)
   */
  async getFunnelCohorts({ weeks = 8 } = {}) {
    const weeksCount = Math.min(Math.max(parseInt(weeks, 10) || 8, 4), 16);
    const cacheKey = `funnel_cohorts_${weeksCount}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const cohorts = [];
    const now = new Date();

    for (let w = 0; w < weeksCount; w++) {
      const endDaysAgo = w * 7;
      const startDaysAgo = (w + 1) * 7;
      const startDate = new Date(now.getTime() - startDaysAgo * 86400000).toISOString().slice(0, 10);
      const endDate = new Date(now.getTime() - endDaysAgo * 86400000).toISOString().slice(0, 10);

      const cohortUsers = this.db.prepare(`
        SELECT id, created_at FROM users
        WHERE role = 'student' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) < ?
      `).all(startDate, endDate);

      const totalSignups = cohortUsers.length;
      if (totalSignups === 0) {
        cohorts.push({
          weekLabel: `W-${w + 1} (${startDate})`,
          signups: 0,
          profileCompleted: 0,
          testStarted: 0,
          testPassed: 0,
          passportPublished: 0,
          applicationSubmitted: 0,
          rates: { profile: 0, test: 0, pass: 0, passport: 0, app: 0 },
        });
        continue;
      }

      const userIds = cohortUsers.map((u) => `'${u.id}'`).join(',');

      // Profile completed (has full_name and email_verified)
      const profileCompleted = this.db.prepare(`
        SELECT count(*) as c FROM users WHERE id IN (${userIds}) AND email_verified = 1
      `).get().c;

      const testStarted = this.db.prepare(`
        SELECT count(distinct user_id) as c FROM assessment_sessions WHERE user_id IN (${userIds})
      `).get().c;

      const testPassed = this.db.prepare(`
        SELECT count(distinct s.user_id) as c
        FROM assessment_sessions s
        JOIN session_scores sc ON sc.session_id = s.id
        WHERE s.user_id IN (${userIds}) AND ((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) >= 70
      `).get().c;

      let passportPublished = 0;
      try {
        passportPublished = this.db.prepare(`
          SELECT count(distinct candidate_id) as c FROM skill_passports WHERE candidate_id IN (${userIds}) AND is_published = 1
        `).get().c;
      } catch {}

      const applicationSubmitted = this.db.prepare(`
        SELECT count(distinct candidate_id) as c FROM applications WHERE candidate_id IN (${userIds})
      `).get().c;

      cohorts.push({
        weekLabel: `W-${w + 1} (${startDate})`,
        signups: totalSignups,
        profileCompleted,
        testStarted,
        testPassed,
        passportPublished,
        applicationSubmitted,
        rates: {
          profile: Math.round((profileCompleted / totalSignups) * 100),
          test: Math.round((testStarted / totalSignups) * 100),
          pass: Math.round((testPassed / totalSignups) * 100),
          passport: Math.round((passportPublished / totalSignups) * 100),
          app: Math.round((applicationSubmitted / totalSignups) * 100),
        },
      });
    }

    // Overall Funnel across all students
    const totalStudents = this.db.prepare(`SELECT count(*) as c FROM users WHERE role = 'student'`).get().c;
    const totalProfile = this.db.prepare(`SELECT count(*) as c FROM users WHERE role = 'student' AND email_verified = 1`).get().c;
    const totalTest = this.db.prepare(`SELECT count(distinct user_id) as c FROM assessment_sessions`).get().c;
    const totalPassed = this.db.prepare(`
      SELECT count(distinct s.user_id) as c
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      WHERE ((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) >= 70
    `).get().c;

    let totalPassport = 0;
    try {
      totalPassport = this.db.prepare(`SELECT count(distinct candidate_id) as c FROM skill_passports WHERE is_published = 1`).get().c;
    } catch {}

    const totalApp = this.db.prepare(`SELECT count(distinct candidate_id) as c FROM applications`).get().c;

    const steps = [
      { step: 'Signups', count: totalStudents, ...wilsonInterval(totalStudents, totalStudents) },
      { step: 'Profile Complete', count: totalProfile, ...wilsonInterval(totalProfile, totalStudents) },
      { step: 'Assessment Started', count: totalTest, ...wilsonInterval(totalTest, totalStudents) },
      { step: 'Assessment Passed', count: totalPassed, ...wilsonInterval(totalPassed, totalStudents) },
      { step: 'Passport Published', count: totalPassport, ...wilsonInterval(totalPassport, totalStudents) },
      { step: 'Job Application', count: totalApp, ...wilsonInterval(totalApp, totalStudents) },
    ];

    const result = {
      cohorts,
      overallFunnel: steps,
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 6. Correlations (Pearson r for 4 cross-domain relationships + sampled scatter data)
   */
  async getCorrelations() {
    const cacheKey = 'correlations';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Relationship 1: Test score vs Match score
    const pairs1 = this.db.prepare(`
      SELECT ((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) as x, a.match_score as y
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      JOIN applications a ON a.candidate_id = s.user_id
      WHERE a.match_score IS NOT NULL
      LIMIT 500
    `).all();

    // Relationship 2: Test score vs Reaching interview stage
    const pairs2 = this.db.prepare(`
      SELECT ((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) as x,
             CASE WHEN a.stage IN ('interview', 'technical_interview', 'hr_interview', 'offered', 'hired') THEN 100.0 ELSE 0.0 END as y
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      JOIN applications a ON a.candidate_id = s.user_id
      LIMIT 500
    `).all();

    // Relationship 3: Learning progress vs Score
    const pairs3 = this.db.prepare(`
      SELECT (SELECT count(*) FROM candidate_skills cs WHERE cs.candidate_id = s.user_id) as x,
             ((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) as y
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      LIMIT 500
    `).all();

    // Relationship 4: Integrity risk vs Test score
    const pairs4 = this.db.prepare(`
      SELECT irs.score as x,
             ((sc.technical_score + sc.knowledge_score + sc.practical_score) / 3.0) as y
      FROM assessment_sessions s
      JOIN session_scores sc ON sc.session_id = s.id
      JOIN integrity_risk_scores irs ON irs.session_id = s.id
      LIMIT 500
    `).all();

    const buildMetric = (title, xLabel, yLabel, pairs, description) => {
      const xs = pairs.map((p) => Number(p.x));
      const ys = pairs.map((p) => Number(p.y));
      const stats = pearson(xs, ys) || { r: 0, n: 0, t: 0, p: 1 };

      const absR = Math.abs(stats.r);
      let strength = 'negligible';
      if (absR >= 0.7) strength = 'strong';
      else if (absR >= 0.4) strength = 'moderate';
      else if (absR >= 0.2) strength = 'weak';

      return {
        title,
        xLabel,
        yLabel,
        description,
        r: stats.r,
        n: stats.n,
        p: stats.p,
        strength,
        lowConfidence: stats.n < 30,
        sample: pairs.slice(0, 150).map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })),
      };
    };

    const relationships = [
      buildMetric(
        'Assessment Score vs Match Score',
        'Assessment Score',
        'Algorithm Match Score',
        pairs1,
        'Evaluates alignment between verified coding ability and job matching algorithm.'
      ),
      buildMetric(
        'Assessment Score vs Interview Stage Progression',
        'Assessment Score',
        'Interview Reached (0 or 100)',
        pairs2,
        'Measures correlation between high assessment performance and recruiter interview invitations.'
      ),
      buildMetric(
        'Skill Portfolio Breadth vs Test Performance',
        'Verified Skills Count',
        'Assessment Score',
        pairs3,
        'Evaluates correlation between number of skills acquired and assessment success.'
      ),
      buildMetric(
        'Integrity Risk vs Assessment Score',
        'Integrity Risk Score (0-100)',
        'Assessment Score',
        pairs4,
        'Highlights potential score inflation in high-risk anomaly sessions.'
      ),
    ];

    const result = {
      disclaimer: 'Correlation indicates statistical association and does NOT imply causation.',
      relationships,
    };

    setCached(cacheKey, result);
    return result;
  }
}
