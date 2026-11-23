import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../context/AuthContext';
import { LoginPage, getLoginErrorMessage, getSafeLoginReturnPath } from './LoginPage';

describe('LoginPage branding and safe authentication messaging', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      adminUser: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshMe: vi.fn(),
    });
  });

  it('renders the approved login branding without the raw auth warning', () => {
    const html = renderToStaticMarkup(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(html).toContain('Welcome to Shakti Sankul');
    expect(html).toContain('Sign in to manage your Seating Arrangement workspace.');
    expect(html).toContain('alt="Shaktiman Logo"');
    expect(html).not.toContain('Admin authentication required');
    expect(html).not.toContain('Bearer token');
  });

  it('maps login failures to safe user-facing messages', () => {
    expect(getLoginErrorMessage({ statusCode: 401 })).toBe('Invalid email or password. Please try again.');
    expect(getLoginErrorMessage({ statusCode: 403, message: 'This administrator account is inactive.' })).toContain('inactive');
    expect(getLoginErrorMessage({ statusCode: 429 })).toContain('Too many');
    expect(getLoginErrorMessage({ statusCode: 503 })).toContain('temporarily unavailable');
    expect(getLoginErrorMessage(new TypeError('Failed to fetch'))).toBe('Unable to connect to the server. Please try again.');
    expect(getLoginErrorMessage({ statusCode: 500 })).toContain('temporarily unavailable');
  });

  it('keeps post-login navigation on the application origin', () => {
    expect(getSafeLoginReturnPath('/employees?page=2')).toBe('/employees?page=2');
    expect(getSafeLoginReturnPath('//outside.example/path')).toBe('/dashboard');
    expect(getSafeLoginReturnPath('https://outside.example/path')).toBe('/dashboard');
    expect(getSafeLoginReturnPath('/%5C%5Coutside.example/path')).toBe('/dashboard');
    expect(getSafeLoginReturnPath(undefined)).toBe('/dashboard');
  });
});
