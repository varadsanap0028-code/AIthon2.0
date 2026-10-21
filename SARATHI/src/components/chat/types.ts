export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  provider?: string;
  model?: string;
  isFallback?: boolean;
  requiresApiKey?: boolean;
}

export interface ChatStatus {
  status: string;
  configured: boolean;
  provider: string;
  model: string;
  authenticated: boolean;
  userRole: string | null;
  requiresApiKey: boolean;
  notice: string;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface ChatClientContext {
  activePath?: string;
  targetRole?: string;
  activeTrack?: string;
  skills?: string[];
}
