import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { AdminSupportService } from '../services/admin/adminSupportService.js';

const router = express.Router();
router.use(requireAuth);

router.get('/active', (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role || 'student';
    const announcements = AdminSupportService.getActiveAnnouncementsForUser(userId, role);
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/:id/dismiss', (req, res) => {
  try {
    const userId = req.user.id;
    const result = AdminSupportService.dismissAnnouncement(req.params.id, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

export default router;
