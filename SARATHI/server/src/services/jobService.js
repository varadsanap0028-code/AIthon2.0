import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

const VALID_TRANSITIONS = {
  draft: ['published', 'archived'],
  published: ['paused', 'closed', 'archived'],
  paused: ['published', 'closed', 'archived'],
  closed: ['published', 'archived'],
  archived: [] // terminal
};

export const jobService = {
  getJobs(orgId, { status, domainId, search, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT j.*, d.title as domain_title, u.full_name as creator_name,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicant_count,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.stage = 'shortlisted') as shortlisted_count
      FROM jobs j
      LEFT JOIN domains d ON d.id = j.domain_id
      LEFT JOIN users u ON u.id = j.creator_id
      WHERE j.org_id = ? AND j.deleted_at IS NULL
    `;
    const params = [orgId];

    if (status && status !== 'all') {
      sql += ' AND j.status = ?';
      params.push(status);
    }
    if (domainId) {
      sql += ' AND j.domain_id = ?';
      params.push(domainId);
    }
    if (search) {
      sql += ' AND (j.title LIKE ? OR j.description LIKE ? OR j.department LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    const jobs = repository.query(sql, params);
    return jobs.map(j => ({
      ...j,
      responsibilities: JSON.parse(j.responsibilities || '[]'),
    }));
  },

  getPublicJobs({ domainId, search, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT j.id, j.title, j.description, j.department, j.domain_id,
             j.experience_level, j.employment_type, j.work_arrangement,
             j.location, j.salary_min, j.salary_max, j.currency,
             j.application_deadline, j.status, j.created_at, j.updated_at,
             o.id as org_id, o.name as company_name,
             d.title as domain_title
      FROM jobs j
      JOIN organisations o ON o.id = j.org_id
      LEFT JOIN domains d ON d.id = j.domain_id
      WHERE j.status = 'published' AND j.deleted_at IS NULL
    `;
    const params = [];

    if (domainId) {
      sql += ' AND j.domain_id = ?';
      params.push(domainId);
    }
    if (search) {
      sql += ' AND (j.title LIKE ? OR j.description LIKE ? OR o.name LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    const jobs = repository.query(sql, params);

    return jobs.map(job => {
      const requirements = repository.query(
        `SELECT r.skill_id, r.requirement_type, r.target_proficiency, r.weight,
                s.name as skill_name, s.category as skill_category
         FROM job_skill_requirements r
         JOIN skills s ON s.id = r.skill_id
         WHERE r.job_id = ?
         ORDER BY r.requirement_type DESC, s.name ASC;`,
        [job.id]
      );

      return {
        ...job,
        required_skills: requirements.map(r => r.skill_name),
        skill_requirements: requirements,
      };
    });
  },

  getPublicJobById(jobId) {
    const job = repository.queryOne(
      `SELECT j.id, j.title, j.description, j.responsibilities, j.department, j.domain_id,
              j.experience_level, j.employment_type, j.work_arrangement,
              j.location, j.salary_min, j.salary_max, j.currency,
              j.application_deadline, j.status, j.created_at, j.updated_at,
              o.id as org_id, o.name as company_name,
              d.title as domain_title
       FROM jobs j
       JOIN organisations o ON o.id = j.org_id
       LEFT JOIN domains d ON d.id = j.domain_id
       WHERE j.id = ? AND j.status = 'published' AND j.deleted_at IS NULL;`,
      [jobId]
    );

    if (!job) return null;

    const requirements = repository.query(
      `SELECT r.skill_id, r.requirement_type, r.target_proficiency, r.weight,
              s.name as skill_name, s.category as skill_category, d.title as domain_title
       FROM job_skill_requirements r
       JOIN skills s ON s.id = r.skill_id
       JOIN domains d ON d.id = s.domain_id
       WHERE r.job_id = ?
       ORDER BY r.requirement_type DESC, r.weight DESC, s.name ASC;`,
      [jobId]
    );

    return {
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      required_skills: requirements.map(r => r.skill_name),
      skill_requirements: requirements,
    };
  },

  getJobById(orgId, jobId) {
    const job = repository.queryOne(
      `SELECT j.*, d.title as domain_title, u.full_name as creator_name,
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applicant_count
       FROM jobs j
       LEFT JOIN domains d ON d.id = j.domain_id
       LEFT JOIN users u ON u.id = j.creator_id
       WHERE j.id = ? AND j.org_id = ? AND j.deleted_at IS NULL;`,
      [jobId, orgId]
    );

    if (!job) return null;

    const requirements = repository.query(
      `SELECT r.*, s.name as skill_name, s.category as skill_category, d.title as domain_title
       FROM job_skill_requirements r
       JOIN skills s ON s.id = r.skill_id
       JOIN domains d ON d.id = s.domain_id
       WHERE r.job_id = ?
       ORDER BY r.requirement_type DESC, r.weight DESC, s.name ASC;`,
      [jobId]
    );

    return {
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      skills: requirements.map(r => ({
        ...r,
        accepted_evidence_types: JSON.parse(r.accepted_evidence_types || '[]'),
      }))
    };
  },

  createJob(orgId, creatorId, data) {
    const id = `job-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const {
      title,
      description,
      responsibilities = [],
      department = 'Engineering',
      domainId = null,
      experienceLevel = 'mid',
      employmentType = 'full_time',
      workArrangement = 'hybrid',
      location = 'Bangalore, India',
      salaryMin = null,
      salaryMax = null,
      currency = 'INR',
      applicationDeadline = null,
      status = 'draft',
      skills = []
    } = data;

    if (!title || !description) {
      throw new Error('Job title and description are required');
    }

    repository.transaction((repo) => {
      repo.execute(
        `INSERT INTO jobs (
          id, org_id, creator_id, title, description, responsibilities, department, domain_id,
          experience_level, employment_type, work_arrangement, location, salary_min, salary_max,
          currency, application_deadline, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id, orgId, creatorId, title.trim(), description.trim(),
          JSON.stringify(responsibilities), department, domainId,
          experienceLevel, employmentType, workArrangement, location,
          salaryMin, salaryMax, currency, applicationDeadline, status,
          now, now
        ]
      );

      // Insert skill requirements
      for (const skillReq of skills) {
        const reqId = `jsr-${uuidv4().slice(0, 8)}`;
        repo.execute(
          `INSERT INTO job_skill_requirements (
            id, job_id, skill_id, requirement_type, target_proficiency, weight,
            accepted_evidence_types, assessment_required, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            reqId, id, skillReq.skillId, skillReq.requirementType || 'required',
            Number(skillReq.targetProficiency || 3), Number(skillReq.weight || 1.0),
            JSON.stringify(skillReq.acceptedEvidenceTypes || []),
            skillReq.assessmentRequired ? 1 : 0,
            now, now
          ]
        );
      }
    });

    return this.getJobById(orgId, id);
  },

  updateJob(orgId, jobId, data) {
    const existing = this.getJobById(orgId, jobId);
    if (!existing) {
      throw new Error('Job not found or access denied');
    }

    const now = new Date().toISOString();

    repository.transaction((repo) => {
      if (data.status && data.status !== existing.status) {
        const allowed = VALID_TRANSITIONS[existing.status] || [];
        if (!allowed.includes(data.status)) {
          throw new Error(`Invalid status transition from ${existing.status} to ${data.status}`);
        }
      }

      repo.execute(
        `UPDATE jobs SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          responsibilities = COALESCE(?, responsibilities),
          department = COALESCE(?, department),
          domain_id = COALESCE(?, domain_id),
          experience_level = COALESCE(?, experience_level),
          employment_type = COALESCE(?, employment_type),
          work_arrangement = COALESCE(?, work_arrangement),
          location = COALESCE(?, location),
          salary_min = COALESCE(?, salary_min),
          salary_max = COALESCE(?, salary_max),
          currency = COALESCE(?, currency),
          application_deadline = COALESCE(?, application_deadline),
          status = COALESCE(?, status),
          updated_at = ?
        WHERE id = ? AND org_id = ?;`,
        [
          data.title?.trim() || null,
          data.description?.trim() || null,
          data.responsibilities ? JSON.stringify(data.responsibilities) : null,
          data.department || null,
          data.domainId || null,
          data.experienceLevel || null,
          data.employmentType || null,
          data.workArrangement || null,
          data.location || null,
          data.salaryMin !== undefined ? data.salaryMin : null,
          data.salaryMax !== undefined ? data.salaryMax : null,
          data.currency || null,
          data.applicationDeadline || null,
          data.status || null,
          now,
          jobId,
          orgId
        ]
      );

      // If skills array is explicitly provided, update requirements
      if (Array.isArray(data.skills)) {
        repo.execute('DELETE FROM job_skill_requirements WHERE job_id = ?;', [jobId]);
        for (const skillReq of data.skills) {
          const reqId = `jsr-${uuidv4().slice(0, 8)}`;
          repo.execute(
            `INSERT INTO job_skill_requirements (
              id, job_id, skill_id, requirement_type, target_proficiency, weight,
              accepted_evidence_types, assessment_required, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              reqId, jobId, skillReq.skillId, skillReq.requirementType || 'required',
              Number(skillReq.targetProficiency || 3), Number(skillReq.weight || 1.0),
              JSON.stringify(skillReq.acceptedEvidenceTypes || []),
              skillReq.assessmentRequired ? 1 : 0,
              now, now
            ]
          );
        }
      }
    });

    return this.getJobById(orgId, jobId);
  },

  deleteJob(orgId, jobId) {
    const existing = this.getJobById(orgId, jobId);
    if (!existing) {
      throw new Error('Job not found or access denied');
    }
    const now = new Date().toISOString();
    repository.execute(
      "UPDATE jobs SET deleted_at = ?, status = 'archived', updated_at = ? WHERE id = ? AND org_id = ?;",
      [now, now, jobId, orgId]
    );
    return { success: true, id: jobId };
  }
};
