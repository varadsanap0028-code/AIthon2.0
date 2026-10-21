import { Router } from 'express';
import { z } from 'zod';
import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const feedbackSchema = z.object({
  category: z.enum(['bug', 'feature_request', 'ux_improvement', 'content', 'other']),
  message: z.string().min(5, 'Feedback message must be at least 5 characters long').max(2000),
});

router.post('/', validateBody(feedbackSchema), (req, res, next) => {
  try {
    const { category, message } = req.body;
    const userId = req.user?.id || null;
    const id = `fb-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    repository.execute(
      `INSERT INTO feedback (id, user_id, category, message, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, userId, category, message.trim(), now]
    );

    res.status(201).json({
      success: true,
      data: { id, category, createdAt: now },
      message: 'Thank you for your feedback! Our team reviews all suggestions to improve Sarathi.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
