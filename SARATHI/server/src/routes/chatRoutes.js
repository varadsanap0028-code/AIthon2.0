import { Router } from 'express';
import {
  handleChatMessage,
  getAIProviderConfig,
  getChatSuggestions,
} from '../services/aiChatService.js';

const router = Router();

/**
 * GET /api/chat/status
 * Check AI provider configuration and availability
 */
router.get('/status', (req, res) => {
  const config = getAIProviderConfig();

  res.json({
    status: 'ok',
    configured: config.configured,
    provider: config.provider,
    model: config.model,
    authenticated: Boolean(req.user),
    userRole: req.user?.globalRole || req.user?.orgRole || null,
    requiresApiKey: !config.configured,
    notice: config.configured
      ? `Live AI provider active (${config.provider} / ${config.model})`
      : 'Operating in Local Sarathi Knowledge Mode. Add GEMINI_API_KEY to server/.env for live LLM responses.',
  });
});

/**
 * GET /api/chat/suggestions
 * Retrieve suggested starter prompts based on role and domain
 */
router.get('/suggestions', (req, res) => {
  const role = req.query.role || req.user?.globalRole || req.user?.orgRole || 'student';
  const domain = req.query.domain || null;
  const suggestions = getChatSuggestions(role, domain);

  res.json({
    status: 'ok',
    data: suggestions,
  });
});

/**
 * POST /api/chat/message
 * Send message to Sarathi AI Copilot
 */
router.post('/message', async (req, res, next) => {
  try {
    const { message, conversationHistory, clientContext } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        error: 'Message text is required and cannot be empty.',
        code: 'VALIDATION_ERROR',
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

    const reply = await handleChatMessage({
      message,
      conversationHistory,
      clientContext,
      user: req.user || null,
      ip: String(clientIp),
    });

    res.json({
      success: true,
      data: reply,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        code: err.isProviderError ? 'AI_PROVIDER_ERROR' : (err.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'CHAT_ERROR'),
        retryAfter: err.retryAfter,
      });
    }
    next(err);
  }
});

export default router;
