/**
 * SARATHI Admin Portal — Recruiter Trust Score Configuration
 * PRD Section 8.2 item 3
 * Total Max Score: 100 points
 */

export const RECRUITER_TRUST_CONFIG = {
  weights: {
    approvalStatus: {
      max: 35,
      approved: 35,
      waiting: 10,
      rejected: 0,
      none: 0,
    },
    corporateEmail: {
      max: 10,
      verified: 10,
      unverified: 0,
    },
    accountAge: {
      max: 10,
      capDays: 90, // Max points at 90+ days
    },
    completeJobDescriptions: {
      max: 10, // Scaled by fraction of jobs with complete descriptions (> 100 chars)
    },
    hiringVelocity: {
      max: 15, // Share of applications moved past first stage within 14 days
    },
    reasonedRejections: {
      max: 10, // 10 - 10 * (unreasoned rejections / total rejections)
    },
    cleanSupportRecord: {
      max: 10, // 10 if 0 complaints, -5 per complaint down to 0
    },
  },
  bands: {
    trusted: { min: 75, label: 'Trusted', color: 'emerald' },
    watch: { min: 45, max: 74, label: 'Watch', color: 'amber' },
    risky: { max: 44, label: 'Risky', color: 'red' },
  },
};
