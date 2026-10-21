import { repository } from '../repository.js';
import { catalogResources } from './resourceCatalog.js';

/**
 * Idempotently seeds or updates the learning resources catalog by slug.
 * Preserves user bookmarks, progress, and custom data completely intact.
 */
export function seedLearningResources() {
  const now = new Date().toISOString();

  repository.transaction((repo) => {
    for (const r of catalogResources) {
      const slug = r.slug || r.id;
      const targetId = r.id || `res-${slug}`;
      const skillTagsJson = JSON.stringify(r.skill_tags || []);
      const learningObjectivesJson = JSON.stringify(r.learning_objectives || []);
      const prerequisitesJson = JSON.stringify(r.prerequisites || []);
      const resourceType = r.resource_type || r.type || 'documentation';
      const source = r.source || (r.youtube_video_id || r.youtube_playlist_id ? 'youtube' : 'web');
      const isFree = r.is_free !== undefined ? (r.is_free ? 1 : 0) : 1;

      // Find by slug OR by id to cleanly handle schema transitions
      const existing = repo.queryOne(
        'SELECT id, slug FROM learning_resources WHERE slug = ? OR id = ?;',
        [slug, targetId]
      );

      let effectiveId = targetId;

      if (existing) {
        effectiveId = existing.id;
        repo.execute(
          `UPDATE learning_resources SET
            slug = ?,
            domain = ?,
            skill_tags = ?,
            title = ?,
            provider = ?,
            type = ?,
            resource_type = ?,
            source = ?,
            url = ?,
            is_free = ?,
            level = ?,
            duration = ?,
            duration_minutes = ?,
            language = ?,
            description = ?,
            learning_objectives = ?,
            prerequisites = ?,
            youtube_video_id = ?,
            youtube_playlist_id = ?,
            channel_name = ?,
            thumbnail_url = ?,
            last_verified_at = ?
          WHERE id = ?;`,
          [
            slug,
            r.domain,
            skillTagsJson,
            r.title,
            r.provider,
            r.type || resourceType,
            resourceType,
            source,
            r.url,
            isFree,
            r.level || 'Beginner',
            r.duration || '',
            r.duration_minutes || 0,
            r.language || 'English',
            r.description || '',
            learningObjectivesJson,
            prerequisitesJson,
            r.youtube_video_id || null,
            r.youtube_playlist_id || null,
            r.channel_name || null,
            r.thumbnail_url || null,
            r.last_verified_at || now,
            effectiveId
          ]
        );
      } else {
        repo.execute(
          `INSERT INTO learning_resources (
            id, slug, domain, skill_tags, title, provider, type, resource_type, source,
            url, is_free, level, duration, duration_minutes, language, description,
            learning_objectives, prerequisites, youtube_video_id, youtube_playlist_id,
            channel_name, thumbnail_url, last_verified_at, created_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
          );`,
          [
            effectiveId,
            slug,
            r.domain,
            skillTagsJson,
            r.title,
            r.provider,
            r.type || resourceType,
            resourceType,
            source,
            r.url,
            isFree,
            r.level || 'Beginner',
            r.duration || '',
            r.duration_minutes || 0,
            r.language || 'English',
            r.description || '',
            learningObjectivesJson,
            prerequisitesJson,
            r.youtube_video_id || null,
            r.youtube_playlist_id || null,
            r.channel_name || null,
            r.thumbnail_url || null,
            r.last_verified_at || now,
            now
          ]
        );
      }

      // If playlist items are defined, upsert them
      if (resourceType === 'playlist' && Array.isArray(r.playlist_items) && r.playlist_items.length > 0) {
        for (const item of r.playlist_items) {
          const itemId = `${effectiveId}-item-${item.position}`;
          repo.execute(
            `INSERT INTO resource_playlist_items (
              id, resource_id, position, video_id, title, duration_minutes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              position = excluded.position,
              video_id = excluded.video_id,
              title = excluded.title,
              duration_minutes = excluded.duration_minutes;`,
            [
              itemId,
              effectiveId,
              item.position,
              item.video_id,
              item.title,
              item.duration_minutes || 0,
              now
            ]
          );
        }
      }
    }
  });

  const total = repository.queryOne('SELECT COUNT(*) as count FROM learning_resources;');
  return { seeded: true, count: total?.count || catalogResources.length };
}
