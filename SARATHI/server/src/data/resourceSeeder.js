import { catalogResources } from './seeds/resourceCatalog.js';
import { seedLearningResources as internalSeed } from './seeds/resourceSeeder.js';

export const canonicalResources = catalogResources.map(r => ({
  id: r.id || `res-${r.slug}`,
  domain: r.domain,
  skill_tags: JSON.stringify(r.skill_tags || []),
  title: r.title,
  provider: r.provider,
  type: r.type || r.resource_type || 'documentation',
  resource_type: r.resource_type || r.type || 'documentation',
  source: r.source || 'web',
  url: r.url,
  is_free: r.is_free !== undefined ? (r.is_free ? 1 : 0) : 1,
  level: r.level || 'Beginner',
  duration: r.duration || '',
  duration_minutes: r.duration_minutes || 0,
  language: r.language || 'English',
  description: r.description || '',
  learning_objectives: JSON.stringify(r.learning_objectives || []),
  prerequisites: JSON.stringify(r.prerequisites || []),
  youtube_video_id: r.youtube_video_id || null,
  youtube_playlist_id: r.youtube_playlist_id || null,
  channel_name: r.channel_name || null,
  thumbnail_url: r.thumbnail_url || null,
  last_verified_at: r.last_verified_at || null
}));

export function seedLearningResources() {
  return internalSeed();
}
