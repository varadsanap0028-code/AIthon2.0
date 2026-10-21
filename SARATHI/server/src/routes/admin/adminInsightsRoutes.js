/**
 * SARATHI Admin Portal — Platform Insights Routes
 * PRD Phase 8
 * Read-only statistics & decision-support endpoints.
 */

import express from 'express';
import { AdminInsightsService } from '../../services/admin/adminInsightsService.js';

const router = express.Router();
const insightsService = new AdminInsightsService();

/**
 * GET /api/admin/insights/forecast
 */
router.get('/forecast', async (req, res) => {
  try {
    const { metric = 'applications', horizon = '14' } = req.query;
    const result = await insightsService.getForecast({ metric, horizon });
    res.json(result);
  } catch (err) {
    console.error('Insights route error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/insights/anomalies
 */
router.get('/anomalies', async (req, res) => {
  try {
    const { days = '60' } = req.query;
    const result = await insightsService.getAnomalies({ days });
    res.json(result);
  } catch (err) {
    console.error('Insights route error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/insights/recruiter-trust
 */
router.get('/recruiter-trust', async (req, res) => {
  try {
    const result = await insightsService.getRecruiterTrust();
    res.json(result);
  } catch (err) {
    console.error('Insights route error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/insights/recruiter-trust/:orgId
 */
router.get('/recruiter-trust/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await insightsService.getRecruiterTrust({ orgId });
    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Organisation not found' } });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/insights/skill-gap-market
 */
router.get('/skill-gap-market', async (req, res) => {
  try {
    const result = await insightsService.getSkillGapMarket();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/insights/funnel-cohorts
 */
router.get('/funnel-cohorts', async (req, res) => {
  try {
    const { weeks = '8' } = req.query;
    const result = await insightsService.getFunnelCohorts({ weeks });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/insights/correlations
 */
router.get('/correlations', async (req, res) => {
  try {
    const result = await insightsService.getCorrelations();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;
