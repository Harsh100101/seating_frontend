import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, setAuthToken, getAuthToken, setAuthErrorHandler, shouldHandleAuthFailure } from './client';

describe('Frontend API Client Auth & Session Handling', () => {
  beforeEach(() => {
    setAuthToken(null);
    setAuthErrorHandler(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setAuthToken(null);
    setAuthErrorHandler(null);
  });

  it('stores and retrieves auth token', () => {
    setAuthToken('test-bearer-token-xyz');
    expect(getAuthToken()).toBe('test-bearer-token-xyz');

    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });

  it('injects Authorization header when token is present', async () => {
    setAuthToken('my-secret-jwt');
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'ok' })
    });
    global.fetch = mockFetch;

    await apiRequest('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-secret-jwt');
  });

  it('triggers auth error handler and clears token on 401 Unauthorized', async () => {
    setAuthToken('stale-token');
    const handler = vi.fn();
    setAuthErrorHandler(handler);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 401,
        message: 'Administrator session expired after an account security change. Please sign in again.'
      })
    });

    await expect(apiRequest('/protected-endpoint')).rejects.toThrow();

    expect(getAuthToken()).toBeNull();
    expect(handler).toHaveBeenCalledWith(
      'Your session has expired. Please sign in again.'
    );
  });

  it('triggers auth error handler and clears token on 403 inactive admin', async () => {
    setAuthToken('inactive-admin-token');
    const handler = vi.fn();
    setAuthErrorHandler(handler);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 403,
        message: 'This administrator account is inactive.'
      })
    });

    await expect(apiRequest('/protected-endpoint')).rejects.toThrow();

    expect(getAuthToken()).toBeNull();
    expect(handler).toHaveBeenCalledWith(
      'This administrator account is inactive. Please sign in with an active account.'
    );
  });

  it('does NOT trigger auth error handler on login 401 invalid credentials', async () => {
    const handler = vi.fn();
    setAuthErrorHandler(handler);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        statusCode: 401,
        message: 'Invalid email or password'
      })
    });

    await expect(apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({}) })).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT surface the expected signed-out /auth/me probe on the login page', () => {
    expect(shouldHandleAuthFailure('/auth/me', true, false, '/login')).toBe(false);
    expect(shouldHandleAuthFailure('/auth/me', true, false, '/dashboard')).toBe(true);
    expect(shouldHandleAuthFailure('/auth/login', true, true, '/login')).toBe(false);
  });

  it('returns Blob when response content-type is image/png or binary', async () => {
    const mockBlob = new Blob(['image-binary-data'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/png' }),
      blob: async () => mockBlob
    });

    const result = await apiRequest('/floors/floor-1/image');
    expect(result).toBe(mockBlob);
  });
});
