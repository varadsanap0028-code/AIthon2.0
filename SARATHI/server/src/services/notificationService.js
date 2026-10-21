import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

export const notificationService = {
  getNotifications(userId, { limit = 30 } = {}) {
    // If no notifications exist for this user, seed helpful initial notifications
    const existingCount = repository.queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?;',
      [userId]
    );

    if (!existingCount || existingCount.count === 0) {
      const now = new Date();
      const t1 = new Date(now.getTime() - 1000 * 60 * 30).toISOString(); // 30 mins ago
      const t2 = new Date(now.getTime() - 1000 * 60 * 120).toISOString(); // 2 hours ago

      repository.transaction((repo) => {
        repo.execute(
          `INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `notif-${uuidv4().slice(0, 8)}`,
            userId,
            'success',
            'Welcome to Sarathi Student Portal!',
            'Explore career roadmaps, take diagnostic skill assessments, and build your verified Skill Passport.',
            '/student/roadmap',
            0,
            t2,
          ]
        );

        repo.execute(
          `INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            `notif-${uuidv4().slice(0, 8)}`,
            userId,
            'info',
            'Curated Learning Resources Available',
            'Check out our verified library of tutorials, handbooks, and courses to accelerate your skills.',
            '/student/resources',
            0,
            t1,
          ]
        );
      });
    }

    const notifications = repository.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?;',
      [userId, limit]
    );

    const unreadCountRow = repository.queryOne(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0;',
      [userId]
    );

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      })),
      unreadCount: unreadCountRow?.unread_count || 0,
    };
  },

  createNotification({ userId, type = 'info', title, body, link = null }) {
    const id = `notif-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    repository.execute(
      `INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?);`,
      [id, userId, type, title, body, link, now]
    );

    return {
      id,
      userId,
      type,
      title,
      body,
      link,
      isRead: false,
      createdAt: now,
    };
  },

  markAsRead(userId, notificationId) {
    repository.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?;',
      [userId, notificationId]
    );
    return { success: true, notificationId };
  },

  markAllAsRead(userId) {
    repository.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0;',
      [userId]
    );
    return { success: true };
  },
};
