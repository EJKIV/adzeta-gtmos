'use client';

import { useAuth } from './auth-provider';
import { Lock, LogIn, Loader2 } from 'lucide-react';

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isEmployee, signInWithGoogle } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
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
          
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
          
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
          
          <a
            href="https://app.adzeta.io"
            className="block w-full text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            Go to app.adzeta.io
          </a>
        </div>
      </div>
    );
  }

  // Authenticated employee - render children
  return <>{children}</>;
}
