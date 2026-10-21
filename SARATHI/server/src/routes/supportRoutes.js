import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { AdminSupportService } from '../services/admin/adminSupportService.js';

const router = express.Router();
router.use(requireAuth);

// =================== TICKETS ===================
router.post('/tickets', (req, res) => {
  try {
    const requesterId = req.user.id;
    const role = req.user.role;
    const ticket = AdminSupportService.createTicket({
      requesterId,
      role,
      category: req.body.category,
      subject: req.body.subject,
      body: req.body.body,
      priority: req.body.priority || 'normal'
    });
    res.status(201).json({ ticket });
  } catch (err) {
    res.status(err.status || 400).json({ error: { message: err.message } });
  }
});

router.get('/tickets', (req, res) => {
  try {
    const requesterId = req.user.id;
    const tickets = AdminSupportService.listUserTickets(requesterId);
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/tickets/:id', (req, res) => {
  try {
    const requesterId = req.user.id;
    const ticket = AdminSupportService.getUserTicket(req.params.id, requesterId);
    if (!ticket) {
      return res.status(404).json({ error: { message: 'Ticket not found or unauthorized' } });
    }
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/tickets/:id/reply', (req, res) => {
  try {
    const requesterId = req.user.id;
    const role = req.user.role;
    const ticket = AdminSupportService.userReplyTicket(req.params.id, requesterId, role, req.body.body);
    res.json({ ticket });
  } catch (err) {
    res.status(err.status || 400).json({ error: { message: err.message } });
  }
});

router.post('/tickets/:id/close', (req, res) => {
  try {
    const requesterId = req.user.id;
    const result = AdminSupportService.closeUserTicket(req.params.id, requesterId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

export default router;
