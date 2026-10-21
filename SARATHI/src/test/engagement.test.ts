import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';

describe('Phase 3: Student Portal Engagement Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('sarathi_auth_token', 'mock-jwt-token');
  });

  it('fetches learning resources with filters and maps response correctly', async () => {
    const mockResources = [
      {
        id: 'res-1',
        title: 'Deep Dive: React Performance',
        skillCategory: 'React',
        difficulty: 'intermediate',
        type: 'course',
        estimatedMinutes: 45,
        url: 'https://react.dev/learn',
        isBookmarked: true,
        progress: 'in-progress'
      }
    ];

    let capturedHeaders: HeadersInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ success: true, count: 1, data: mockResources }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await apiClient.get<{ success: boolean; count: number; data: typeof mockResources }>('/api/resources?category=React');

    expect((capturedHeaders as Record<string, string>)['Authorization']).toBe('Bearer mock-jwt-token');
    expect(res.success).toBe(true);
    expect(res.data[0].title).toBe('Deep Dive: React Performance');
    expect(res.data[0].isBookmarked).toBe(true);
  });

  it('toggles resource bookmark state successfully', async () => {
    let capturedMethod = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedMethod = init?.method || '';
      return new Response(JSON.stringify({ success: true, bookmarked: true, message: 'Resource bookmarked' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await apiClient.post<{ success: boolean; bookmarked: boolean }>('/api/resources/res-1/bookmark', {});

    expect(capturedMethod).toBe('POST');
    expect(res.bookmarked).toBe(true);
  });

  it('updates resource learning progress to completed', async () => {
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ success: true, status: 'completed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await apiClient.post<{ success: boolean; status: string }>('/api/resources/res-1/progress', {
      status: 'completed'
    });

    expect(capturedBody).toBe(JSON.stringify({ status: 'completed' }));
    expect(res.status).toBe('completed');
  });

  it('fetches student notifications and marks all as read', async () => {
    const mockNotifications = [
      { id: 'notif-1', title: 'System', message: 'Welcome to Sarathi', isRead: false, createdAt: '2026-10-17' }
    ];

    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      callCount++;
      if (String(url).includes('read-all')) {
        return new Response(JSON.stringify({ success: true, markedCount: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: true, count: 1, unreadCount: 1, data: mockNotifications }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const listRes = await apiClient.get<{ success: boolean; unreadCount: number; data: typeof mockNotifications }>('/api/notifications');
    expect(listRes.unreadCount).toBe(1);

    const readAllRes = await apiClient.post<{ success: boolean; markedCount: number }>('/api/notifications/read-all', {});
    expect(readAllRes.markedCount).toBe(1);
    expect(callCount).toBe(2);
  });

  it('submits student feedback successfully', async () => {
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ success: true, feedbackId: 'fb-101' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const feedbackPayload = {
      category: 'feature_request',
      rating: 5,
      message: 'Love the new roadmap and skill gap analytics!',
      pageUrl: '/student/roadmap'
    };

    const res = await apiClient.post<{ success: boolean; feedbackId: string }>('/api/feedback', feedbackPayload);

    expect(capturedBody).toBe(JSON.stringify(feedbackPayload));
    expect(res.feedbackId).toBe('fb-101');
  });

  it('fetches and toggles public passport share state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ success: true, data: { publicId: 'share-abc-123', isEnabled: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: true, data: { publicId: 'share-abc-123', isEnabled: false } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const shareInfo = await apiClient.get<{ success: boolean; data: { publicId: string; isEnabled: boolean } }>('/api/passport/share');
    expect(shareInfo.data.isEnabled).toBe(false);

    const toggleRes = await apiClient.post<{ success: boolean; data: { publicId: string; isEnabled: boolean } }>('/api/passport/share/toggle', {});
    expect(toggleRes.data.isEnabled).toBe(true);
  });
});
