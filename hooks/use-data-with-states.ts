import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from 'next-auth/react';

// Singleton client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.warn('Supabase not configured');
    return null;
  }
  
  supabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  return supabaseClient;
}

type DataState = 
  | { status: 'loading' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'empty'; createSample: () => void }
  | { status: 'success'; data: unknown[] };

export function useDataWithStates(
  table: string,
  options?: { userId?: string; limit?: number }
): DataState {
  const [status, setStatus] = useState<DataState['status']>('loading');
  const [data, setData] = useState<unknown[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  const supabase = getSupabaseClient();
  const { data: session } = useSession();
  const userId = options?.userId || session?.user?.email || 'anonymous';
  
  const fetchData = useCallback(async () => {
    if (!supabase) {
      setStatus('empty');
      return;
    }
    
    setStatus('loading');
    
    try {
      let query = supabase
        .from(table)
        .select('*');
      
      // Filter by user_id for user-specific tables
      if (table !== 'research_ledger') {
        query = query.eq('user_id', userId);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data: result, error: err } = await query;
      
      if (err) {
        console.error(`Error fetching ${table}:`, err);
        setError(new Error(err.message));
        setStatus('error');
        return;
      }
      
      const items = result || [];
      setData(items);
      
      if (items.length === 0) {
        setStatus('empty');
      } else {
        setStatus('success');
      }
    } catch (err) {
      console.error(`Unexpected error fetching ${table}:`, err);
      setError(err as Error);
      setStatus('error');
    }
  }, [supabase, table, userId, options?.limit]);
  
  const retry = useCallback(() => {
    fetchData();
  }, [fetchData]);
  
  const createSample = useCallback(() => {
    // Could create sample data for new users
    console.log(`Creating sample data for ${table}`);
  }, [table]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  switch (status) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', error: error!, retry };
    case 'empty':
      return { status: 'empty', createSample };
    case 'success':
      return { status: 'success', data };
    default:
      return { status: 'loading' };
  }
}

// Pre-configured hooks for specific tables
export function useQualifiedAccounts() {
  return useDataWithStates('qualified_accounts', { limit: 50 }) as 
    | { status: 'loading' }
    | { status: 'error'; error: Error; retry: () => void }
    | { status: 'empty'; createSample: () => void }
    | { status: 'success'; data: QualifiedAccount[] };
}

export function useAutonomousTasks() {
  return useDataWithStates('autonomous_tasks', { limit: 100 }) as
    | { status: 'loading' }
    | { status: 'error'; error: Error; retry: () => void }
    | { status: 'empty'; createSample: () => void }
    | { status: 'success'; data: AutonomousTask[] };
}

export function useFeedbackSignals() {
  return useDataWithStates('feedback_signals', { limit: 1000 }) as
    | { status: 'loading' }
    | { status: 'error'; error: Error; retry: () => void }
    | { status: 'empty'; createSample: () => void }
    | { status: 'success'; data: FeedbackSignal[] };
}

// Types
interface QualifiedAccount {
  id: string;
  company_name: string;
  website: string;
  employee_count: number;
  score: number;
  status: string;
}

interface AutonomousTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  confidence_score: number;
}

interface FeedbackSignal {
  id: string;
  signal_type: string;
  card_type: string;
  duration_ms: number;
}
