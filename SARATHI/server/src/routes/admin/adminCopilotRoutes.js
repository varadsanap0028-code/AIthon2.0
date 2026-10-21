/**
 * SARATHI Admin Portal — Admin Copilot Routes
 * PRD Phase 9
 */

import express from 'express';
import { AdminCopilotService } from '../../services/admin/adminCopilotService.js';

const router = express.Router();
const copilotService = new AdminCopilotService();

/**
 * GET /api/admin/copilot/sessions
 */
router.get('/sessions', (req, res) => {
  try {
    const sessions = copilotService.listSessions(req.user.id);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * POST /api/admin/copilot/sessions
 */
router.post('/sessions', async (req, res) => {
  try {
    const { message } = req.body;
    const result = await copilotService.processQuery({
      adminId: req.user.id,
      sessionId: null,
      query: message || 'Hello',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * GET /api/admin/copilot/sessions/:id
 */
router.get('/sessions/:id', (req, res) => {
  try {
    const data = copilotService.getSession(req.user.id, req.params.id);
    if (!data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * DELETE /api/admin/copilot/sessions/:id
 */
router.delete('/sessions/:id', (req, res) => {
  try {
    const ok = copilotService.deleteSession(req.user.id, req.params.id);
    if (!ok) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * POST /api/admin/copilot/sessions/:id/messages
 */
router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Message cannot be empty' } });
    }
    const result = await copilotService.processQuery({
      adminId: req.user.id,
      sessionId: req.params.id,
      query: message,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

/**
 * POST /api/admin/copilot/messages/:id/feedback
 */
router.post('/messages/:id/feedback', (req, res) => {
  try {
    const { value, comment } = req.body;
    const ok = copilotService.submitFeedback(req.user.id, req.params.id, { value, comment });
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

export default router;
