'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isEmployee: boolean;
  isDemoMode: boolean;
  error: string | null;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  // Effect 1: Initial auth check and onAuthStateChange subscription
  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — run in demo mode (skip auth, grant access)
      console.log('[Auth] No Supabase configured — running in demo mode');
      setIsEmployee(true);
      setIsLoading(false);
      return;
    }

    console.log('[Auth] Setting up auth subscription...');

    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = async () => {
      // Check existing session first
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        console.log('[Auth] Existing session found:', session.user.email);
        setUser(session.user);
        // Don't set isLoading false here - let profile fetch do it
      } else {
        console.log('[Auth] No existing session');
        setIsLoading(false);
      }

      // Subscribe to auth changes
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log('[Auth] onAuthStateChange event:', event);

          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            if (session?.user) {
              console.log('[Auth] User signed in:', session.user.email);
              setUser(session.user);
              // Don't set isLoading false here - wait for profile
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('[Auth] User signed out');
            setUser(null);
            setIsEmployee(false);
            setIsLoading(false);
          } else if (event === 'INITIAL_SESSION') {
            // Initial session check done
            console.log('[Auth] Initial session check complete');
          }
        }
      );

      subscription = sub;
    };

    setupSubscription();

    return () => {
      console.log('[Auth] Cleaning up subscription');
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

  // Effect 2: Fetch profile when user changes
  useEffect(() => {
    if (!user || !supabase) {
      if (!supabase) return; // demo mode — already handled
      console.log('[Auth] No user, skipping profile fetch');
      return;
    }

    console.log('[Auth] Fetching profile for user:', user.id);
    setIsLoading(true);

    const fetchProfile = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_employee, role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('[Auth] Profile fetch error:', profileError);
          setIsEmployee(false);
        } else {
          console.log('[Auth] Profile loaded:', profile);
          const isEmp = profile?.is_employee === true;
          console.log('[Auth] Setting isEmployee to:', isEmp);
          setIsEmployee(isEmp);
        }
      } catch (err) {
        console.error('[Auth] Profile fetch exception:', err);
        setIsEmployee(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [supabase, user]);

  const signInWithEmail = async (email: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://gtm.adzeta.io';

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${currentDomain}/auth/callback`,
      },
    });

    return { error };
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    setUser(null);
    setIsEmployee(false);
  };

  const clearError = () => setError(null);
  const isDemoMode = !supabase;

  return (
    <AuthContext.Provider value={{ user, isLoading, isEmployee, isDemoMode, error, signInWithEmail, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
