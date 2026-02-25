/**
 * Research & Outreach Platform Types
 * 
 * TypeScript definitions for Phase 1 database schema
 */

// ============================================================================
// Research Jobs
// ============================================================================

export type ResearchJobType = 'prospect_search' | 'person_enrich' | 'company_enrich' | 'technographic_scan';
export type ResearchJobStatus = 'pending' | 'queued' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ResearchJob {
  id: string;
  user_id: string;
  job_type: ResearchJobType;
  status: ResearchJobStatus;
  
  // Search criteria
  search_criteria: {
    person_titles?: string[];
    industry?: string;
    company_size?: string;
    count?: number;
    location?: string;
    technologies?: string[];
    [key: string]: unknown;
  };
  
  enrichment_target?: string;
  
  // Metadata
  priority: number;
  estimated_results?: number;
  
  // Progress tracking
  total_requests?: number;
  completed_requests: number;
  failed_requests: number;
  progress_percent: number;
  
  // Results
  results_summary: {
    prospects_found?: number;
    enriched?: number;
    failed?: number;
    avg_confidence?: number;
  };
  
  // Error tracking
  error_message?: string;
  retry_count: number;
  last_error_at?: string;
  
  // Timing
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateResearchJobInput {
  job_type: ResearchJobType;
  search_criteria?: ResearchJob['search_criteria'];
  enrichment_target?: string;
  priority?: number;
}

// ============================================================================
// Prospects
// ============================================================================

export type ProspectEnrichmentStatus = 'raw' | 'enriching' | 'enriched' | 'failed' | 'stale';
export type ProspectQuality = 'a' | 'b' | 'c' | 'd' | 'f';

export interface Prospect {
  id: string;
  user_id: string;
  
  // Source tracking
  source_job_id?: string;
  source_type: 'apollo' | 'manual' | 'upload' | 'api' | 'linkedin';
  source_url?: string;
  source_provider_id?: string;

  // Person data
  person_name: string;
  person_first_name?: string;
  person_last_name?: string;
  person_email?: string;
  person_phone?: string;
  person_title?: string;
  person_seniority?: string;
  person_department?: string;
  person_linkedin_url?: string;
  person_twitter_url?: string;
  person_bio?: string;
  person_location?: string;
  
  // Company data
  company_name?: string;
  company_domain?: string;
  company_website?: string;
  company_linkedin_url?: string;
  company_size?: string;
  company_employee_count?: number;
  company_industry?: string;
  company_subindustry?: string;
  company_location?: string;
  company_country?: string;
  company_founded_year?: number;
  company_description?: string;
  
  // Technographics
  technologies: string[];
  
  // Firmographics
  company_revenue?: string;
  company_funding?: string;
  company_funding_stage?: string;
  company_raised?: string;
  
  // Intent signals
  intent_signals: {
    hiring_for?: string[];
    recent_news?: string;
    job_openings?: number;
    [key: string]: unknown;
  };
  
  // Enrichment status
  enrichment_status: ProspectEnrichmentStatus;
  enrichment_data: Record<string, unknown>;
  
  // Quality scoring
  quality_score?: ProspectQuality;
  scoring_metadata: {
    title_match?: number;
    company_fit?: number;
    data_completeness?: number;
    total_score?: number;
    factors?: string[];
  };
  
  // Flags
  is_email_verified: boolean;
  is_do_not_contact: boolean;
  is_unsubscribed: boolean;
  is_bounced: boolean;
  
  // Campaign tracking
  campaign_ids: string[];
  last_contact_at?: string;
  contact_count: number;
  
  // Linked account
  linked_account_id?: string;
  
  // Analytics
  created_at: string;
  updated_at: string;
  last_enriched_at?: string;
  version: number;
}

export interface CreateProspectInput {
  person_name: string;
  person_email?: string;
  person_title?: string;
  company_name?: string;
  company_domain?: string;
  source_job_id?: string;
}

// ============================================================================
// Outreach Campaigns
// ============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
export type CampaignType = 'email' | 'linkedin' | 'sequence' | 'ab_test' | 'event' | 'retargeting';

export interface OutreachCampaign {
  id: string;
  user_id: string;
  
  // Campaign basics
  name: string;
  description?: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  
  // Targeting
  targeting_criteria: {
    quality_tiers?: ProspectQuality[];
    industries?: string[];
    titles?: string[];
    company_size?: string[];
    exclude_existing_customers?: boolean;
    [key: string]: unknown;
  };
  target_prospect_ids: string[];
  
  // Sequence reference
  sequence_id?: string;
  
  // Sender info
  sender_name?: string;
  sender_email?: string;
  sender_title?: string;
  reply_to_email?: string;
  
  // Settings
  settings: {
    send_hours_start?: string;
    send_hours_end?: string;
    send_days?: string[];
    max_contacts_per_day?: number;
    throttle_delay_hours?: number;
    track_opens?: boolean;
    track_clicks?: boolean;
  };
  
  // Scheduling
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  started_at?: string;
  completed_at?: string;
  
  // Goals
  goals: {
    target_contacts?: number;
    target_meetings?: number;
    target_reply_rate?: number;
  };
  
  // Metrics
  metrics: {
    contacts_added?: number;
    emails_sent?: number;
    emails_delivered?: number;
    emails_opened?: number;
    emails_clicked?: number;
    replies?: number;
    meetings?: number;
    unsubscribes?: number;
    bounces?: number;
  };
  
  // A/B Test
  ab_test_config: {
    is_active?: boolean;
    variants?: string[];
    split_ratio?: number[];
    test_subject_line?: boolean;
  };
  
  // Pause tracking
  pause_reason?: string;
  paused_at?: string;
  
  // Metadata
  tags: string[];
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  campaign_type?: CampaignType;
  targeting_criteria?: OutreachCampaign['targeting_criteria'];
  sequence_id?: string;
  sender_name?: string;
  sender_email?: string;
  settings?: OutreachCampaign['settings'];
  scheduled_start_date?: string;
  goals?: OutreachCampaign['goals'];
  tags?: string[];
}

// ============================================================================
// Outreach Sequences
// ============================================================================

export type SequenceStepType = 'email' | 'linkedin_connect' | 'linkedin_message' | 'call_task' | 'wait' | 'manual_task';
export type SequenceStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface SequenceStep {
  step_number: number;
  step_type: SequenceStepType;
  delay_hours: number;
  subject?: string;
  body_template?: string;
  personalization_tokens?: string[];
  condition?: string;  // e.g., 'no_reply', 'no_reply_and_not_opened'
}

export interface OutreachSequence {
  id: string;
  user_id: string;
  
  name: string;
  description?: string;
  status: SequenceStatus;
  
  steps: SequenceStep[];
  available_variables: {
    person?: string[];
    company?: string[];
    custom?: string[];
  };
  
  total_steps: number;
  expected_duration_hours?: number;
  
  // A/B Testing
  is_variant: boolean;
  parent_sequence_id?: string;
  variant_name?: string;
  
  // Performance
  performance_metrics: {
    times_used?: number;
    avg_reply_rate?: number;
    best_performing_step?: number;
    reply_by_step?: Record<string, number>;
  };
  
  // Categorization
  tags: string[];
  category?: string;
  
  // Settings
  settings: {
    exit_on_reply?: boolean;
    exit_on_meeting?: boolean;
    track_email_opens?: boolean;
    track_link_clicks?: boolean;
    stop_on_bounce?: boolean;
    max_follow_ups?: number;
  };
  
  created_at: string;
  updated_at: string;
}

export interface CreateSequenceInput {
  name: string;
  description?: string;
  steps: SequenceStep[];
  category?: string;
  tags?: string[];
}

// ============================================================================
// Communications
// ============================================================================

export type CommunicationChannel = 'email' | 'linkedin' | 'phone' | 'sms' | 'meeting' | 'manual_note' | 'system';
export type CommunicationDirection = 'outbound' | 'inbound';
export type CommunicationStatus = 
  | 'pending' | 'scheduled' | 'sending' | 'sent' | 'delivered' 
  | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
  | 'unsubscribed' | 'complaint' | 'draft';

export interface Communication {
  id: string;
  user_id: string;
  
  // Linkages
  prospect_id: string;
  campaign_id?: string;
  sequence_id?: string;
  sequence_step_number?: number;
  
  // Content
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  
  // Email content
  subject?: string;
  body?: string;
  body_html?: string;
  
  // LinkedIn
  linkedin_message_id?: string;
  linkedin_conversation_id?: string;
  
  // Call/Meeting
  call_duration_minutes?: number;
  call_recording_url?: string;
  meeting_notes?: string;
  
  // Addresses
  from_address?: string;
  to_address?: string;
  cc_addresses?: string[];
  bcc_addresses?: string[];
  
  // Tracking
  message_id?: string;
  thread_id?: string;
  in_reply_to?: string;
  
  // Engagement timestamps
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  bounced_at?: string;
  
  // Engagement counts
  open_count: number;
  click_count: number;
  last_opened_at?: string;
  last_clicked_at?: string;
  
  // Link tracking
  link_clicks: Record<string, {
    clicks: number;
    first_clicked_at: string;
  }>;
  
  // Reply analysis
  reply_body_preview?: string;
  reply_sentiment?: 'positive' | 'neutral' | 'negative' | 'objection';
  reply_category?: 'interested' | 'not_interested' | 'timing' | 'referral' | 'ooo' | 'other';
  ai_reply_analysis: {
    sentiment_score?: number;
    intent?: string;
    key_points?: string[];
    action_items?: string[];
    objections?: string[];
  };
  
  // Bounce details
  bounce_reason?: string;
  bounce_type?: 'hard' | 'soft';
  
  // System/Sentiment
  is_automated: boolean;
  approval_status?: 'not_required' | 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  
  // Error tracking
  error_message?: string;
  retry_count: number;
  max_retries: number;
  
  // Timing
  response_time_hours?: number;
  
  // Raw data
  raw_provider_data: Record<string, unknown>;
  
  // Metadata
  metadata: Record<string, unknown>;
  tags: string[];
  
  created_at: string;
  updated_at: string;
}

export interface CreateCommunicationInput {
  prospect_id: string;
  campaign_id?: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject?: string;
  body?: string;
  to_address?: string;
}

// ============================================================================
// Command History
// ============================================================================

export type CommandStatus = 'pending' | 'validating' | 'parsed' | 'routing' | 'executing' | 'completed' | 'failed' | 'cancelled';
export type CommandType = 
  | 'research_prospects' 
  | 'enrich_person' 
  | 'enrich_company' 
  | 'create_campaign'
  | 'create_sequence'
  | 'add_to_campaign'
  | 'view_results'
  | 'view_analytics'
  | 'help'
  | 'unknown';

export interface CommandHistory {
  id: string;
  user_id: string;
  
  raw_command: string;
  normalized_command?: string;
  
  command_type?: CommandType;
  confidence_score?: number;
  
  parsed_entities: {
    action?: string;
    count?: number;
    title?: string;
    industry?: string;
    company_size?: string;
    location?: string;
    technology?: string;
    domain?: string;
    email?: string;
    account_name?: string;
    [key: string]: unknown;
  };
  
  nlp_metadata: {
    parser_version?: string;
    tokens?: string[];
    entities?: Array<{
      type: string;
      value: unknown;
      start: number;
      end: number;
    }>;
    intent?: string;
  };
  
  routed_to?: string;
  handler_name?: string;
  status: CommandStatus;
  
  related_resources: {
    research_job_id?: string;
    campaign_id?: string;
    prospect_ids?: string[];
  };
  
  result_type?: 'success' | 'partial_success' | 'failure' | 'invalid_command';
  result_message?: string;
  result_data: Record<string, unknown>;
  
  error_code?: string;
  error_details: Record<string, unknown>;
  
  // Timing
  received_at: string;
  parsed_at?: string;
  routed_at?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  
  // User feedback
  user_feedback?: string;
  user_feedback_reason?: string;
  user_feedback_at?: string;
  
  session_id?: string;
  conversation_context: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Apollo.io Integration Types
// ============================================================================

export interface ApolloSearchCriteria {
  person_titles?: string[];
  person_seniorities?: string[];
  organization_num_employees?: {
    min?: number;
    max?: number;
  };
  q_organization_keyword_tags?: string[];
  organization_locations?: string[];
  person_locations?: string[];
  contact_email_status?: 'verified' | 'unverified' | 'likely';
}

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  linkedin_url?: string;
  title?: string;
  seniority?: string;
  department?: string;
  email?: string;
  email_status?: string;
  email_source?: string;
  phone_numbers?: Array<{
    sanitized_number: string;
    raw_number: string;
    type: string;
  }>;
  organization?: ApolloOrganization;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  linkedin_url?: string;
  primary_domain?: string;
  estimated_num_employees?: number;
  industries?: string[];
  keywords?: string[];
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  funding?: {
    funding_total?: {
      amount?: number;
      currency?: string;
    };
    latest_funding_round?: string;
  };
  technologies?: string[];
}

export interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

// ============================================================================
// Queue System Types
// ============================================================================

export interface QueueJob {
  id: string;
  name: string;
  data: unknown;
  opts: {
    delay?: number;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  };
  progress: number | object;
  attemptsMade: number;
  failedReason?: string;
  stacktrace?: string[];
  returnvalue?: unknown;
  processedOn?: number;
  finishedOn?: number;
}

export interface ResearchQueueData {
  jobId: string;
  userId: string;
  jobType: ResearchJobType;
  criteria: ResearchJob['search_criteria'];
  target?: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface ResearchDashboardMetrics {
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  prospectsEnriched: number;
  avgEnrichmentTime: number;
}

export interface CampaignDashboardMetrics {
  activeCampaigns: number;
  totalProspects: number;
  emailsSent: number;
  emailsOpened: number;
  replyRate: number;
  meetingsBooked: number;
}

export interface CommandSuggestion {
  command: string;
  description: string;
  example: string;
  icon?: string;
}