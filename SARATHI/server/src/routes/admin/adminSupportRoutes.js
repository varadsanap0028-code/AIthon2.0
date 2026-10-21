import express from 'express';
import { AdminSupportService } from '../../services/admin/adminSupportService.js';

const router = express.Router();

// =================== TICKETS ===================
router.get('/tickets', (req, res) => {
  try {
    const result = AdminSupportService.listAdminTickets(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/tickets/stats', (req, res) => {
  try {
    const stats = AdminSupportService.getSupportStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.get('/tickets/:id', (req, res) => {
  try {
    const ticket = AdminSupportService.getAdminTicketDetail(req.params.id);
    if (!ticket) return res.status(404).json({ error: { message: 'Ticket not found' } });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/tickets/:id/reply', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminSupportService.adminReplyTicket(req.params.id, adminId, req.body, req);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.patch('/tickets/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminSupportService.updateTicket(req.params.id, adminId, req.body, req);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.post('/tickets/bulk', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminSupportService.bulkUpdateTickets(adminId, req.body, req);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// =================== CANNED RESPONSES ===================
router.get('/canned', (req, res) => {
  try {
    const canned = AdminSupportService.listCannedResponses();
    res.json({ canned });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/canned', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const item = AdminSupportService.createCannedResponse(adminId, req.body, req);
    res.status(201).json({ item });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.delete('/canned/:id', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const result = AdminSupportService.deleteCannedResponse(req.params.id, adminId, req);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

// =================== ANNOUNCEMENTS ===================
router.get('/announcements', (req, res) => {
  try {
    const announcements = AdminSupportService.listAnnouncements();
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
});

router.post('/announcements', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const announcement = AdminSupportService.createAnnouncement(adminId, req.body, req);
    res.status(201).json({ announcement });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

router.patch('/announcements/:id/toggle', (req, res) => {
  try {
    const adminId = req.user?.id || 'usr-admin-seed';
    const announcement = AdminSupportService.toggleAnnouncementActive(req.params.id, adminId, req.body.active, req);
    res.json({ announcement });
  } catch (err) {
    res.status(400).json({ error: { message: err.message } });
  }
});

export default router;
