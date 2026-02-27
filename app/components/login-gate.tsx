'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { Lock, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isEmployee, isDemoMode, error: authError, signInWithEmail, signOut, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check URL params for auth errors from callback
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    const urlErrorDesc = params.get('error_description');
    
    if (urlError) {
      setError(urlErrorDesc || urlError);
      // Clear the error from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await signInWithEmail(email);

    if (signInError) {
      setError(signInError.message);
    } else {
      setEmailSent(true);
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Demo mode — no Supabase configured, skip auth
  if (isDemoMode) {
    return <>{children}</>;
  }

  // Development bypass — allow local dev without magic link auth
  if (process.env.NODE_ENV === 'development' && !user) {
    return <>{children}</>;
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-4">
            GTM Command Center
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
            Secure access for authorized personnel only.
          </p>

          {emailSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Check your email
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Click the link in your email to sign in.
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmail(''); }}
                className="mt-6 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send magic link
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-500 text-center">
            Access restricted to designated employees.
            <br />
            Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated but not employee
  if (!isEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-4">
            Access Restricted
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
            Hello, {user.email}
          </p>

          <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
            Your account is authenticated but you do not have employee access to the GTM Command Center.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-6">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              To access this system, an administrator must assign you the employee role.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="https://app.adzeta.io"
              className="block w-full text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              Go to app.adzeta.io
            </a>
            <button
              onClick={signOut}
              className="block w-full text-center px-6 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated employee - render children
  return <>{children}</>;
}
