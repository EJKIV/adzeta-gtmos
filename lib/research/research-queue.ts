/**
 * Research Queue System
 * 
 * Async processing with rate limiting and error handling
 * Supports Bull/Redis or in-memory fallback
 */

import { ResearchJob, ResearchJobType, ResearchQueueData, Prospect } from './types';
import { ApolloMCP, ApolloPerson } from './apollo-client';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Apollo rate limits
const RATE_LIMIT = {
  maxRequestsPerMinute: 10,
  minDelayMs: 6000, // 6 seconds between requests
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelayMs: 1000,
};

// ============================================================================
// Queue Job Interface
// ============================================================================

interface QueueJob {
  id: string;
  name: string;
  data: ResearchQueueData;
  progress: number;
  attemptsMade: number;
  failedReason?: string;
}

// ============================================================================
// Research Queue Implementation
// ============================================================================

export class ResearchQueueWorker {
  private supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  private isRunning = false;
  private activeJobs = new Map<string, QueueJob>();
  private jobQueue: QueueJob[] = [];
  private processingInterval?: NodeJS.Timeout;

  /**
   * Add a job to the queue
   */
  async add(name: string, data: ResearchQueueData, options?: {
    delay?: number;
    attempts?: number;
  }): Promise<QueueJob> {
    const job: QueueJob = {
      id: crypto.randomUUID(),
      name,
      data,
      progress: 0,
      attemptsMade: 0,
    };

    this.jobQueue.push(job);
    
    console.log(`[Queue] Job ${job.id} added: ${name}`);
    
    // Start processing if not already running
    if (!this.isRunning) {
      this.start();
    }

    return job;
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[Queue] Worker started');
    
    // Process jobs every 6 seconds (10/min rate limit)
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, RATE_LIMIT.minDelayMs);
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    console.log('[Queue] Worker stopped');
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): QueueJob | undefined {
    return this.activeJobs.get(jobId) || 
           this.jobQueue.find(j => j.id === jobId);
  }

  /**
   * Get queue stats
   */
  getStats(): {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  } {
    return {
      pending: this.jobQueue.length,
      active: this.activeJobs.size,
      completed: 0, // Would track in database
      failed: 0,
    };
  }

  // ============================================================================
  // Job Processing
  // ============================================================================

  /**
   * Process the next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (this.activeJobs.size >= 1) {
      // Only process one at a time to respect rate limits
      return;
    }

    const job = this.jobQueue.shift();
    if (!job) return;

    this.activeJobs.set(job.id, job);

    try {
      await this.executeJob(job);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: QueueJob): Promise<void> {
    console.log(`[Queue] Executing job ${job.id}: ${job.name}`);

    try {
      // Update job status to active
      await this.updateJobStatus(job.data.jobId, 'active');

      switch (job.name) {
        case 'prospect-search':
          await this.handleProspectSearch(job);
          break;
        case 'enrich-person':
          await this.handleEnrichPerson(job);
          break;
        case 'enrich-company':
          await this.handleEnrichCompany(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      // Update job status to completed
      await this.updateJobStatus(job.data.jobId, 'completed');
      job.progress = 100;
      
      console.log(`[Queue] Job ${job.id} completed successfully`);

    } catch (error) {
      console.error(`[Queue] Job ${job.id} failed:`, error);
      
      job.attemptsMade++;
      job.failedReason = error instanceof Error ? error.message : 'Unknown error';

      if (job.attemptsMade < RETRY_CONFIG.maxRetries) {
        // Retry with exponential backoff
        const delay = RETRY_CONFIG.initialDelayMs * 
                      Math.pow(RETRY_CONFIG.backoffMultiplier, job.attemptsMade);
        
        console.log(`[Queue] Retrying job ${job.id} in ${delay}ms (attempt ${job.attemptsMade})`);
        
        setTimeout(() => {
          this.jobQueue.push(job);
        }, delay);
        
        await this.updateJobStatus(job.data.jobId, 'pending', {
          retry_count: job.attemptsMade,
          error_message: job.failedReason,
        });
      } else {
        // Max retries reached
        await this.updateJobStatus(job.data.jobId, 'failed', {
          error_message: job.failedReason,
          retry_count: job.attemptsMade,
        });
      }
    }
  }

  // ============================================================================
  // Job Handlers
  // ============================================================================

  /**
   * Handle prospect search job
   */
  private async handleProspectSearch(job: QueueJob): Promise<void> {
    const { criteria, userId, jobId } = job.data;
    
    // Update job with search params
    const targetCount = criteria.count || 50;
    await this.updateJobProgress(jobId, {
      total_requests: targetCount,
      estimated_results: targetCount,
    });

    // Convert criteria to Apollo format
    const apolloCriteria = {
      person_titles: criteria.person_titles || criteria.titles,
      q_organization_keyword_tags: criteria.industry ? [criteria.industry] : undefined,
    };

    // Search in batches
    let foundProspects: ApolloPerson[] = [];
    let page = 1;
    const batchSize = 100;

    while (foundProspects.length < targetCount) {
      const response = await ApolloMCP.searchProspects(apolloCriteria, {
        page,
        perPage: batchSize,
      });

      if (response.people.length === 0) break;

      foundProspects = foundProspects.concat(response.people);
      
      // Update progress
      const progress = Math.min(50, (foundProspects.length / targetCount) * 50);
      job.progress = progress;
      await this.updateJobProgress(jobId, {
        progress_percent: Math.round(progress),
      });

      if (response.people.length < batchSize) break;
      page++;
    }

    // Limit to target count
    foundProspects = foundProspects.slice(0, targetCount);

    // Update job with found count
    await this.updateJobProgress(jobId, {
      results_summary: {
        prospects_found: foundProspects.length,
      },
    });

    // Create prospects in database
    let enriched = 0;
    let failed = 0;

    for (let i = 0; i < foundProspects.length; i++) {
      const apolloPerson = foundProspects[i];
      
      try {
        await this.createOrUpdateProspect(apolloPerson, {
          userId,
          sourceJobId: jobId,
          sourceType: 'apollo',
        });
        enriched++;
      } catch (error) {
        console.warn(`Failed to save prospect:`, error);
        failed++;
      }

      // Update progress (50-90% for saving)
      const saveProgress = 50 + ((i + 1) / foundProspects.length) * 40;
      job.progress = saveProgress;
      
      if (i % 10 === 0) {
        await this.updateJobProgress(jobId, {
          progress_percent: Math.round(saveProgress),
          completed_requests: enriched,
          failed_requests: failed,
        });
      }
    }

    // Final update
    await this.updateJobStatus(jobId, 'completed', {
      progress_percent: 100,
      completed_requests: enriched,
      failed_requests: failed,
      results_summary: {
        prospects_found: foundProspects.length,
        enriched,
        failed,
        avg_confidence: enriched / foundProspects.length,
      },
    });
  }

  /**
   * Handle person enrichment job
   */
  private async handleEnrichPerson(job: QueueJob): Promise<void> {
    const { target, userId, jobId } = job.data;
    
    if (!target) {
      throw new Error('No email provided for enrichment');
    }

    await this.updateJobProgress(jobId, {
      total_requests: 1,
    });

    // Enrich via Apollo
    const person = await ApolloMCP.enrichPerson(target);

    if (!person) {
      throw new Error(`No data found for ${target}`);
    }

    // Create/update prospect
    await this.createOrUpdateProspect(person, {
      userId,
      sourceJobId: jobId,
      sourceType: 'apollo',
    });

    await this.updateJobStatus(jobId, 'completed', {
      progress_percent: 100,
      completed_requests: 1,
      results_summary: {
        enriched: 1,
      },
    });
  }

  /**
   * Handle company enrichment job
   */
  private async handleEnrichCompany(job: QueueJob): Promise<void> {
    const { target, userId, jobId } = job.data;
    
    if (!target) {
      throw new Error('No domain provided for enrichment');
    }

    await this.updateJobProgress(jobId, {
      total_requests: 1,
    });

    // Enrich via Apollo
    const result = await ApolloMCP.getTechnographics(target);

    // Store enrichment data
    await this.supabase.from('research_ledger').insert({
      user_id: userId,
      hypothesis: `Company enrichment for ${target}`,
      evidence: JSON.stringify(result),
      status: 'validated',
      metadata: {
        domain: target,
        technologies: result.technologies,
        source: 'apollo',
      },
    });

    await this.updateJobStatus(jobId, 'completed', {
      progress_percent: 100,
      completed_requests: 1,
      results_summary: {
        technologies_found: result.technologies.length,
      },
    });
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  /**
   * Create or update a prospect from Apollo data
   */
  private async createOrUpdateProspect(
    apolloPerson: ApolloPerson,
    context: {
      userId: string;
      sourceJobId: string;
      sourceType: string;
    }
  ): Promise<void> {
    const org = apolloPerson.organization;
    
    const prospect: Partial<Prospect> = {
      user_id: context.userId,
      source_job_id: context.sourceJobId,
      source_type: context.sourceType as Prospect['source_type'],
      
      // Person data
      person_name: apolloPerson.name || 
        `${apolloPerson.first_name || ''} ${apolloPerson.last_name || ''}`.trim(),
      person_first_name: apolloPerson.first_name,
      person_last_name: apolloPerson.last_name,
      person_email: apolloPerson.email,
      person_title: apolloPerson.title,
      person_seniority: apolloPerson.seniority,
      person_department: apolloPerson.department,
      person_linkedin_url: apolloPerson.linkedin_url,
      
      // Company data
      company_name: org?.name,
      company_domain: org?.primary_domain,
      company_website: org?.website_url,
      company_linkedin_url: org?.linkedin_url,
      company_size: org?.estimated_num_employees ? 
        this.formatCompanySize(org.estimated_num_employees) : null,
      company_employee_count: org?.estimated_num_employees,
      company_industry: org?.industries?.[0],
      
      // Technographics
      technologies: org?.technologies || [],
      
      // Enrichment status
      enrichment_status: 'enriched',
      enrichment_data: {
        apollo_id: apolloPerson.id,
        organization_id: org?.id,
      },
      last_enriched_at: new Date().toISOString(),
    };

    // Check for existing prospect
    const { data: existing } = await this.supabase
      .from('prospects')
      .select('id')
      .eq('user_id', context.userId)
      .eq('person_email', prospect.person_email)
      .single();

    if (existing) {
      await this.supabase
        .from('prospects')
        .update(prospect)
        .eq('id', existing.id);
    } else {
      await this.supabase.from('prospects').insert(prospect);
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: ResearchJob['status'],
    updates?: Partial<ResearchJob>
  ): Promise<void> {
    await this.supabase
      .from('research_jobs')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    updates: Partial<ResearchJob>
  ): Promise<void> {
    await this.supabase
      .from('research_jobs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Format company size from employee count
   */
  private formatCompanySize(count: number): string {
    if (count < 11) return '1-10';
    if (count < 51) return '11-50';
    if (count < 201) return '51-200';
    if (count < 501) return '201-500';
    if (count < 1001) return '501-1000';
    if (count < 5001) return '1001-5000';
    if (count < 10001) return '5001-10000';
    return '10000+';
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const ResearchQueue = new ResearchQueueWorker();

export default ResearchQueue;