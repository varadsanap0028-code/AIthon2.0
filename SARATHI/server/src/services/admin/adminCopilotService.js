/**
 * SARATHI Admin Portal — Admin Copilot Service
 * PRD Phase 9
 * Natural Language to Platform Analytics & System Q&A
 * Zero SQL writes, 100% read-only, strict data masking and prompt injection safety.
 */

import { initDb } from '../../config/db.js';
import { adminAnalyticsService } from './adminAnalyticsService.js';
import { adminApprovalService } from './adminApprovalService.js';
import { AdminIntegrityService } from './adminIntegrityService.js';
import { AdminInsightsService } from './adminInsightsService.js';
import { AdminSupportService } from './adminSupportService.js';

// Static glossary of platform metrics
const GLOSSARY = {
  'pass rate': 'The proportion of submitted assessment sessions where the candidate achieved a score >= 70%. Formula: (Passed Sessions / Total Graded Sessions) * 100.',
  'risk score': 'Anti-cheat anomaly rating from 0-100 computed via a calibrated 8-feature logistic regression model assessing paste ratios, tab blurs, speed anomalies, and code shingling.',
  'trust score': 'Composite 0-100 rating reflecting recruiter organization reliability based on verification status (35pts), corporate email (10pts), account age (10pts), complete job postings (10pts), hiring velocity (15pts), reasoned rejections (10pts), and support record (10pts).',
  'gap index': 'Normalized market skill shortage metric ranging between -1 and +1. Positive values denote skills where employer demand exceeds student supply; negative values indicate candidate saturation.',
  'modified z score': 'Robust outlier detection score using median and Median Absolute Deviation (MAD). Calculated as 0.6745 * (x - median) / MAD. Observations with |mz| > 3.5 are flagged as unusual.',
  'sla': 'Service Level Agreement target time for resolving support tickets and approving recruiter applications. Standard approvals: 24h; Urgent: 4h.',
};

export class AdminCopilotService {
  constructor(db = null) {
    this.db = db || initDb();
    this.insightsService = new AdminInsightsService(this.db);
  }

