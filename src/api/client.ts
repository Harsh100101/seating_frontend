export const API_BASE = '/api';
export const AUTH_SESSION_SYNC_KEY = 'seating_auth_session_sync';
export const NOTIFICATIONS_CHANGED_EVENT = 'seating:notifications-changed';
export const WORKSPACE_DATA_CHANGED_EVENT = 'seating:workspace-data-changed';
export const WORKSPACE_DATA_SYNC_KEY = 'seating_workspace_data_sync';

const TOKEN_STORAGE_KEY = 'seating_auth_token';
let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage access may be restricted in sandboxed environments
  }
}

export function broadcastAuthSessionEvent(type: 'login' | 'logout') {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({ type, at: Date.now() });
  try {
    window.localStorage.setItem(AUTH_SESSION_SYNC_KEY, payload);
  } catch {
    // Storage access may be restricted; the current tab remains functional.
  }
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_SYNC_KEY, { detail: { type } }));
}

export function broadcastNotificationsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

/**
 * Refresh read models after a confirmed business mutation. Local dispatch keeps
 * the active dashboard current; localStorage notifies other browser tabs
 * without adding polling or a websocket dependency.
 */
export function broadcastWorkspaceDataChanged(type: 'employee' | 'seat' | 'transfer') {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({ type, at: Date.now() });
  try {
    window.localStorage.setItem(WORKSPACE_DATA_SYNC_KEY, payload);
  } catch {
    // The current tab still receives the event when storage is restricted.
  }
  window.dispatchEvent(new CustomEvent(WORKSPACE_DATA_CHANGED_EVENT, { detail: { type } }));
}

export function shouldHandleAuthFailure(
  normalizedPath: string,
  isAuthFailure: boolean,
  isLoginEndpoint: boolean,
  pathname: string | undefined,
) {
  const isSignedOutSessionProbe = normalizedPath === '/auth/me' && pathname === '/login';
  return isAuthFailure && !isLoginEndpoint && !isSignedOutSessionProbe;
}

type AuthErrorHandler = (message: string) => void;
let authErrorHandler: AuthErrorHandler | null = null;

export function setAuthErrorHandler(handler: AuthErrorHandler | null) {
  authErrorHandler = handler;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = normalizedPath.startsWith(API_BASE)
    ? normalizedPath
    : `${API_BASE}${normalizedPath}`;
  const headers = new Headers(options.headers || {});

  // Inject Bearer token if available and not explicitly supplied
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set application/json when a body is provided and is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure HttpOnly session cookies are transmitted for dual-auth
  });

  if (!response.ok) {
    let errMessage = 'Request failed';
    let errCode: string | undefined;
    try {
      const data = await response.json();
      errMessage = data.message || data.error || errMessage;
      errCode = data.error;
    } catch {
      errMessage = response.statusText || errMessage;
    }

    // Handle authentication expiration or inactive account on protected routes
    const isLoginEndpoint = url.endsWith('/auth/login') || url.includes('/api/auth/login');
    const isAuthFailure = response.status === 401 || (response.status === 403 && /inactive/i.test(errMessage));

    const shouldHandleFailure = shouldHandleAuthFailure(
      normalizedPath,
      isAuthFailure,
      isLoginEndpoint,
      typeof window !== 'undefined' ? window.location.pathname : undefined,
    );

    if (shouldHandleFailure) {
      setAuthToken(null);
      const sessionMessage = response.status === 403 && /inactive/i.test(errMessage)
        ? 'This administrator account is inactive. Please sign in with an active account.'
        : 'Your session has expired. Please sign in again.';

      if (authErrorHandler) {
        authErrorHandler(sessionMessage);
      } else {
        try {
          sessionStorage.setItem('seating_auth_notice', sessionMessage);
        } catch {
          // Session storage can be unavailable; the redirect still handles sign-in recovery.
        }
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = `/login?notice=${encodeURIComponent(sessionMessage)}`;
        }
      }
    }

    const error: any = new Error(errMessage);
    error.statusCode = response.status;
    error.code = errCode;
    throw error;
  }

  // Handle binary/image responses
  const contentType = response.headers.get('content-type') || '';
  if (
    contentType.startsWith('image/') ||
    contentType.startsWith('application/pdf') ||
    contentType.includes('application/octet-stream')
  ) {
    return (await response.blob()) as any;
  }

  // Handle CSV/text responses
  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    return (await response.text()) as any;
  }

  if (response.status === 204) {
    return null as any;
  }

  return response.json();
}
