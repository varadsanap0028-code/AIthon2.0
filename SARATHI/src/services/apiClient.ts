export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  details?: any;
}

export class ApiError extends Error implements ApiErrorShape {
  public status: number;
  public code: string;
  public details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedListener: UnauthorizedHandler | null = null;

export function onUnauthorized(handler: UnauthorizedHandler | null) {
  unauthorizedListener = handler;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  retries?: number;
}

const DEFAULT_TIMEOUT_MS = 25000;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    params,
    skipAuth = false,
    retries = options.method === undefined || options.method === 'GET' ? 2 : 0,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth) {
    const token = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sarathi_auth_token') || localStorage.getItem('sarathi_auth_token'))
      : null;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 401 Unauthorized handling
      if (response.status === 401 && !skipAuth) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('sarathi_auth_token');
          sessionStorage.removeItem('sarathi_auth_user');
          localStorage.removeItem('sarathi_auth_token');
          localStorage.removeItem('sarathi_auth_user');
          localStorage.removeItem('sarathi_remember_me');
          window.dispatchEvent(new CustomEvent('sarathi:unauthorized'));
        }
        if (unauthorizedListener) {
          unauthorizedListener();
        }
      }

      // Parse JSON or text
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        // Normalize server error response
        let code = 'API_ERROR';
        let message = `Request failed with status ${response.status}`;
        let details: any = undefined;

        if (data && typeof data === 'object') {
          if (data.error && typeof data.error === 'object') {
            code = data.error.code || code;
            message = data.error.message || message;
            details = data.error.details;
          } else if (typeof data.error === 'string') {
            message = data.error;
            code = data.code || code;
          } else if (typeof data.message === 'string') {
            message = data.message;
            code = data.code || code;
          }
        }

        // Handle retryable status codes on idempotent requests (503 Service Unavailable, 504 Gateway Timeout)
        if ((response.status === 503 || response.status === 504) && attempt <= retries) {
          await wait(attempt * 200);
          continue;
        }

        throw new ApiError(response.status, code, message, details);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      const isNetworkError = err.name === 'TypeError' || err.name === 'AbortError' || err.message?.includes('fetch');
      if (isNetworkError && attempt <= retries) {
        await wait(attempt * 200);
        continue;
      }

      const message = err.name === 'AbortError'
        ? 'Request timed out after 25 seconds.'
        : err.message || 'Network error connecting to Sarathi backend.';

      throw new ApiError(0, isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR', message);
    }
  }
}

export const apiClient = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(url: string, body?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};
