export type CollegeRole = 'admin' | 'tpo' | 'hod';

export type Branch = 'CSE' | 'IT' | 'AI/DS' | 'ECE';

export type DriveStatus = 'upcoming' | 'in_progress' | 'completed';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'interviewed' | 'offered' | 'placed' | 'rejected';

export type RemediationStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'dismissed';

export type CurriculumRecommendationStatus = 'accepted' | 'planned' | 'dismissed';

export type AggregationScope = 'institution' | 'branch' | 'role';

export interface CollegeUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'college';
  collegeRole?: CollegeRole;
  branch?: Branch;
  institution: string;
  institutionId: string;
  status?: 'active' | 'suspended' | 'pending_approval';
}

export interface CollegeKPIs {
  totalStudents: number;
  assessedStudentsCount: number;
  assessmentRate: number;
  avgReadinessScore: number;
  placedStudentsCount: number;
  placementRate: number;
  verifiedSkillsCount: number;
  activeApplicationsCount: number;
  verifiedPassportRate?: number;
  verifiedPassportCount?: number;
  offersAccepted?: number;
  activeInPipeline?: number;
  partnerCompanies?: number;
}

export interface CollegeDepartment {
  id: string;
  name: string;
  code: Branch | string;
  studentsCount: number;
  assessedRate: number | null;
  avgReadiness: number | null;
  placedRate: number | null;
  topSkill: string | null;
  atRiskCount: number | null;
  leadingCompetencies?: string[];
  suppressed?: boolean;
  notice?: string;
}

export interface CollegeReadinessTrendPoint {
  period: string;
  score: number;
}

export interface CollegePlacementDrive {
  id: string;
  company: string;
  role: string;
  packageLpa: number;
  status: DriveStatus;
  eligibility: {
    branches: Branch[];
    minReadiness: number;
    requiredSkills: string[];
    verifiedPassportRequired: boolean;
  };
  applications: number;
  eligibleStudents: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollegeAtRiskStudent {
  id: string;
  name: string;
  email: string;
  branch: Branch;
  readinessScore: number;
  benchmark: number;
  missingCompetencies: string[];
  remediationStatus: RemediationStatus;
  remediationId?: string;
  assignedAt?: string;
}

export interface CollegeSkillGap {
  skill: string;
  branch: Branch;
  cohortAvg: number;
  industryDemand: number;
  severity: 'high' | 'medium' | 'low';
  gapPercentage: number;
}

export interface CollegeCurriculumRecommendation {
  id: string;
  skill: string;
  type: 'lab_update' | 'capstone_rubric' | 'bootcamp';
  title: string;
  description: string;
  status: CurriculumRecommendationStatus;
  branches: Branch[];
  createdAt: string;
}

export interface CollegeTechnicalDomain {
  skill: string;
  cohortAvg: number;
  benchmark: number;
  studentCount: number;
}

export interface CollegeAnalyticsResponse {
  success: boolean;
  data: {
    institutionId: string;
    institutionName: string;
    minCohortMet: boolean;
    minCohortRequired: number;
    notice?: string;
    lastSyncedAt?: string;
    kpis: CollegeKPIs;
    departments: CollegeDepartment[];
    readinessTrend: CollegeReadinessTrendPoint[];
    placementDrives: CollegePlacementDrive[];
    skillGapMatrix: CollegeSkillGap[];
    technicalDomains: CollegeTechnicalDomain[];
    atRiskCount: number;
    atRiskStudents?: CollegeAtRiskStudent[];
    roster: Array<{
      id: string;
      name: string;
      email: string;
      degree: string;
      graduationYear: number;
      targetRole: string;
      status: string;
      branch?: Branch;
    }>;
  };
}

export interface CollegeQueryParams {
  branch?: Branch;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
