import type { ChatMessage, ChatStatus, SuggestedPrompt, ChatClientContext } from '../components/chat/types';

export class ChatService {
  /**
   * Fetch current AI provider configuration and readiness status
   */
  public static async getStatus(token?: string | null): Promise<ChatStatus> {
    const headers: Record<string, string> = {};
    const authToken = token || sessionStorage.getItem('sarathi_auth_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      const res = await fetch('/api/chat/status', { headers });
      if (!res.ok) {
        throw new Error(`Status check failed (${res.status})`);
      }
      return await res.json();
    } catch {
      return {
        status: 'error',
        configured: false,
        provider: 'none',
        model: 'unknown',
        authenticated: Boolean(authToken),
        userRole: null,
        requiresApiKey: true,
        notice: 'Could not connect to Sarathi backend on port 4000.',
      };
    }
  }

  /**
   * Fetch suggested prompt chips based on role and active domain
   */
  public static async getSuggestions(role: string = 'student', domain?: string | null): Promise<SuggestedPrompt[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (domain) params.append('domain', domain);

    try {
      const res = await fetch(`/api/chat/suggestions?${params.toString()}`);
      if (!res.ok) {
        return this.getDefaultSuggestions(role);
      }
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : this.getDefaultSuggestions(role);
    } catch {
      return this.getDefaultSuggestions(role);
    }
  }

  /**
   * Send a user message to the Sarathi AI Copilot
   */
  public static async sendMessage(
    message: string,
    history: ChatMessage[] = [],
    clientContext: ChatClientContext = {},
    token?: string | null
  ): Promise<{ message: ChatMessage; statusNotice?: string }> {
    const authToken = token || sessionStorage.getItem('sarathi_auth_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Format previous history for backend
    const conversationHistory = history.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversationHistory,
        clientContext,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorMessage = errorJson.error || `Server responded with error ${response.status}`;
      throw new Error(errorMessage);
    }

    const json = await response.json();
    const data = json.data;

    return {
      message: {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: data.role || 'assistant',
        content: data.content,
        timestamp: data.timestamp || new Date().toISOString(),
        provider: data.provider,
        model: data.model,
        isFallback: data.isFallback,
        requiresApiKey: data.requiresApiKey,
      },
    };
  }

  /**
   * Fallback suggested prompts if network offline
   */
  private static getDefaultSuggestions(role: string): SuggestedPrompt[] {
    if (role === 'recruiter') {
      return [
        { id: 's1', label: 'Review pending skill verifications', prompt: 'How do I review and approve pending candidate skill verifications?' },
        { id: 's2', label: 'Optimize candidate job matches', prompt: 'How does Sarathi compute candidate readiness and match scores for my jobs?' },
        { id: 's3', label: 'Explain the candidate hiring pipeline', prompt: 'What are the stages of the applicant pipeline and how do I move candidates forward?' },
        { id: 's4', label: 'Conduct structured interviews', prompt: 'Help me generate technical interview questions for a Full-Stack Developer role.' },
      ];
    }

    return [
      { id: 's1', label: 'Help me choose a career path.', prompt: 'Help me choose a career path.' },
      { id: 's2', label: 'Create my skill development roadmap.', prompt: 'Create my skill development roadmap.' },
      { id: 's3', label: 'Explain my skill gap analysis.', prompt: 'Explain my skill gap analysis.' },
      { id: 's4', label: 'Help me prepare for a job interview.', prompt: 'Help me prepare for a job interview.' },
      { id: 's5', label: 'Find suitable projects and opportunities.', prompt: 'Find suitable projects and opportunities.' },
    ];
  }
}
