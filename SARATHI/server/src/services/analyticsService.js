import { repository } from '../data/repository.js';

export const analyticsService = {
  /**
   * Computes live, organization-scoped hiring KPIs from persisted database tables.
   */
  getDashboardMetrics(orgId) {
    // 1. Active Job Postings
    const activeJobsRow = repository.queryOne(
      "SELECT COUNT(*) as count FROM jobs WHERE org_id = ? AND status = 'published' AND deleted_at IS NULL;",
      [orgId]
    );
    const activeJobs = activeJobsRow?.count || 0;

    // 2. Total Applicants for the organisation
    const totalApplicantsRow = repository.queryOne(
      "SELECT COUNT(*) as count FROM applications WHERE org_id = ?;",
      [orgId]
    );
    const totalApplicants = totalApplicantsRow?.count || 0;

    // 3. Shortlisted Candidates
    const shortlistedRow = repository.queryOne(
      "SELECT COUNT(DISTINCT candidate_id) as count FROM applications WHERE org_id = ? AND stage = 'shortlisted';",
      [orgId]
    );
    const shortlistedCandidates = shortlistedRow?.count || 0;

    // 4. Skill-Verified Candidates (in applicant pool or system with at least 1 verified skill)
    const skillVerifiedRow = repository.queryOne(
      `SELECT COUNT(DISTINCT a.candidate_id) as count
       FROM applications a
       JOIN candidate_skills cs ON cs.candidate_id = a.candidate_id
       WHERE a.org_id = ? AND cs.verification_status = 'verified';`,
      [orgId]
    );
    const skillVerifiedCandidates = skillVerifiedRow?.count || 0;

    // 5. Pending Assessments (awaiting candidate start, completion, or reviewer evaluation)
    const pendingAssessmentsRow = repository.queryOne(
      "SELECT COUNT(*) as count FROM assessment_assignments WHERE org_id = ? AND status IN ('invited', 'started', 'submitted');",
      [orgId]
    );
    const pendingAssessments = pendingAssessmentsRow?.count || 0;

    // 6. Interviews Scheduled
    const interviewsRow = repository.queryOne(
      "SELECT COUNT(*) as count FROM interviews WHERE org_id = ? AND status = 'scheduled';",
      [orgId]
    );
    const interviewsScheduled = interviewsRow?.count || 0;

    // 7. Hiring Funnel Visualization
    const stageCounts = repository.query(
      `SELECT stage, COUNT(*) as count
       FROM applications
       WHERE org_id = ?
       GROUP BY stage;`,
      [orgId]
    );

    const funnelMap = new Map();
    stageCounts.forEach(s => funnelMap.set(s.stage, s.count));

    const hiringFunnel = [
      { stage: 'Applied', count: totalApplicants, key: 'new_applicant' },
      { stage: 'Under Review', count: funnelMap.get('under_review') || 0, key: 'under_review' },
      { stage: 'Shortlisted', count: shortlistedCandidates, key: 'shortlisted' },
      { stage: 'Assessment', count: (funnelMap.get('assessment_invited') || 0) + (funnelMap.get('assessment_completed') || 0), key: 'assessment' },
      { stage: 'Interview', count: (funnelMap.get('interview_scheduled') || 0) + (funnelMap.get('interview_completed') || 0), key: 'interview' },
      { stage: 'Offer / Hired', count: (funnelMap.get('offer_extended') || 0) + (funnelMap.get('hired') || 0), key: 'hired' },
    ];

    // 8. Recent Applicants
    const recentApplicants = repository.query(
      `SELECT a.id as application_id, a.applied_at, a.stage, a.match_score,
              j.id as job_id, j.title as job_title, j.department,
              u.id as candidate_id, u.full_name, u.email, u.avatar_url,
              cp.headline, cp.experience_years,
              (SELECT COUNT(*) FROM candidate_skills cs WHERE cs.candidate_id = u.id AND cs.verification_status = 'verified') as verified_skill_count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.candidate_id
       JOIN candidate_profiles cp ON cp.id = u.id
       WHERE a.org_id = ?
       ORDER BY a.applied_at DESC
       LIMIT 6;`,
      [orgId]
    );

    // 9. Upcoming Interviews
    const upcomingInterviews = repository.query(
      `SELECT i.*, j.title as job_title, u.full_name as candidate_name, u.avatar_url as candidate_avatar
       FROM interviews i
       JOIN jobs j ON j.id = i.job_id
       JOIN users u ON u.id = i.candidate_id
       WHERE i.org_id = ? AND i.status = 'scheduled'
       ORDER BY i.scheduled_at ASC
       LIMIT 5;`,
      [orgId]
    );

    // 10. Assessments Awaiting Review
    const pendingReviews = repository.query(
      `SELECT se.id as evidence_id, se.title as evidence_title, se.evidence_type, se.reference_url, se.created_at,
              s.name as skill_name, d.title as domain_title,
              u.id as candidate_id, u.full_name as candidate_name, u.avatar_url as candidate_avatar
       FROM skill_evidence se
       JOIN skills s ON s.id = se.skill_id
       JOIN domains d ON d.id = s.domain_id
       JOIN users u ON u.id = se.candidate_id
       WHERE se.verification_status = 'pending_review'
       ORDER BY se.created_at ASC
       LIMIT 5;`
    );

    // 11. Recently Verified Skills
    const recentlyVerified = repository.query(
      `SELECT cs.candidate_id, cs.proficiency, cs.last_verified_at,
              s.name as skill_name, d.title as domain_title,
              u.full_name as candidate_name, u.avatar_url as candidate_avatar
       FROM candidate_skills cs
       JOIN skills s ON s.id = cs.skill_id
       JOIN domains d ON d.id = s.domain_id
       JOIN users u ON u.id = cs.candidate_id
       WHERE cs.verification_status = 'verified' AND cs.last_verified_at IS NOT NULL
       ORDER BY cs.last_verified_at DESC
       LIMIT 6;`
    );

    // 12. Recent Recruitment Activity
    const recentActivity = repository.query(
      `SELECT ae.id, ae.action, ae.resource_type, ae.payload, ae.created_at,
              u.full_name as actor_name
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_id
       WHERE ae.org_id = ? OR ae.org_id IS NULL
       ORDER BY ae.created_at DESC
       LIMIT 8;`,
      [orgId]
    ).map(a => ({
      ...a,
      payload: JSON.parse(a.payload || '{}'),
    }));

    return {
      kpiCards: {
        activeJobs,
        totalApplicants,
        shortlistedCandidates,
        skillVerifiedCandidates,
        pendingAssessments,
        interviewsScheduled,
      },
      hiringFunnel,
      recentApplicants,
      upcomingInterviews,
      pendingReviews,
      recentlyVerified,
      recentActivity,
    };
  }
};
