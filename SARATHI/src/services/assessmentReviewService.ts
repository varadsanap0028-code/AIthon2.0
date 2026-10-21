import type { UserProfile } from '../types/user';
import { OpportunityService } from './opportunityService';

export interface ReviewQueueItem {
  sessionId: string;
  userId: string;
  candidateName: string;
  candidateEmail: string;
  domainId: string;
  role: string;
  technicalScore: number;
  knowledgeScore: number;
  practicalScore: number;
  startedAt: string;
  submittedAt: string;
  integritySummary: {
    eventCount: number;
    awayCount: number;
    longestAwaySec: number;
    offlinePeriods: number;
    level: 'none' | 'notable';
  };
  reviewStatus: string;
  reviewedAt?: string;
}

export class AssessmentReviewService {
  private static async getAuthHeaders(user?: UserProfile): Promise<HeadersInit> {
    let token: string | null = null;
    if (user) {
      token = await OpportunityService.getStudentToken(user);
    }
    if (!token) {
      token = localStorage.getItem('sarathi_auth_token');
    }

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  public static async getReviewQueue(
    params?: { domainId?: string; limit?: number; offset?: number },
    user?: UserProfile
  ): Promise<ReviewQueueItem[]> {
    const headers = await this.getAuthHeaders(user);
    const query = new URLSearchParams();
    if (params?.domainId) query.set('domainId', params.domainId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const response = await fetch(`/api/assessments/v2/reviews/queue?${query.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch review queue (${response.status})`);
    }

    const data = await response.json();
    return data.data || [];
  }

  public static async getSessionReviewDetail(sessionId: string, user?: UserProfile): Promise<any> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/reviews/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch session detail (${response.status})`);
    }

    const data = await response.json();
    return data.data;
  }

  public static async submitReviewDecision(
    sessionId: string,
    payload: {
      decision: 'no_concern' | 'needs_followup' | 'concern_confirmed';
      note: string;
      rubricUpdates?: Record<string, any>;
    },
    user?: UserProfile
  ): Promise<{ success: boolean; reviewId: string; decision: string }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/reviews/${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || `Failed to record review (${response.status})`);
    }

    const data = await response.json();
    return data.data;
  }
}
