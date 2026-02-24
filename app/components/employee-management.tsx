'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/auth-provider';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import { Users, UserPlus, UserMinus, AlertCircle, Check, Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  is_employee: boolean;
  role: string;
  created_at: string;
}

export function EmployeeManagement() {
  const { user, isEmployee } = useAuth();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if current user is admin
  const isAdmin = user?.email?.endsWith('@adzeta.io') || false;

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      setProfiles(userProfiles || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmployeeStatus = async (userId: string, currentStatus: boolean) => {
    if (!isAdmin) {
      setError('Only administrators can modify employee status');
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_employee: !currentStatus,
          ...(currentStatus ? {} : { role: 'employee' })
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setSuccess(`Employee ${currentStatus ? 'removed' : 'added'} successfully`);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isEmployee) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p>You must be an employee to view this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p>Only administrators can manage employee access.</p>
        <p className="text-sm mt-2">Current role: {user?.email}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Employee Access Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage who has access to the GTM Command Center
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="w-4 h-4" />
          {profiles.filter(p => p.is_employee).length} employees
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-medium text-sm">
                          {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {profile.full_name || 'Unnamed User'}
                          </div>
                          <div className="text-sm text-slate-500">{profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        profile.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : profile.role === 'employee'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {profile.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center gap-2 px-2 py-1 text-xs font-medium rounded-full ${
                        profile.is_employee
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${profile.is_employee ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {profile.is_employee ? 'Employee' : 'No Access'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => toggleEmployeeStatus(profile.id, profile.is_employee)}
                        disabled={isUpdating || profile.id === user?.id}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          profile.is_employee
                            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
                        } ${(isUpdating || profile.id === user?.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {profile.is_employee ? (
                          <>
                            <UserMinus className="w-4 h-4" />
                            Remove
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Add
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
