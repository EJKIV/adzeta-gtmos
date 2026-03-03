/**
 * Research Job Types
 * Shared types for research job queue and components
 */

export type ResearchJobStatus = 
  | 'pending' 
  | 'queued' 
  | 'active' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type ResearchJobType = 
  | 'prospect_search' 
  | 'person_enrich' 
  | 'company_enrich' 
  | 'technographic_scan';

export interface ResearchJob {
  id: string;
  user_id: string;
  job_type: ResearchJobType;
  status: ResearchJobStatus;
  priority: number;
  search_criteria?: {
    person_titles?: string[];
    industry?: string;
    company_size?: string;
    location?: string;
    [key: string]: unknown;
  };
  enrichment_target?: string;
  total_requests?: number;
  completed_requests: number;
  failed_requests: number;
  progress_percent: number;
  results_summary?: {
    prospects_found?: number;
    enriched?: number;
    avg_confidence?: number;
    [key: string]: unknown;
  };
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  [key: string]: unknown;
}

// Prospect types used in research
export type ProspectQuality = 'high' | 'medium' | 'low';
export type ProspectEnrichmentStatus = 'pending' | 'enriching' | 'completed' | 'error';

export interface Prospect {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  title?: string;
  company?: string;
  companyDomain?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  photoUrl?: string;
  quality?: ProspectQuality;
  enrichmentStatus?: ProspectEnrichmentStatus;
  enrichedAt?: string;
  confidence?: number;
}
