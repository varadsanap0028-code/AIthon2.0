import { apiClient } from './apiClient';

export interface SavedResumeDraft {
  id: string;
  userId: string;
  title: string;
  targetRole?: string;
  templateId: 'modern-ats' | 'technical' | 'fresher';
  sectionsConfig: {
    summary?: boolean;
    skills?: boolean;
    projects?: boolean;
    experience?: boolean;
    education?: boolean;
    certifications?: boolean;
    assessments?: boolean;
    order?: string[];
  };
  customContent?: {
    headline?: string;
    summary?: string;
    experienceItems?: Array<{
      id: string;
      role: string;
      company: string;
      duration: string;
      description: string;
    }>;
    customProjectBullets?: Record<string, string>;
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompiledResumeData {
  personalInfo: {
    fullName: string;
    headline: string;
    email: string;
    location: string;
    bio: string;
    githubUrl: string;
    linkedinUrl: string;
    portfolioUrl: string;
    targetRole: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    graduationYear: string | number;
    location: string;
  }>;
  skillsByCategory: Record<string, Array<{
    id: string;
    name: string;
    category: string;
    proficiency: number;
    verificationStatus: string;
    evidenceCount: number;
  }>>;
  skillsList: Array<{
    name: string;
    proficiency: number;
    verificationStatus: string;
    category: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    repositoryUrl: string;
    liveDemoUrl?: string | null;
    technologies: string[];
    verificationStatus: string;
    type: string;
  }>;
  passedAssessments: Array<{
    id: string;
    title: string;
    domain: string;
    score: number;
    maxScore: number;
    completedAt: string;
  }>;
}

export class ResumeApiService {
  public static async listResumes(): Promise<SavedResumeDraft[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: SavedResumeDraft[] }>('/api/resumes');
      return res?.data || [];
    } catch {
      return [];
    }
  }

  public static async getResume(id: string): Promise<SavedResumeDraft | null> {
    try {
      const res = await apiClient.get<{ success: boolean; data: SavedResumeDraft }>(`/api/resumes/${id}`);
      return res?.data || null;
    } catch {
      return null;
    }
  }

  public static async createResume(payload: Partial<SavedResumeDraft>): Promise<SavedResumeDraft | null> {
    try {
      const res = await apiClient.post<{ success: boolean; data: SavedResumeDraft }>('/api/resumes', payload);
      return res?.data || null;
    } catch (err: any) {
      console.warn('Failed to save resume draft:', err.message);
      return null;
    }
  }

  public static async updateResume(id: string, payload: Partial<SavedResumeDraft>): Promise<SavedResumeDraft | null> {
    try {
      const res = await apiClient.put<{ success: boolean; data: SavedResumeDraft }>(`/api/resumes/${id}`, payload);
      return res?.data || null;
    } catch (err: any) {
      console.warn('Failed to update resume draft:', err.message);
      return null;
    }
  }

  public static async deleteResume(id: string): Promise<boolean> {
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/api/resumes/${id}`);
      return Boolean(res?.success);
    } catch {
      return false;
    }
  }

  public static async compileResume(targetRole?: string): Promise<CompiledResumeData | null> {
    try {
      const q = targetRole ? `?targetRole=${encodeURIComponent(targetRole)}` : '';
      const res = await apiClient.get<{ success: boolean; data: CompiledResumeData }>(`/api/resumes/compile${q}`);
      return res?.data || null;
    } catch {
      return null;
    }
  }
}
