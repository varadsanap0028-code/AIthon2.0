import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError, onUnauthorized } from '../services/apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('injects Authorization header when token is present in sessionStorage', async () => {
    sessionStorage.setItem('sarathi_auth_token', 'test-token-123');

    let capturedHeaders: HeadersInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const res = await apiClient.get('/api/test');
    expect(res).toEqual({ status: 'ok' });
    expect((capturedHeaders as Record<string, string>)['Authorization']).toBe('Bearer test-token-123');
  });

  it('normalizes structured backend error responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    try {
      await apiClient.post('/api/test', { test: true });
      expect.fail('Should have thrown an ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe('VALIDATION_ERROR');
      expect(apiErr.message).toBe('Email is required');
    }
  });

  it('handles 401 Unauthorized by clearing session and notifying listener', async () => {
    sessionStorage.setItem('sarathi_auth_token', 'expired-token');
    const unauthorizedCallback = vi.fn();
    onUnauthorized(unauthorizedCallback);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    });

    try {
      await apiClient.get('/api/protected');
    } catch {
      // expected error
    }

    expect(sessionStorage.getItem('sarathi_auth_token')).toBeNull();
    expect(unauthorizedCallback).toHaveBeenCalled();
  });
});
