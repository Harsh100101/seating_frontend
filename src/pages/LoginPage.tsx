import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export function getLoginErrorMessage(error: unknown): string {
  const statusCode = Number((error as any)?.statusCode || 0);
  const message = String((error as any)?.message || '');
  if (statusCode === 400) return 'Enter a valid work email and password.';
  if (statusCode === 401) return 'Invalid email or password. Please try again.';
  if (statusCode === 403 && /inactive/i.test(message)) return 'This administrator account is inactive. Please contact a Technical Administrator.';
  if (statusCode === 429) return 'Too many sign-in attempts. Please wait and try again.';
  if (statusCode === 503) return 'The sign-in service is temporarily unavailable. Please try again shortly.';
  if (statusCode >= 500) return 'The sign-in service is temporarily unavailable. Please try again shortly.';
  if (!statusCode) return 'Unable to connect to the server. Please try again.';
  return 'Unable to complete sign-in. Please try again.';
}

function isInternalAuthNotice(value: string | null): boolean {
  return Boolean(value && /admin authentication required|bearer token|authentication could not be validated/i.test(value));
}

export function getSafeLoginReturnPath(path: unknown): string {
  if (typeof path !== 'string' || !path.startsWith('/')) return '/dashboard';

  try {
    const target = new URL(path, 'https://seating-sankul.invalid');
    const decodedPath = decodeURIComponent(target.pathname);
    if (
      target.origin !== 'https://seating-sankul.invalid' ||
      decodedPath.startsWith('//') ||
      decodedPath.includes('\\')
    ) return '/dashboard';

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/dashboard';
  }
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { adminUser, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const urlNotice = queryParams.get('notice');
  const storedNotice = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('seating_auth_notice') : null;
  const initialNotice = [urlNotice, storedNotice, (location.state as any)?.notice || null]
    .find((value) => Boolean(value) && !isInternalAuthNotice(value)) || '';
  const [notice, setNotice] = useState(initialNotice);

  useEffect(() => {
    if (storedNotice) {
      try {
        sessionStorage.removeItem('seating_auth_notice');
      } catch {
        // The URL notice remains available when session storage cannot be cleared.
      }
    }
  }, [storedNotice]);

  const from = getSafeLoginReturnPath(location.state?.from?.pathname);

  useEffect(() => {
    if (!isLoading && adminUser) navigate(from, { replace: true });
  }, [adminUser, from, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(getLoginErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ios-login min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.42, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-[72px] h-[72px] bg-white rounded-[22px] shadow-lg ring-1 ring-black/[0.05] flex items-center justify-center p-3"
          >
            <img src="/shaktiman-logo.png" alt="Shaktiman Logo" className="w-full h-full object-contain" />
          </motion.div>
        </div>
        <h2 className="mt-5 text-center text-[28px] font-semibold tracking-[-0.03em] text-slate-950">
          Welcome to Shakti Sankul
        </h2>
        <p className="mt-1.5 text-center text-sm font-normal text-slate-500">
          Sign in to manage your Seating Arrangement workspace.
        </p>
      </div>

      <div className="mt-6 mx-auto w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
          className="ios-login-card w-full py-7 px-6 sm:px-8 space-y-6"
        >
          {notice && !error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2.5 rounded-lg text-xs flex items-start space-x-2"
              role="alert"
            >
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span>{notice}</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs flex items-start space-x-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Work email
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full h-11 pl-10 pr-3 border border-slate-200 rounded-[12px] text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all bg-slate-50/70"
                  placeholder="admin@shaktiman.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full h-11 pl-10 pr-3 border border-slate-200 rounded-[12px] text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all bg-slate-50/70"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="ios-primary-button w-full h-11 flex justify-center items-center px-4 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

        </motion.div>
      </div>
    </div>
  );
};
