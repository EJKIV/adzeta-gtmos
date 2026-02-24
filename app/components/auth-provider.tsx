'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  // Get singleton client
  const supabase = getSupabaseClient();

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const getUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          if (isMounted) {
            setError(authError.message);
            setIsLoading(false);
          }
          return;
        }

        if (!isMounted) return;

        setUser(authUser);
        
        if (authUser) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_employee, role')
            .eq('id', authUser.id)
            .single();
          
          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError);
          }
          
          if (isMounted) {
            setIsEmployee(profile?.is_employee === true);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
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
          if (!isMounted) return;

          setUser(session?.user ?? null);
          
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_employee, role')
              .eq('id', session.user.id)
              .single();
            
            setIsEmployee(profile?.is_employee === true);
          } else {
            setIsEmployee(false);
          }
          
          setIsLoading(false);
        }
      );
      
      subscription = sub;
    } catch (err) {
      console.error('Auth state change error:', err);
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabase]);

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