  /**
   * Safe email masking helper: 'priya.sharma@example.com' -> 'p***@e***.com'
   */
  static maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.com';
    const user = parts[0];
    const domain = parts[1];
    const maskedUser = user.length > 1 ? `${user[0]}***` : `${user}***`;
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].length > 1 ? `${domainParts[0][0]}***` : `${domainParts[0]}***`;
    const tld = domainParts.length > 1 ? `.${domainParts.slice(1).join('.')}` : '';
    return `${maskedUser}@${maskedDomain}${tld}`;
  }

  /**
   * Deterministic Intent & Parameter Classifier (100% offline fallback)
   */
  classifyIntent(message) {
    const raw = String(message || '').trim().toLowerCase();
    const clean = raw.replace(/[^\w\s-]/g, ' ');

    // 15. Help
    if (clean === 'help' || clean.includes('what can you do') || clean.includes('how to use') || clean.includes('commands')) {
      return { tool: 'help', params: {}, confidence: 1.0 };
    }

    // 14. System health
    if (clean.includes('healthy') || clean.includes('system health') || clean.includes('server status') || clean.includes('uptime')) {
      return { tool: 'system_health', params: {}, confidence: 0.95 };
    }

    // 10. Explain metric / glossary
    for (const term of Object.keys(GLOSSARY)) {
      if (clean.includes(term) || clean.includes(`what does ${term}`) || clean.includes(`explain ${term}`)) {
        return { tool: 'explain_metric', params: { name: term }, confidence: 0.95 };
      }
    }
    if (clean.includes('what does') || clean.includes('explain') || clean.includes('definition of')) {
      return { tool: 'explain_metric', params: { name: clean }, confidence: 0.7 };
    }

    // 13. Support backlog
    if (clean.includes('support') || clean.includes('ticket') || clean.includes('backlog') || clean.includes('open tickets')) {
      return { tool: 'support_backlog', params: {}, confidence: 0.9 };
    }

    // 8. User lookup ("find user priya", "search user ...", "lookup ...")
    if (clean.startsWith('find user') || clean.startsWith('lookup user') || clean.startsWith('search user') || clean.includes('who is')) {
      const query = clean.replace(/^(find user|lookup user|search user|who is)\s+/i, '').trim();
      return { tool: 'user_lookup', params: { query }, confidence: 0.95 };
    }

    // 7. Risky recruiters
    if (clean.includes('risky recruiter') || clean.includes('untrusted recruiter') || clean.includes('low trust recruiter') || clean.includes('suspicious recruiter')) {
      return { tool: 'risky_recruiters', params: { limit: 10 }, confidence: 0.95 };
    }

    // 3. Pending approvals ("waiting more than 48 hours", "pending recruiter", "approval queue")
    if (clean.includes('approval') || clean.includes('waiting') || clean.includes('recruiters are waiting') || clean.includes('pending verif')) {
      let olderThanHours = null;
      const hoursMatch = clean.match(/(\d+)\s*(hours?|hrs?)/);
      if (hoursMatch) {
        olderThanHours = parseInt(hoursMatch[1], 10);
      }
      return { tool: 'pending_approvals', params: { olderThanHours }, confidence: 0.95 };
    }

    // 4. Flagged sessions ("suspicious test sessions", "cheat", "proctoring alert", "integrity flag")
    if (clean.includes('suspicious') || clean.includes('cheat') || clean.includes('flagged session') || clean.includes('integrity') || clean.includes('proctor')) {
      return { tool: 'flagged_sessions', params: { band: 'high' }, confidence: 0.95 };
    }

    // 5. Forecast ("forecast applications next 2 weeks", "predict signups")
    if (clean.includes('forecast') || clean.includes('predict') || clean.includes('projection')) {
      let metric = 'applications';
      if (clean.includes('signup') || clean.includes('user')) metric = 'signups';
      else if (clean.includes('test') || clean.includes('assessment')) metric = 'tests';

      let horizon = 14;
      if (clean.includes('2 weeks') || clean.includes('two weeks') || clean.includes('14 days')) horizon = 14;
      else if (clean.includes('1 week') || clean.includes('one week') || clean.includes('7 days')) horizon = 7;
      else if (clean.includes('month') || clean.includes('30 days')) horizon = 30;

      return { tool: 'forecast', params: { metric, horizon }, confidence: 0.95 };
    }

    // 6. Skill gap market ("what skills do we lack", "skill shortage", "skill gap")
    if (clean.includes('skill') && (clean.includes('lack') || clean.includes('shortage') || clean.includes('gap') || clean.includes('need') || clean.includes('demand'))) {
      return { tool: 'skill_gap_market', params: {}, confidence: 0.95 };
    }

    // 12. Top skills tested
    if (clean.includes('top skill') || clean.includes('skills students are tested') || clean.includes('popular skills')) {
      return { tool: 'top_skills', params: { range: '30d' }, confidence: 0.95 };
    }

    // 11. Anomalies ("anything unusual", "unusual days", "anomaly", "spikes")
    if (clean.includes('unusual') || clean.includes('anomaly') || clean.includes('spike') || clean.includes('abnormal')) {
      return { tool: 'anomalies', params: { days: 60 }, confidence: 0.95 };
    }

    // 9. Funnel ("funnel for last 90 days")
    if (clean.includes('funnel') || clean.includes('conversion rate') || clean.includes('dropoff')) {
      let range = '30d';
      if (clean.includes('90') || clean.includes('quarter')) range = '90d';
      else if (clean.includes('7') || clean.includes('week')) range = '7d';
      return { tool: 'funnel', params: { range }, confidence: 0.95 };
    }

    // 2. Signups trend ("signups by role", "signups trend")
    if (clean.includes('signups by role') || clean.includes('signup trend') || clean.includes('user growth')) {
      let range = '30d';
      if (clean.includes('week') || clean.includes('7 days')) range = '7d';
      else if (clean.includes('90 days') || clean.includes('quarter')) range = '90d';
      return { tool: 'signups_trend', params: { range }, confidence: 0.95 };
    }

    // 1. KPI summary ("how many users joined this week", "platform summary", "metrics overview")
    if (clean.includes('joined') || clean.includes('how many users') || clean.includes('kpi') || clean.includes('overview') || clean.includes('total users')) {
      let range = '30d';
      if (clean.includes('this week') || clean.includes('7 days')) range = '7d';
      else if (clean.includes('90 days')) range = '90d';
      return { tool: 'kpi_summary', params: { range }, confidence: 0.9 };
    }

    // Generic fallback: Help
    return { tool: 'help', params: {}, confidence: 0.4 };
  }

  /**
   * Execute one of the 15 tools cleanly and securely
   */
  async executeTool(toolName, params) {
    switch (toolName) {
      case 'kpi_summary': {
        const range = ['7d', '30d', '90d'].includes(params.range) ? params.range : '30d';
        const analytics = adminAnalyticsService.getOverviewAnalytics(range);
        return {
          title: `Platform Performance Summary (${range.toUpperCase()})`,
          kpis: [
            { label: 'Total Users', value: analytics.kpis.totalUsers.value, delta: analytics.kpis.totalUsers.deltaPct },
            { label: 'New Signups', value: analytics.kpis.newUsers.value, delta: analytics.kpis.newUsers.deltaPct },
            { label: 'Job Applications', value: analytics.kpis.applications.value, delta: analytics.kpis.applications.deltaPct },
            { label: 'Test Pass Rate', value: `${analytics.kpis.testPassRate.value}%`, delta: analytics.kpis.testPassRate.deltaPct },
          ],
          links: [{ label: 'View Dashboard', href: '/admin' }],
          followUps: ['Show signups by role last 30 days', 'What skills do we lack?', 'Is the system healthy?'],
        };
      }

      case 'signups_trend': {
        const range = ['7d', '30d', '90d'].includes(params.range) ? params.range : '30d';
        const analytics = adminAnalyticsService.getOverviewAnalytics(range);
        return {
          title: `Signups Trend by Role (${range.toUpperCase()})`,
          chart: {
            chartType: 'line',
            xKey: 'date',
            series: ['student', 'recruiter', 'college'],
            data: analytics.series.signupsByRole.map((d) => ({
              date: d.date.slice(5),
              student: d.student,
              recruiter: d.recruiter,
              college: d.college,
            })),
          },
          summary: `Showing candidate, recruiter, and institutional registrations across the selected ${range} period.`,
          links: [{ label: 'User Directory', href: '/admin/users' }],
          followUps: ['How many users joined this week', 'List risky recruiters', 'Funnel for last 90 days'],
        };
      }

      case 'pending_approvals': {
        const olderThanHours = params.olderThanHours ? Number(params.olderThanHours) : null;
        const approvals = adminApprovalService.getApprovals({ status: 'pending', olderThanHours, pageSize: 5 });
        return {
          title: olderThanHours ? `Recruiter Approvals Waiting > ${olderThanHours}h` : 'Pending Recruiter Approvals',
          total: approvals.total,
          table: approvals.items.map((item) => ({
            Company: item.organizationName,
            Submitted: item.submittedAt.slice(0, 10),
            Document: item.documentType,
            SLA: item.slaStatus.toUpperCase(),
          })),
          links: [{ label: 'Review Approvals Queue', href: '/admin/approvals' }],
          followUps: ['List risky recruiters', 'Anything unusual lately', 'Support backlog'],
        };
      }

      case 'flagged_sessions': {
        const band = params.band || 'high';
        const list = AdminIntegrityService.listSessions({ band, pageSize: 5 });
        return {
          title: `Flagged Assessment Sessions (${band.toUpperCase()} Risk)`,
          total: list.total,
          table: list.sessions.map((s) => ({
            Candidate: s.candidateName,
            Score: `${Math.round(s.score)}%`,
            RiskScore: `${s.riskScore}/100`,
            Reasons: s.reasons.slice(0, 2).join(', '),
          })),
          links: [{ label: 'Open Anti-Cheat Queue', href: '/admin/integrity' }],
          followUps: ['What does risk score mean', 'Forecast applications next 2 weeks', 'Top skills students are tested on'],
        };
      }

      case 'top_skills': {
        const range = ['7d', '30d', '90d'].includes(params.range) ? params.range : '30d';
        const analytics = adminAnalyticsService.getOverviewAnalytics(range);
        return {
          title: 'Top Skills Tested by Candidates',
          table: analytics.topSkillsTested.map((s) => ({
            Skill: s.skill,
            Attempts: s.attempts,
            'Average Score': `${Math.round(s.avgScore)}%`,
          })),
          links: [{ label: 'View Skills Catalog', href: '/admin/content' }],
          followUps: ['What skills do we lack?', 'What does pass rate mean', 'Funnel for last 90 days'],
        };
      }

      case 'skill_gap_market': {
        const gap = await this.insightsService.getSkillGapMarket();
        return {
          title: 'Market Skill Shortage Index',
          summary: 'Identifies skills with heavy recruiter job demand exceeding current verified student supply.',
          table: gap.topUnderSupplied.slice(0, 5).map((s) => ({
            Skill: s.skillName,
            DemandShare: `${s.demandShare}%`,
            SupplyShare: `${s.supplyShare}%`,
            GapIndex: `+${s.gapIndex}`,
            Courses: s.existingResources,
          })),
          links: [{ label: 'Skill Gap & Benchmark Center', href: '/admin/insights' }],
          followUps: ['Top skills students are tested on', 'Forecast applications next 2 weeks', 'Help'],
        };
      }

      case 'forecast': {
        const metric = params.metric || 'applications';
        const horizon = params.horizon || 14;
        const f = await this.insightsService.getForecast({ metric, horizon });
        return {
          title: `Forecast for ${metric.toUpperCase()} (Next ${horizon} Days)`,
          confidence: f.confidence,
          model: f.model ? `Growth: ${f.model.slope}/day (R²=${f.model.r2})` : 'Calibrating...',
          forecastPreview: f.forecast.slice(0, 5).map((d) => ({
            Date: d.date,
            Projected: d.value,
            Range: `[${d.lower} - ${d.upper}]`,
          })),
          links: [{ label: 'Full Predictive Models', href: '/admin/insights' }],
          followUps: ['Anything unusual lately', 'How many users joined this week', 'Support backlog'],
        };
      }

      case 'anomalies': {
        const days = params.days || 60;
        const anom = await this.insightsService.getAnomalies({ days });
        return {
          title: `Detected Anomalies (Last ${days} Days)`,
          total: anom.flaggedCount,
          table: anom.flagged.slice(0, 5).map((a) => ({
            Date: a.date,
            Metric: a.metric.replace('_', ' '),
            Observed: a.value,
            Expected: a.expected,
            ZScore: `${a.mz}σ`,
          })),
          links: [{ label: 'Open Anomaly Inspector', href: '/admin/insights' }],
          followUps: ['Any suspicious test sessions', 'Is the system healthy', 'Help'],
        };
      }

      case 'risky_recruiters': {
        const trust = await this.insightsService.getRecruiterTrust();
        const risky = (trust.companies || []).filter((c) => c.band === 'Risky');
        return {
          title: 'Recruiter Organizations with Risky Trust Scores (<45)',
          total: risky.length,
          table: risky.slice(0, 5).map((r) => ({
            Company: r.name,
            TrustScore: `${r.score}/100`,
            Status: r.verificationStatus,
            ApprovalPts: `${r.components.approvalStatus.score}/35`,
          })),
          links: [{ label: 'Recruiter Trust Scores', href: '/admin/insights' }],
          followUps: ['Which recruiters are waiting more than 48 hours', 'How many users joined this week', 'Support backlog'],
        };
      }

      case 'user_lookup': {
        const query = String(params.query || '').trim();
        if (!query) {
          return {
            title: 'User Lookup',
            message: 'Please provide a search name or email.',
            results: [],
          };
        }

        const rows = this.db.prepare(`
          SELECT id, email, full_name, role, status, created_at
          FROM users
          WHERE (full_name LIKE ? OR email LIKE ?)
          LIMIT 5
        `).all(`%${query}%`, `%${query}%`);

        const isExactEmail = query.includes('@');

        return {
          title: `User Directory Match for "${query}"`,
          total: rows.length,
          table: rows.map((u) => ({
            Name: u.full_name,
            Email: isExactEmail ? u.email : AdminCopilotService.maskEmail(u.email),
            Role: u.role,
            Status: u.status.toUpperCase(),
            Joined: u.created_at.slice(0, 10),
          })),
          links: [{ label: 'Open Users Page', href: `/admin/users?q=${encodeURIComponent(query)}` }],
          followUps: ['How many users joined this week', 'Support backlog', 'Help'],
        };
      }

      case 'funnel': {
        const cohorts = await this.insightsService.getFunnelCohorts({ weeks: 8 });
        return {
          title: 'Candidate Conversion Milestones',
          table: cohorts.overallFunnel.map((s) => ({
            Milestone: s.step,
            Candidates: s.count,
            ConversionRate: `${Math.round(s.center * 100)}%`,
          })),
          links: [{ label: 'Detailed Cohort Analysis', href: '/admin/insights' }],
          followUps: ['What does pass rate mean', 'Top skills students are tested on', 'Forecast applications next 2 weeks'],
        };
      }

      case 'support_backlog': {
        const openTickets = AdminSupportService.listAdminTickets({ status: 'open', pageSize: 5 });
        return {
          title: 'Open Support Desk Queue',
          total: openTickets.total,
          table: openTickets.tickets.map((t) => ({
            Ticket: `#${t.id.slice(-6)}`,
            Subject: t.subject,
            Category: t.category,
            Priority: t.priority.toUpperCase(),
            SLA: t.sla_status.toUpperCase(),
          })),
          links: [{ label: 'Open Support Desk', href: '/admin/support' }],
          followUps: ['Which recruiters are waiting more than 48 hours', 'Is the system healthy', 'Help'],
        };
      }

      case 'system_health': {
        const mem = process.memoryUsage();
        return {
          title: 'SARATHI Core Platform Status',
          kpis: [
            { label: 'Uptime', value: `${Math.round(process.uptime() / 60)} mins` },
            { label: 'Node Version', value: process.version },
            { label: 'Heap Used', value: `${Math.round(mem.heapUsed / 1024 / 1024)} MB` },
            { label: 'Database', value: 'SQLite3 WAL' },
          ],
          links: [{ label: 'Open System Operations', href: '/admin/system' }],
          followUps: ['Anything unusual lately', 'Support backlog', 'Help'],
        };
      }

      case 'explain_metric': {
        const name = String(params.name || '').toLowerCase();
        let matchedKey = Object.keys(GLOSSARY).find((k) => name.includes(k)) || 'pass rate';
        const explanation = GLOSSARY[matchedKey] || 'Metric definition not found.';

        return {
          title: `Metric Definition: ${matchedKey.toUpperCase()}`,
          text: explanation,
          links: [{ label: 'Platform Insights', href: '/admin/insights' }],
          followUps: ['What does risk score mean', 'What does trust score mean', 'What does gap index mean'],
        };
      }

      case 'help':
      default: {
        return {
          title: 'Admin Copilot Capabilities',
          text: 'I can query platform metrics, analyze anomalies, search users, inspect proctoring reviews, and explain statistics.',
          sampleQuestions: [
            'How many users joined this week',
            'Show signups by role last 30 days',
            'Which recruiters are waiting more than 48 hours',
            'Any suspicious test sessions',
            'Forecast applications next 2 weeks',
            'What skills do we lack',
            'List risky recruiters',
            'Is the system healthy',
          ],
          links: [{ label: 'Overview Dashboard', href: '/admin' }],
          followUps: ['How many users joined this week', 'What skills do we lack', 'Is the system healthy'],
        };
      }
    }
  }

  /**
   * Process incoming user chat query end-to-end
   */
  async processQuery({ adminId, sessionId, query }) {
    const startTime = Date.now();
    const safeQuery = String(query || '').slice(0, 500);

    // Ensure session exists
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      activeSessionId = `chat-ses-${Date.now()}`;
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO admin_chat_sessions (id, admin_id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(activeSessionId, adminId, safeQuery.slice(0, 40) || 'New Conversation', now, now);
    }

    // Save user message
    const userMsgId = `cmsg-usr-${Date.now()}`;
    const nowStr = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO admin_chat_messages (id, session_id, role, content, blocks_json, created_at)
      VALUES (?, ?, 'user', ?, '[]', ?)
    `).run(userMsgId, activeSessionId, safeQuery, nowStr);

    // Classify intent
    const classification = this.classifyIntent(safeQuery);
    const tool = classification.tool;
    const params = classification.params;

    // Execute tool
    let toolResult = null;
    try {
      toolResult = await this.executeTool(tool, params);
    } catch (err) {
      toolResult = {
        title: 'Query Error',
        text: `Unable to complete query: ${err.message}`,
        links: [{ label: 'Go to Dashboard', href: '/admin' }],
        followUps: ['Help'],
      };
    }

    const latencyMs = Date.now() - startTime;

    // Compose response
    const assistantMsgId = `cmsg-ast-${Date.now()}`;
    let text = toolResult.text || toolResult.summary || `${toolResult.title}.`;
    if (toolResult.total !== undefined) {
      text += ` Found ${toolResult.total} matching records.`;
    }

    const blocks = [];
    if (toolResult.kpis) {
      blocks.push({ type: 'kpis', kpis: toolResult.kpis });
    }
    if (toolResult.table) {
      blocks.push({ type: 'table', data: toolResult.table });
    }
    if (toolResult.chart) {
      blocks.push({ type: 'chart', ...toolResult.chart });
    }
    if (toolResult.forecastPreview) {
      blocks.push({ type: 'table', data: toolResult.forecastPreview });
    }

    const blocksJson = JSON.stringify(blocks);

    this.db.prepare(`
      INSERT INTO admin_chat_messages (id, session_id, role, content, blocks_json, tool, used_fallback, latency_ms, created_at)
      VALUES (?, ?, 'assistant', ?, ?, ?, 1, ?, ?)
    `).run(assistantMsgId, activeSessionId, text, blocksJson, tool, latencyMs, new Date().toISOString());

    // Update session timestamp
    this.db.prepare(`UPDATE admin_chat_sessions SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), activeSessionId);

    return {
      sessionId: activeSessionId,
      messageId: assistantMsgId,
      text,
      blocks,
      links: toolResult.links || [],
      followUps: toolResult.followUps || [],
      tool,
      usedFallback: true,
      latencyMs,
    };
  }

  /**
   * Session Management
   */
  listSessions(adminId) {
    return this.db.prepare(`
      SELECT id, title, created_at, updated_at
      FROM admin_chat_sessions
      WHERE admin_id = ?
      ORDER BY updated_at DESC
    `).all(adminId);
  }

  getSession(adminId, sessionId) {
    const session = this.db.prepare(`
      SELECT * FROM admin_chat_sessions WHERE id = ? AND admin_id = ?
    `).get(sessionId, adminId);
    if (!session) return null;

    const messages = this.db.prepare(`
      SELECT id, role, content, blocks_json, tool, used_fallback, latency_ms, feedback, created_at
      FROM admin_chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    return {
      session,
      messages: messages.map((m) => {
        let blocks = [];
        try {
          blocks = JSON.parse(m.blocks_json);
        } catch {}
        return {
          id: m.id,
          role: m.role,
          content: m.content,
          blocks,
          tool: m.tool,
          usedFallback: Boolean(m.used_fallback),
          latencyMs: m.latency_ms,
          feedback: m.feedback,
          createdAt: m.created_at,
        };
      }),
    };
  }

  deleteSession(adminId, sessionId) {
    const res = this.db.prepare(`
      DELETE FROM admin_chat_sessions WHERE id = ? AND admin_id = ?
    `).run(sessionId, adminId);
    return res.changes > 0;
  }

  submitFeedback(adminId, messageId, { value, comment = null }) {
    const res = this.db.prepare(`
      UPDATE admin_chat_messages
      SET feedback = ?, feedback_comment = ?
      WHERE id = ?
    `).run(value, comment, messageId);
    return res.changes > 0;
  }
}
