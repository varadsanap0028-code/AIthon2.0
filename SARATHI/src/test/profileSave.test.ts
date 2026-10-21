import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';

describe('Profile, Settings and Roadmap Persistence Client Tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    sessionStorage.setItem('sarathi_auth_token', 'candidate-jwt-token');
  });

  it('persists candidate profile updates via apiClient.put to /api/candidates/profile', async () => {
    let capturedUrl: string | undefined;
    let capturedBody: any;
    let capturedHeaders: any;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init?.body as string);
      capturedHeaders = init?.headers;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            fullName: 'Anita Roy',
            headline: 'Frontend Developer',
            githubUrl: 'https://github.com/anita',
            linkedinUrl: 'https://linkedin.com/in/anita',
            portfolioUrl: 'https://anita.dev',
            degree: 'B.Tech IT',
            graduationYear: 2026,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const payload = {
      fullName: 'Anita Roy',
      headline: 'Frontend Developer',
      githubUrl: 'https://github.com/anita',
      linkedinUrl: 'https://linkedin.com/in/anita',
      portfolioUrl: 'https://anita.dev',
      degree: 'B.Tech IT',
      graduationYear: 2026,
    };

    const res = await apiClient.put<{ success: boolean; data: any }>('/api/candidates/profile', payload);

    expect(capturedUrl).toBe('/api/candidates/profile');
    expect(capturedHeaders['Authorization']).toBe('Bearer candidate-jwt-token');
    expect(capturedBody).toEqual(payload);
    expect(res.data.fullName).toBe('Anita Roy');
    expect(res.data.githubUrl).toBe('https://github.com/anita');
  });

  it('saves notification preferences via apiClient.put to /api/settings', async () => {
    let capturedUrl: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            emailDigest: false,
            roadmapReminders: true,
            jobAlerts: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const res = await apiClient.put<{ success: boolean; data: any }>('/api/settings', {
      emailDigest: false,
      roadmapReminders: true,
      jobAlerts: true,
    });

    expect(capturedUrl).toBe('/api/settings');
    expect(capturedBody.emailDigest).toBe(false);
    expect(res.data.emailDigest).toBe(false);
  });

  it('saves completed roadmap tasks via apiClient.put to /api/roadmap', async () => {
    let capturedUrl: string | undefined;
    let capturedBody: any;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            trackKey: 'frontend',
            completedTaskIds: ['task-1', 'task-2'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const res = await apiClient.put<{ success: boolean; data: any }>('/api/roadmap', {
      trackKey: 'frontend',
      completedTaskIds: ['task-1', 'task-2'],
    });

    expect(capturedUrl).toBe('/api/roadmap');
    expect(capturedBody.trackKey).toBe('frontend');
    expect(capturedBody.completedTaskIds).toEqual(['task-1', 'task-2']);
    expect(res.data.completedTaskIds).toHaveLength(2);
  });
});
