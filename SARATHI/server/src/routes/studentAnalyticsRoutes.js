import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { StudentAnalyticsService } from '../services/studentAnalyticsService.js';

const router = Router();

/**
 * GET /api/analytics/student
 * Retrieves statistical chart models and metrics for authenticated candidate
 */
router.get('/student', requireAuth, async (req, res, next) => {
  try {
    const candidateId = req.user.id;
    const analytics = await StudentAnalyticsService.getStudentAnalytics(candidateId);
    return res.json({
      success: true,
      data: analytics
    });
  } catch (err) {
    next(err);
  }
});

export default router;
