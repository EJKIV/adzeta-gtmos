/**
 * Apollo.io MCP Client
 * 
 * Integration with Apollo.io API for prospecting and enrichment
 * Rate limited to 10 requests/minute on free tier
 */

import { ApolloSearchCriteria, ApolloPerson, ApolloOrganization, ApolloSearchResponse } from './types';

// ============================================================================
// Configuration
// ============================================================================

const APOLLO_API_BASE = 'https://api.apollo.io/v1';
const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';

// Rate limiting: 10 requests per minute on free tier
const RATE_LIMIT = {
  requestsPerMinute: 10,
  minDelayMs: 6000, // 6000ms between requests
};

// ============================================================================
// Error Types
// ============================================================================

export class ApolloError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public responseData?: unknown
  ) {
    super(message);
    this.name = 'ApolloError';
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private lastRequestTime: number = 0;
  private queue: Array<() => void> = [];
  private isProcessing = false;

  async throttle(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delayNeeded = Math.max(0, RATE_LIMIT.minDelayMs - timeSinceLastRequest);
    
    if (delayNeeded > 0) {
      await sleep(delayNeeded);
    }
    
    this.lastRequestTime = Date.now();
    const resolve = this.queue.shift();
    if (resolve) resolve();
    
    this.isProcessing = false;
    
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

const rateLimiter = new RateLimiter();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// API Client
// ============================================================================

async function makeApolloRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!APOLLO_API_KEY) {
    throw new ApolloError(
      'Apollo API key not configured. Set APOLLO_API_KEY environment variable.',
      'API_KEY_MISSING'
    );
  }

  // Apply rate limiting
  await rateLimiter.throttle();

  const url = `${APOLLO_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': APOLLO_API_KEY,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApolloError(
      data?.error?.message || `Apollo API error: ${response.statusText}`,
      data?.error?.code || 'API_ERROR',
      response.status,
      data
    );
  }

  return data as T;
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Health check - verify Apollo API connectivity
 */
export async function checkApolloHealth(): Promise<{
  healthy: boolean;
  message: string;
  apiVersion?: string;
}> {
  try {
    // Apollo doesn't have a dedicated health endpoint, so we use the org enrichment endpoint
    // with a test domain
    const result = await enrichCompany('apollo.io');
    return {
      healthy: true,
      message: 'Apollo API is accessible',
      apiVersion: 'v1',
    };
  } catch (error) {
    if (error instanceof ApolloError && error.code === 'API_KEY_MISSING') {
      return {
        healthy: false,
        message: 'Apollo API key not configured',
      };
    }
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for prospects by criteria
 * Rate limit: 10 req/min on free tier
 */
export async function searchProspects(
  criteria: ApolloSearchCriteria,
  options: {
    page?: number;
    perPage?: number;
  } = {}
): Promise<ApolloSearchResponse> {
  const { page = 1, perPage = 100 } = options;

  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('per_page', Math.min(perPage, 100).toString());

  // Build search payload
  const payload: Record<string, unknown> = {
    api_key: APOLLO_API_KEY,
  };

  if (criteria.person_titles?.length) {
    payload.person_titles = criteria.person_titles;
  }

  if (criteria.person_seniorities?.length) {
    payload.person_seniorities = criteria.person_seniorities;
  }

  if (criteria.organization_num_employees) {
    payload.organization_num_employees = criteria.organization_num_employees;
  }

  if (criteria.q_organization_keyword_tags?.length) {
    payload.q_organization_keyword_tags = criteria.q_organization_keyword_tags;
  }

  if (criteria.organization_locations?.length) {
    payload.organization_locations = criteria.organization_locations;
  }

  if (criteria.person_locations?.length) {
    payload.person_locations = criteria.person_locations;
  }

  if (criteria.contact_email_status) {
    payload.contact_email_status = criteria.contact_email_status;
  }

  const response = await makeApolloRequest<{
    people: ApolloPerson[];
    pagination: {
      page: number;
      per_page: number;
      total_entries: number;
      total_pages: number;
    };
  }>('/mixed_people/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    people: response.people || [],
    pagination: response.pagination || {
      page,
      per_page: perPage,
      total_entries: 0,
      total_pages: 0,
    },
  };
}

/**
 * Enrich a person by email
 * Rate limit: 10 req/min on free tier
 */
export async function enrichPerson(email: string): Promise<ApolloPerson | null> {
  const response = await makeApolloRequest<{
    person: ApolloPerson;
  }>('/people/match', {
    method: 'POST',
    body: JSON.stringify({
      api_key: APOLLO_API_KEY,
      find_email: true,
      reveal_personal_emails: false,
      email: email,
    }),
  });

  return response.person || null;
}

/**
 * Enrich a company by domain
 * Rate limit: 10 req/min on free tier
 */
export async function enrichCompany(domain: string): Promise<ApolloOrganization | null> {
  const response = await makeApolloRequest<{
    organization: ApolloOrganization;
  }>('/organizations/enrich', {
    method: 'GET',
  });

  return response.organization || null;
}

/**
 * Get technographics for a company by domain
 * Uses the organization enrichment endpoint which includes technologies
 * Rate limit: 10 req/min on free tier
 */
export async function getTechnographics(domain: string): Promise<{
  domain: string;
  technologies: string[];
  organization?: ApolloOrganization;
}> {
  const organization = await enrichCompany(domain);
  
  return {
    domain,
    technologies: organization?.technologies || [],
    organization,
  };
}

/**
 * Batch enrich multiple people by email
 * Respects rate limiting automatically
 */
export async function batchEnrichPeople(
  emails: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, ApolloPerson | null>> {
  const results = new Map<string, ApolloPerson | null>();
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    try {
      const person = await enrichPerson(email);
      results.set(email, person);
    } catch (error) {
      console.warn(`Failed to enrich ${email}:`, error);
      results.set(email, null);
    }
    
    onProgress?.(i + 1, emails.length);
  }
  
  return results;
}

/**
 * Search prospects with automatic pagination
 * Respects rate limits and returns all results
 */
export async function searchProspectsPaginated(
  criteria: ApolloSearchCriteria,
  maxResults: number = 1000
): Promise<ApolloPerson[]> {
  const allPeople: ApolloPerson[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && allPeople.length < maxResults) {
    const response = await searchProspects(criteria, {
      page,
      perPage: 100,
    });

    allPeople.push(...response.people);
    
    hasMore = response.people.length === 100 && page < response.pagination.total_pages;
    page++;

    if (allPeople.length >= maxResults) {
      break;
    }
  }

  return allPeople.slice(0, maxResults);
}

// ============================================================================
// Exports
// ============================================================================

export const ApolloMCP = {
  checkHealth: checkApolloHealth,
  searchProspects,
  searchProspectsPaginated,
  enrichPerson,
  enrichCompany,
  getTechnographics,
  batchEnrichPeople,
};

export default ApolloMCP;