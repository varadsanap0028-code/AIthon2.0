import { Router } from 'express';
import { z } from 'zod';
import { resourceService } from '../services/resourceService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const progressSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
  percentComplete: z.number().min(0).max(100).optional().nullable(),
  lastPositionSeconds: z.number().min(0).optional().nullable(),
  completedItemIds: z.array(z.string()).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

const bookmarkSchema = z.object({
  collectionName: z.string().max(50).optional().default('my_list'),
});

router.get('/', (req, res, next) => {
  try {
    const {
      domain,
      skill,
      type,
      format,
      isFree,
      free,
      level,
      status,
      collection,
      search,
      q,
      sort,
      page,
      pageSize,
      bookmarkedOnly,
    } = req.query;
    const userId = req.user?.id || null;

    const shouldPaginate = page !== undefined || pageSize !== undefined;
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSize = Math.max(1, Math.min(100, parseInt(pageSize, 10) || 12));

    const result = resourceService.listResources({
      domain: domain ? String(domain) : null,
      skill: skill ? String(skill) : null,
      format: (format || type) ? String(format || type) : null,
      isFree: free !== undefined ? free : isFree,
      level: level ? String(level) : null,
      status: status ? String(status) : null,
      collection: collection ? String(collection) : null,
      search: (q || search) ? String(q || search) : '',
      sort: sort ? String(sort) : 'recommended',
      page: parsedPage,
      pageSize: parsedPageSize,
      paginate: shouldPaginate,
      bookmarkedOnly: bookmarkedOnly === 'true' || bookmarkedOnly === '1' || bookmarkedOnly === true,
      userId,
    });

    if (shouldPaginate) {
      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          totalCount: result.totalCount,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages,
        },
        totalCount: result.totalCount,
      });
    } else {
      res.json({
        success: true,
        data: result,
        totalCount: result.length,
      });
    }
  } catch (err) {
    next(err);
  }
});

const handleRecommendations = (req, res, next) => {
  try {
    const { targetRole, domainId } = req.query;
    const recommendations = resourceService.getRecommendations(req.user.id, {
      targetRole: targetRole ? String(targetRole) : '',
      domainId: domainId ? String(domainId) : '',
    });

    res.json({
      success: true,
      data: recommendations,
      totalCount: recommendations.length,
    });
  } catch (err) {
    next(err);
  }
};

router.get('/recommendations', requireAuth, handleRecommendations);
router.get('/recommended', requireAuth, handleRecommendations);

router.get('/:id/playlist', (req, res, next) => {
  try {
    const { id } = req.params;
    const items = resourceService.getPlaylistItems(id);
    res.json({
      success: true,
      data: items,
      totalCount: items.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/bookmark', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const collectionName = req.body?.collectionName || 'my_list';
    const result = resourceService.toggleBookmark(req.user.id, id, collectionName);
    res.json({
      success: true,
      data: result,
      message: result.bookmarked ? 'Resource bookmarked' : 'Bookmark removed',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/progress', requireAuth, validateBody(progressSchema), (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, percentComplete, lastPositionSeconds, completedItemIds, notes } = req.body;
    const result = resourceService.updateProgress(req.user.id, id, {
      status,
      percentComplete,
      lastPositionSeconds,
      completedItemIds,
      notes,
    });
    res.json({
      success: true,
      data: result,
      message: `Progress updated to ${status}`,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/add-to-passport', requireAuth, (req, res, next) => {
  try {
    const { id } = req.params;
    const result = resourceService.addLearningEvidenceToPassport(req.user.id, id);
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
