import { Router } from 'express';
import { notificationService } from '../services/notificationService.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, (req, res, next) => {
  try {
    const result = notificationService.getNotifications(req.user.id);
    res.json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', requireAuth, (req, res, next) => {
  try {
    const result = notificationService.markAsRead(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
      message: 'Notification marked as read',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', requireAuth, (req, res, next) => {
  try {
    const result = notificationService.markAllAsRead(req.user.id);
    res.json({
      success: true,
      data: result,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
