import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeApiService } from '../services/resumeService';
import { apiClient } from '../services/apiClient';

describe('Student Portal Features Enhancement Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('sarathi_auth_token', 'mock-jwt-token');
  });

  it('ResumeApiService: compiles structured resume from server without fabrication', async () => {
    const mockCompiled = {
      personalInfo: {
        fullName: 'Alex Morgan',
        headline: 'Full-Stack Developer',
        email: 'alex@sarathi.ai',
        location: 'Bangalore, India',
        bio: 'Passionate developer.',
        githubUrl: 'https://github.com/alex',
        linkedinUrl: 'https://linkedin.com/in/alex',
        portfolioUrl: 'https://alex.dev',
        targetRole: 'Full-Stack Developer',
      },
      education: [
        {
          institution: 'National Institute of Technology',
          degree: 'B.Tech Computer Science',
          graduationYear: 2026,
          location: 'India',
        },
      ],
      skillsByCategory: {
        Frontend: [
          {
            id: 'skl-1',
            name: 'React',
            category: 'Frontend',
            proficiency: 4,
            verificationStatus: 'verified',
            evidenceCount: 2,
          },
        ],
      },
      skillsList: [],
      projects: [
        {
          id: 'proj-1',
          title: 'SARATHI Platform',
          description: 'Career intelligence dashboard',
          repositoryUrl: 'https://github.com/alex/sarathi',
          technologies: ['React', 'TypeScript'],
          verificationStatus: 'verified',
          type: 'project_repo',
        },
      ],
      passedAssessments: [],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ success: true, data: mockCompiled }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const compiled = await ResumeApiService.compileResume('Full-Stack Developer');
    expect(compiled).not.toBeNull();
    expect(compiled?.personalInfo.fullName).toBe('Alex Morgan');
    expect(compiled?.skillsByCategory.Frontend[0].verificationStatus).toBe('verified');
    expect(compiled?.projects[0].title).toBe('SARATHI Platform');
  });

  it('ResumeApiService: saves and lists resume drafts', async () => {
    const mockDraft = {
      id: 'resm-1',
      userId: 'usr-1',
      title: 'Full-Stack ATS Resume',
      targetRole: 'Full-Stack Developer',
      templateId: 'modern-ats' as const,
      sectionsConfig: { summary: true, skills: true, projects: true },
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const method = init?.method || 'GET';
      if (method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: mockDraft }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, data: [mockDraft] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const created = await ResumeApiService.createResume({
      title: 'Full-Stack ATS Resume',
      templateId: 'modern-ats',
    });
    expect(created?.id).toBe('resm-1');

    const drafts = await ResumeApiService.listResumes();
    expect(drafts.length).toBe(1);
    expect(drafts[0].templateId).toBe('modern-ats');
  });

  it('Learning Library: fetches personalized recommendations with reason', async () => {
    const mockRecommendations = [
      {
        id: 'res-react-1',
        title: 'React Official Documentation',
        domain: 'dom-frontend',
        skillTags: ['React', 'JavaScript'],
        isRecommended: true,
        recommendationReason: 'Targeted to close high-priority gap in React',
        level: 'Beginner',
        isFree: true,
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({ success: true, data: mockRecommendations }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const res = await apiClient.get<{ success: boolean; data: typeof mockRecommendations }>(
      '/api/resources/recommendations?targetRole=Full-Stack%20Developer'
    );
    expect(res.success).toBe(true);
    expect(res.data[0].isRecommended).toBe(true);
    expect(res.data[0].recommendationReason).toContain('React');
  });

  it('Learning Library: connects completed resource to Skill Passport as learning evidence', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            createdCount: 2,
            skillsCredited: ['React', 'JavaScript'],
          },
          message: 'Added learning evidence for React, JavaScript to your Skill Passport.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const res = await apiClient.post<{ success: boolean; data: any; message: string }>(
      '/api/resources/res-react-1/add-to-passport',
      {}
    );
    expect(res.success).toBe(true);
    expect(res.data.createdCount).toBe(2);
    expect(res.message).toContain('Added learning evidence');
  });
});
