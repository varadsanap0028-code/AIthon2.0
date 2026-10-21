// studentCopilotJobs.js — open jobs and resource functions
import { repository } from '../data/repository.js';

function getTopResources(trackKey, limit) {
  const lim = limit || 6;
  const rows = repository.query(
    `SELECT id, title, url, provider, level, domain
     FROM learning_resources
     WHERE (LOWER(skill_tags) LIKE ? OR LOWER(domain) LIKE ? OR LOWER(title) LIKE ?)
       AND is_archived = 0
     ORDER BY is_free DESC, last_verified_at DESC
     LIMIT ?`,
    [`%${trackKey}%`, `%${trackKey}%`, `%${trackKey}%`, lim]
  );
  return rows;
}

function getOpenJobs(userId, limit) {
  const lim = limit || 6;
  const targetRole = 'Full-Stack Developer';
  const rows = repository.query(
    `SELECT j.id, j.title, j.experience_level, j.domain_id
     FROM jobs j
     WHERE j.status = 'published' AND j.deleted_at IS NULL
       AND (j.title LIKE ? OR j.description LIKE ? OR j.department LIKE ?)
     ORDER BY j.created_at DESC
     LIMIT ?`,
    [`%${targetRole}%`, `%${targetRole}%`, `%${targetRole}%`, lim]
  );
  return rows;
}

function jobUrl(jobId) {
  return `/student/jobs/${jobId}`;
}

export { getTopResources, getOpenJobs, jobUrl };
