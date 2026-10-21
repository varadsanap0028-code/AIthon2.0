import type { UserProfile } from '../types/user';
import type { AssessmentSessionClient, V2SessionResult } from '../types/assessmentV2';
import { OpportunityService } from './opportunityService';

export class AssessmentV2Service {
  private static async getAuthHeaders(user?: UserProfile): Promise<HeadersInit> {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token =
        sessionStorage.getItem('sarathi_auth_token') ||
        localStorage.getItem('sarathi_auth_token') ||
        sessionStorage.getItem('sarathi_candidate_token');
    }
    if (!token && user) {
      token = await OpportunityService.getStudentToken(user);
    }

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Start a new assessment session
   */
  public static async createSession(
    params: {
      mode: 'practice' | 'secure';
      domainId: string;
      role?: string;
      scope?: 'full' | 'quiz_only' | 'practical_only';
      consent?: Record<string, any>;
      accommodation?: Record<string, any>;
    },
    user?: UserProfile
  ): Promise<AssessmentSessionClient> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch('/api/assessments/v2/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create session (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Resume an existing session
   */
  public static async getSession(sessionId: string, user?: UserProfile): Promise<AssessmentSessionClient> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to resume session (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Fetch active in-progress assessment session for student
   */
  public static async getActiveSession(
    domainId?: string,
    user?: UserProfile
  ): Promise<{ active: boolean; session: AssessmentSessionClient | null }> {
    const headers = await this.getAuthHeaders(user);
    const url = domainId
      ? `/api/assessments/v2/sessions/active?domainId=${encodeURIComponent(domainId)}`
      : '/api/assessments/v2/sessions/active';
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { active: false, session: null };
    }

    return response.json();
  }

  /**
   * Explicitly abandon an active assessment session
   */
  public static async abandonSession(
    sessionId: string,
    user?: UserProfile
  ): Promise<{ success: boolean; sessionId: string; status: string }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/abandon`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to abandon session (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Autosave answers with optional optimistic saveVersion
   */
  public static async saveAnswers(
    sessionId: string,
    answers: Record<string, any>,
    user?: UserProfile,
    saveVersion?: number
  ): Promise<{ success: boolean; savedAt: string; saveVersion?: number }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/answers`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ answers, saveVersion }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorObj = new Error(err.error?.message || `Failed to save answers (HTTP ${response.status})`);
      (errorObj as any).status = response.status;
      (errorObj as any).code = err.error?.code;
      throw errorObj;
    }

    return response.json();
  }

  /**
   * Fetch lightweight session state for authoritative timer sync
   */
  public static async getSessionState(
    sessionId: string,
    user?: UserProfile
  ): Promise<{
    sessionId: string;
    status: string;
    startedAt: string;
    deadlineAt: string;
    remainingSeconds: number;
    saveVersion: number;
    draftAnswers: Record<string, any>;
    snapshots: Record<string, any>;
    lastSavedAt: string;
  }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/state`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch session state (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Save a code snapshot
   */
  public static async saveSnapshot(
    sessionId: string,
    snapshot: { questionId: string; code: string; language?: string; reason?: 'autosave' | 'run' | 'submit' },
    user?: UserProfile
  ): Promise<{ success: boolean; snapshotId: string; timestamp: string }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/snapshots`, {
      method: 'POST',
      headers,
      body: JSON.stringify(snapshot),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to save snapshot (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Submit session for server-side grading
   */
  public static async submitSession(
    sessionId: string,
    payload: { answers?: Record<string, any>; tasks?: Record<string, any> },
    user?: UserProfile
  ): Promise<V2SessionResult> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Grading submission failed (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Retrieve graded result
   */
  public static async getSessionResult(sessionId: string, user?: UserProfile): Promise<V2SessionResult> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/result`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch result (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Retrieve the latest completed assessment result for the student
   */
  public static async getLatestResult(
    domainId?: string,
    user?: UserProfile
  ): Promise<{ success: boolean; result: V2SessionResult | null; notFound?: boolean; error?: string }> {
    try {
      const headers = await this.getAuthHeaders(user);
      const query = domainId ? `?domainId=${encodeURIComponent(domainId)}` : '';
      const response = await fetch(`/api/assessments/v2/sessions/latest-result${query}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 404) {
        return { success: true, notFound: true, result: null };
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          success: false,
          notFound: false,
          error: err.error?.message || err.message || `Failed to fetch latest result (HTTP ${response.status})`,
          result: null,
        };
      }

      const data = await response.json();
      return { success: true, notFound: false, result: data.result || null };
    } catch (err: any) {
      return {
        success: false,
        notFound: false,
        error: err.message || 'Network error while fetching assessment records.',
        result: null,
      };
    }
  }

  /**
   * Retrieve assessment history for the student
   */
  public static async getHistory(
    domainId?: string,
    user?: UserProfile
  ): Promise<{ success: boolean; data: any[] }> {
    const headers = await this.getAuthHeaders(user);
    const query = domainId ? `?domainId=${encodeURIComponent(domainId)}` : '';
    const response = await fetch(`/api/assessments/v2/history${query}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { success: false, data: [] };
    }

    return response.json();
  }

  /**
   * Run code against visible test cases
   */
  public static async runCode(
    sessionId: string,
    payload: { questionId: string; code: string; language?: string },
    user?: UserProfile
  ): Promise<{
    status: 'passed' | 'failed' | 'timeout' | 'error';
    visiblePassed: number;
    visibleTotal: number;
    results: Array<{ id: string; passed: boolean; input: string; expectedOutput: string; actualOutput?: string; error?: string }>;
    stdout?: string;
    stderr?: string;
    timeMs?: number;
    isolationNotice?: string;
  }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Run execution failed (HTTP ${response.status})`);
    }

    return response.json();
  }

  /**
   * Log client integrity indicator event
   */
  public static async logIntegrityEvent(
    sessionId: string,
    event: { type: string; ts?: string; meta?: Record<string, any> },
    user?: UserProfile
  ): Promise<{ success: boolean; eventId?: string }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/integrity-events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      return { success: false };
    }

    return response.json();
  }

  /**
   * Log batch of client integrity events
   */
  public static async logIntegrityEvents(
    sessionId: string,
    events: Array<{ type: string; ts?: string; meta?: Record<string, any> }>,
    user?: UserProfile
  ): Promise<{ success: boolean; count?: number }> {
    const headers = await this.getAuthHeaders(user);
    const response = await fetch(`/api/assessments/v2/sessions/${encodeURIComponent(sessionId)}/integrity-events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      return { success: false };
    }

    return response.json();
  }
}
