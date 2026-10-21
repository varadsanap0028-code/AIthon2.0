import { Router } from 'express';
import { z } from 'zod';
import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const taskProgressItemSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
  completedAt: z.string().nullable().optional(),
  completionType: z.enum(['self_reported', 'verified']).default('self_reported'),
  verifiedBy: z.string().nullable().optional(),
});

const roadmapUpdateSchema = z.object({
  trackKey: z.string().min(1, 'trackKey is required').max(100),
  completedTaskIds: z.array(z.string().max(100)).optional(),
  taskProgress: z.record(z.string(), taskProgressItemSchema).optional(),
  action: z.enum(['toggle', 'complete', 'uncomplete', 'undo', 'sync']).optional(),
  taskId: z.string().max(100).optional(),
  completionType: z.enum(['self_reported', 'verified']).optional(),
});

function parseRowData(row) {
  let completedTaskIds = [];
  let taskProgress = {};

  if (row?.completed_task_ids) {
    try {
      completedTaskIds = JSON.parse(row.completed_task_ids);
      if (!Array.isArray(completedTaskIds)) completedTaskIds = [];
    } catch {
      completedTaskIds = [];
    }
  }

  if (row?.task_progress) {
    try {
      taskProgress = JSON.parse(row.task_progress);
      if (typeof taskProgress !== 'object' || taskProgress === null) taskProgress = {};
    } catch {
      taskProgress = {};
    }
  }

  // Backward compatibility: migrate legacy completed_task_ids into taskProgress as self_reported
  for (const id of completedTaskIds) {
    if (!taskProgress[id]) {
      taskProgress[id] = {
        status: 'completed',
        completedAt: row?.updated_at || new Date().toISOString(),
        completionType: 'self_reported',
      };
    }
  }

  // Ensure completedTaskIds aligns with taskProgress completed items
  const activeCompletedIds = Object.keys(taskProgress).filter(
    (id) => taskProgress[id]?.status === 'completed'
  );
  const unifiedCompletedIds = Array.from(new Set([...completedTaskIds, ...activeCompletedIds]));

  return {
    completedTaskIds: unifiedCompletedIds,
    taskProgress,
    updatedAt: row?.updated_at || null,
  };
}

router.get('/', requireAuth, (req, res, next) => {
  try {
    const userId = req.user.id;
    const { trackKey } = req.query;

    if (trackKey) {
      const row = repository.queryOne(
        'SELECT track_key, completed_task_ids, task_progress, updated_at FROM student_roadmaps WHERE user_id = ? AND track_key = ?;',
        [userId, String(trackKey)]
      );

      const parsed = parseRowData(row);

      return res.json({
        success: true,
        data: {
          trackKey: String(trackKey),
          completedTaskIds: parsed.completedTaskIds,
          taskProgress: parsed.taskProgress,
          updatedAt: parsed.updatedAt,
        },
      });
    }

    const rows = repository.query(
      'SELECT track_key, completed_task_ids, task_progress, updated_at FROM student_roadmaps WHERE user_id = ?;',
      [userId]
    );

    const roadmaps = {};
    for (const row of rows) {
      const parsed = parseRowData(row);
      roadmaps[row.track_key] = parsed.completedTaskIds;
    }

    res.json({
      success: true,
      data: roadmaps,
    });
  } catch (err) {
    next(err);
  }
});

const updateRoadmapHandler = (req, res, next) => {
  try {
    const userId = req.user.id;
    const { trackKey, completedTaskIds, taskProgress, action, taskId, completionType } = req.body;
    const now = new Date().toISOString();

    // Fetch current state for idempotent mutation
    const existingRow = repository.queryOne(
      'SELECT id, completed_task_ids, task_progress, updated_at FROM student_roadmaps WHERE user_id = ? AND track_key = ?;',
      [userId, trackKey]
    );

    const current = parseRowData(existingRow);
    let updatedProgress = { ...current.taskProgress };
    let updatedIdsSet = new Set(current.completedTaskIds);

    const typeToUse = completionType || 'self_reported';

    if (action === 'complete' && taskId) {
      // Idempotent completion
      updatedProgress[taskId] = {
        status: 'completed',
        completedAt: updatedProgress[taskId]?.completedAt || now,
        completionType: typeToUse,
      };
      updatedIdsSet.add(taskId);
    } else if ((action === 'uncomplete' || action === 'undo') && taskId) {
      // Idempotent undo/uncomplete
      updatedProgress[taskId] = {
        status: 'not_started',
      };
      updatedIdsSet.delete(taskId);
    } else if (action === 'toggle' && taskId) {
      if (updatedIdsSet.has(taskId)) {
        // Toggle from completed to incomplete
        updatedProgress[taskId] = {
          status: 'not_started',
        };
        updatedIdsSet.delete(taskId);
      } else {
        // Toggle to completed
        updatedProgress[taskId] = {
          status: 'completed',
          completedAt: now,
          completionType: typeToUse,
        };
        updatedIdsSet.add(taskId);
      }
    } else if (taskProgress) {
      // Direct progress map update
      updatedProgress = { ...taskProgress };
      updatedIdsSet = new Set(
        Object.keys(updatedProgress).filter((k) => updatedProgress[k]?.status === 'completed')
      );
    } else if (completedTaskIds) {
      // Bulk array update (backward-compatible)
      updatedIdsSet = new Set(completedTaskIds);
      // Remove tasks no longer completed
      for (const k of Object.keys(updatedProgress)) {
        if (!updatedIdsSet.has(k)) {
          updatedProgress[k] = { status: 'not_started' };
        }
      }
      // Add newly completed tasks
      for (const id of completedTaskIds) {
        if (!updatedProgress[id] || updatedProgress[id].status !== 'completed') {
          updatedProgress[id] = {
            status: 'completed',
            completedAt: now,
            completionType: typeToUse,
          };
        }
      }
    }

    const finalCompletedIds = Array.from(updatedIdsSet);
    const completedJson = JSON.stringify(finalCompletedIds);
    const progressJson = JSON.stringify(updatedProgress);
    const id = existingRow?.id || `rdm-${uuidv4().slice(0, 8)}`;

    repository.execute(
      `INSERT INTO student_roadmaps (id, user_id, track_key, completed_task_ids, task_progress, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, track_key) DO UPDATE SET
         completed_task_ids = excluded.completed_task_ids,
         task_progress = excluded.task_progress,
         updated_at = excluded.updated_at;`,
      [id, userId, trackKey, completedJson, progressJson, now]
    );

    res.json({
      success: true,
      data: {
        trackKey,
        completedTaskIds: finalCompletedIds,
        taskProgress: updatedProgress,
        updatedAt: now,
      },
      message: 'Roadmap progress saved successfully',
    });
  } catch (err) {
    next(err);
  }
};

router.put('/', requireAuth, validateBody(roadmapUpdateSchema), updateRoadmapHandler);
router.post('/', requireAuth, validateBody(roadmapUpdateSchema), updateRoadmapHandler);
router.post('/task', requireAuth, validateBody(roadmapUpdateSchema), updateRoadmapHandler);

export default router;
