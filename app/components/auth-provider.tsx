'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isEmployee: boolean;
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
  const initRef = useRef(false);

  // Get singleton client
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let loadingTimeout: NodeJS.Timeout | null = null;

    // Safety: force loading to false after 5 seconds max
    loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.log('[Auth] Loading timeout - forcing isLoading to false');
        setIsLoading(false);
      }
    }, 5000);

    const getUser = async () => {
      try {
        console.log('[Auth] Initializing...');
        
        // First, try to get the session from cookies/storage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          if (isMounted) {
            setError(sessionError.message);
            setIsLoading(false);
          }
          return;
        }

        if (!isMounted) return;

        let currentUser = session?.user || null;

        if (currentUser) {
          console.log('[Auth] Session found, user:', currentUser.email);
          setUser(currentUser);
        } else {
          console.log('[Auth] No session found');
          setUser(null);
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (!isMounted) return;
        
        if (currentUser) {
          console.log('[Auth] Fetching profile for user:', currentUser.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_employee, role')
            .eq('id', currentUser.id)
            .single();
          
          if (profileError) {
            console.error('[Auth] Profile fetch error:', profileError);
          } else {
            console.log('[Auth] Profile loaded:', profile);
          }
          
          if (isMounted) {
            const isEmp = profile?.is_employee === true;
            console.log('[Auth] getUser - Setting isEmployee to:', isEmp);
            setIsEmployee(isEmp);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Unexpected error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Authentication error');
          setIsLoading(false);
        }
      }
    };

    getUser();

    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('[Auth] onAuthStateChange event:', event);
          
          if (!isMounted) return;

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              console.log('[Auth] User signed in:', session.user.email);
              setUser(session.user);
              
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_employee, role')
                .eq('id', session.user.id)
                .single();
              
              if (profileError) {
                console.error('[Auth] Profile fetch error:', profileError);
                setIsEmployee(false);
              } else {
                console.log('[Auth] Profile loaded:', profile);
                const isEmp = profile?.is_employee === true;
                console.log('[Auth] Setting isEmployee to:', isEmp, 'from profile.is_employee:', profile?.is_employee);
                setIsEmployee(isEmp);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('[Auth] User signed out');
            setUser(null);
            setIsEmployee(false);
          }
          
          // Always set loading to false after auth state change
          setIsLoading(false);
        }
      );
      
      subscription = sub;
    } catch (err) {
      console.error('[Auth] Auth state change error:', err);
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (loadingTimeout) clearTimeout(loadingTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase, isLoading]);

  const signInWithEmail = async (email: string) => {
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
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setIsEmployee(false);
  };

  const clearError = () => setError(null);

  console.log('[Auth] Render - isLoading:', isLoading, 'user:', user?.email || 'null', 'isEmployee:', isEmployee);

  return (
    <AuthContext.Provider value={{ user, isLoading, isEmployee, error, signInWithEmail, signOut, clearError }}>
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
