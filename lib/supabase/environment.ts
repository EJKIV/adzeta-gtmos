import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type Environment = 'dev' | 'prod';

interface DBConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

const dbConfigs: Record<Environment, DBConfig> = {
  dev: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  prod: {
    url: process.env.NEXT_PUBLIC_PROD_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_PROD_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!,
  },
};

// Cache clients per environment
const clients: Map<string, SupabaseClient> = new Map();

/**
 * Get Supabase client for the specified environment
 */
export function getSupabaseClient(environment: Environment = 'dev', useServiceRole = false): SupabaseClient {
  const cacheKey = `${environment}-${useServiceRole}`;
  
  if (clients.has(cacheKey)) {
    return clients.get(cacheKey)!;
  }
  
  const config = dbConfigs[environment];
  
  if (!config.url) {
    throw new Error(`Missing Supabase URL for environment: ${environment}`);
  }
  
  const key = useServiceRole ? config.serviceRoleKey : config.anonKey;
  
  if (!key) {
    throw new Error(`Missing Supabase key for environment: ${environment}`);
  }
  
  const client = createClient(config.url, key, {
    auth: { persistSession: false },
  });
  
  clients.set(cacheKey, client);
  return client;
}

/**
 * Detect environment from request
 * Priority: explicit header > origin domain > default
 */
export function detectEnvironment(
  request?: Request,
  explicitEnvironment?: string
): Environment {
  // Explicit override takes highest priority
  if (explicitEnvironment === 'prod') return 'prod';
  if (explicitEnvironment === 'dev') return 'dev';
  
  // Check query params or headers in request
  if (request) {
    const url = new URL(request.url);
    const envParam = url.searchParams.get('environment');
    if (envParam === 'prod') return 'prod';
    if (envParam === 'dev') return 'dev';
    
    const envHeader = request.headers.get('x-environment');
    if (envHeader === 'prod') return 'prod';
    if (envHeader === 'dev') return 'dev';
  }
  
  // Default to dev for safety
  return 'dev';
}

/**
 * Get environment from request body
 */
export function getEnvironmentFromBody(body: any): Environment {
  if (body?.environment === 'prod') return 'prod';
  if (body?.context?.environment === 'prod') return 'prod';
  if (body?.event?.environment === 'prod') return 'prod';
  return 'dev';
}
