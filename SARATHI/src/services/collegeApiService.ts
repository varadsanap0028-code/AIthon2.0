import { apiClient } from './apiClient';
import type {
  CollegePlacementDrive,
  CollegeAtRiskStudent,
  CollegeCurriculumRecommendation,
  DriveStatus,
  RemediationStatus,
} from '../types/college';

export interface CollegeSettings {
  institutionId: string | null;
  institutionName: string;
  benchmarkThreshold: number;
  branches: string[];
  batchYear: number;
  updatedAt: string | null;
}

export interface CollegeUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  institution: string;
  status: string;
  createdAt: string;
}

export const collegeApi = {
  listDrives: (status?: DriveStatus | null) =>
    apiClient.get<{ success: boolean; data: CollegePlacementDrive[] }>('/api/analytics/college/drives', {
      params: status ? { status } : undefined,
    }),

  createDrive: (input: {
    company: string;
    role: string;
    packageLpa?: number;
    status?: DriveStatus;
    branches?: string[];
    minReadiness?: number;
    requiredSkills?: string[];
    verifiedPassportRequired?: boolean;
    startDate?: string;
    endDate?: string;
  }) => apiClient.post<{ success: boolean; data: CollegePlacementDrive }>('/api/analytics/college/drives', input),

  updateDrive: (id: string, patch: Partial<{ company: string; role: string; packageLpa: number; status: DriveStatus; minReadiness: number; branches: string[]; requiredSkills: string[]; verifiedPassportRequired: boolean; startDate: string; endDate: string }>) =>
    apiClient.patch<{ success: boolean; data: CollegePlacementDrive }>(`/api/analytics/college/drives/${id}`, patch),

  eligibleStudents: (driveId: string) =>
    apiClient.get<{ success: boolean; data: { suppressed: boolean; notice?: string; students: Array<{ id: string; name: string; email: string; branch: string; readinessScore: number; targetRole: string }> } }>(
      `/api/analytics/college/drives/${driveId}/eligible`
    ),

  atRisk: (benchmark = 60) =>
    apiClient.get<{ success: boolean; data: { benchmark: number; suppressed: boolean; notice?: string; students: CollegeAtRiskStudent[]; totalCount: number } }>(
      '/api/analytics/college/at-risk',
      { params: { benchmark } }
    ),

  assignRemediation: (input: { candidateId: string; missingSkills?: string[]; benchmark?: number }) =>
    apiClient.post<{ success: boolean; data: { id: string; status: RemediationStatus } }>('/api/analytics/college/remediation', input),

  updateRemediation: (id: string, status: RemediationStatus) =>
    apiClient.patch<{ success: boolean; data: { id: string; status: RemediationStatus } }>(`/api/analytics/college/remediation/${id}`, { status }),

  curriculum: () =>
    apiClient.get<{ success: boolean; data: CollegeCurriculumRecommendation[] }>('/api/analytics/college/curriculum'),

  updateCurriculum: (id: string, status: 'accepted' | 'planned' | 'dismissed') =>
    apiClient.patch<{ success: boolean; data: { id: string; status: string } }>(`/api/analytics/college/curriculum/${id}`, { status }),

  settings: () =>
    apiClient.get<{ success: boolean; data: CollegeSettings }>('/api/analytics/college/settings'),

  updateSettings: (input: { benchmarkThreshold?: number; branches?: string[]; batchYear?: number }) =>
    apiClient.put<{ success: boolean; data: CollegeSettings }>('/api/analytics/college/settings', input),

  users: () =>
    apiClient.get<{ success: boolean; data: CollegeUser[] }>('/api/analytics/college/users'),
};
