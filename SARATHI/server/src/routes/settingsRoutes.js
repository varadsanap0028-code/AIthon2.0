import { Router } from 'express';
import { z } from 'zod';
import { repository } from '../data/repository.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const settingsUpdateSchema = z.object({
  emailDigest: z.boolean().optional(),
  roadmapReminders: z.boolean().optional(),
  jobAlerts: z.boolean().optional(),
});

router.get('/', requireAuth, (req, res, next) => {
  try {
    const userId = req.user.id;
    let row = repository.queryOne(
      'SELECT email_digest, roadmap_reminders, job_alerts, updated_at FROM user_settings WHERE user_id = ?;',
      [userId]
    );

    if (!row) {
      const now = new Date().toISOString();
      repository.execute(
        `INSERT INTO user_settings (user_id, email_digest, roadmap_reminders, job_alerts, updated_at)
         VALUES (?, 1, 1, 1, ?)
         ON CONFLICT(user_id) DO NOTHING;`,
        [userId, now]
      );
      row = {
        email_digest: 1,
        roadmap_reminders: 1,
        job_alerts: 1,
        updated_at: now,
      };
    }

    res.json({
      success: true,
      data: {
        emailDigest: Boolean(row.email_digest),
        roadmapReminders: Boolean(row.roadmap_reminders),
        jobAlerts: Boolean(row.job_alerts),
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireAuth, validateBody(settingsUpdateSchema), (req, res, next) => {
  try {
    const userId = req.user.id;
    const { emailDigest, roadmapReminders, jobAlerts } = req.body;
    const now = new Date().toISOString();

    let current = repository.queryOne(
      'SELECT email_digest, roadmap_reminders, job_alerts FROM user_settings WHERE user_id = ?;',
      [userId]
    );

    const newEmailDigest = emailDigest !== undefined ? (emailDigest ? 1 : 0) : (current ? current.email_digest : 1);
    const newRoadmapReminders = roadmapReminders !== undefined ? (roadmapReminders ? 1 : 0) : (current ? current.roadmap_reminders : 1);
    const newJobAlerts = jobAlerts !== undefined ? (jobAlerts ? 1 : 0) : (current ? current.job_alerts : 1);

    repository.execute(
      `INSERT INTO user_settings (user_id, email_digest, roadmap_reminders, job_alerts, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email_digest = excluded.email_digest,
         roadmap_reminders = excluded.roadmap_reminders,
         job_alerts = excluded.job_alerts,
         updated_at = excluded.updated_at;`,
      [userId, newEmailDigest, newRoadmapReminders, newJobAlerts, now]
    );

    res.json({
      success: true,
      data: {
        emailDigest: Boolean(newEmailDigest),
        roadmapReminders: Boolean(newRoadmapReminders),
        jobAlerts: Boolean(newJobAlerts),
        updatedAt: now,
      },
      message: 'Settings updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
