/**
 * Command Router
 * 
 * Routes parsed commands to appropriate handlers
 * Manages execution flow and error handling
 */

import { createClient } from '@supabase/supabase-js';
import { CommandParser, ParsedCommand } from './command-parser';
import { CommandHistory, CommandType, CommandStatus, ResearchJob } from './types';
import { ApolloMCP } from './apollo-client';
import { ResearchQueue } from './research-queue';

// ============================================================================
// Types
// ============================================================================

export interface RouterConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface ExecutionContext {
  userId: string;
  sessionId?: string;
  commandId?: string;
}

export interface HandlerResult {
  success: boolean;
  type: CommandType;
  message: string;
  data?: Record<string, unknown>;
  resources?: {
    research_job_id?: string;
    campaign_id?: string;
    prospect_ids?: string[];
  };
  error?: string;
  suggestedCommands?: string[];
}

export type CommandHandler = (
  parsed: ParsedCommand,
  context: ExecutionContext
) => Promise<HandlerResult>;

// ============================================================================
// Router Class
// ============================================================================

export class CommandRouter {
  private supabase: ReturnType<typeof createClient>;
  private handlers: Map<CommandType, CommandHandler> = new Map();
  private commandHistory: CommandHistory[] = [];

  constructor(config: RouterConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.registerDefaultHandlers();
  }

  /**
   * Register a handler for a command type
   */
  registerHandler(type: CommandType, handler: CommandHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    this.handlers.set('research_prospects', this.handleResearchProspects.bind(this));
    this.handlers.set('enrich_person', this.handleEnrichPerson.bind(this));
    this.handlers.set('enrich_company', this.handleEnrichCompany.bind(this));
    this.handlers.set('create_campaign', this.handleCreateCampaign.bind(this));
    this.handlers.set('help', this.handleHelp.bind(this));
    this.handlers.set('unknown', this.handleUnknown.bind(this));
  }

  /**
   * Route and execute a command
   */
  async execute(
    rawCommand: string,
    userId: string,
    sessionId?: string
  ): Promise<HandlerResult> {
    // Create command history entry
    const commandHistory: Partial<CommandHistory> = {
      user_id: userId,
      raw_command: rawCommand,
      normalized_command: rawCommand.toLowerCase().trim(),
      status: 'pending',
      received_at: new Date().toISOString(),
      session_id: sessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Parse the command
      const parseResult = CommandParser.parse(rawCommand);
      
      // Update history with parsing status
      commandHistory.status = 'parsed';
      commandHistory.parsed_at = new Date().toISOString();
      
      if (!parseResult.success || !parseResult.parsed) {
        commandHistory.status = 'failed';
        commandHistory.result_type = 'invalid_command';
        commandHistory.result_message = parseResult.error || 'Failed to parse command';
        await this.saveCommandHistory(commandHistory as CommandHistory);
        
        return {
          success: false,
          type: 'unknown',
          message: parseResult.error || 'I did not understand that. Try "help" for examples.',
          suggestedCommands: CommandParser.getSuggestions(rawCommand),
        };
      }

      const parsed = parseResult.parsed;
      
      // Update history with parsed data
      commandHistory.command_type = parsed.type;
      commandHistory.confidence_score = parsed.confidence;
      commandHistory.parsed_entities = parsed.entities;
      commandHistory.nlp_metadata = {
        tokens: parsed.tokens,
        intent: parsed.intent,
      };

      // Validate the command
      const validation = CommandParser.validate(parsed);
      if (!validation.valid) {
        commandHistory.status = 'failed';
        commandHistory.result_type = 'invalid_command';
        commandHistory.result_message = `Missing required fields: ${validation.missing.join(', ')}`;
        commandHistory.error_details = { missing: validation.missing };
        await this.saveCommandHistory(commandHistory as CommandHistory);
        
        return {
          success: false,
          type: parsed.type,
          message: `Please provide: ${validation.missing.join(', ')}`,
          suggestedCommands: this.generateHelpfulSuggestions(parsed),
        };
      }

      // Route to handler
      commandHistory.status = 'routing';
      commandHistory.routed_at = new Date().toISOString();
      
      const handler = this.handlers.get(parsed.type) || this.handlers.get('unknown')!;
      commandHistory.handler_name = handler.name;
      
      const context: ExecutionContext = {
        userId,
        sessionId,
        commandId: commandHistory.id,
      };

      commandHistory.status = 'executing';
      commandHistory.started_at = new Date().toISOString();
      await this.saveCommandHistory(commandHistory as CommandHistory);

      // Execute handler
      const result = await handler(parsed, context);

      // Update history with result
      commandHistory.status = 'completed';
      commandHistory.completed_at = new Date().toISOString();
      commandHistory.result_type = result.success ? 'success' : 'failure';
      commandHistory.result_message = result.message;
      commandHistory.related_resources = result.resources || {};
      commandHistory.result_data = result.data || {};
      
      await this.saveCommandHistory(commandHistory as CommandHistory);

      return result;

    } catch (error) {
      // Update history with error
      commandHistory.status = 'failed';
      commandHistory.completed_at = new Date().toISOString();
      commandHistory.result_type = 'failure';
      commandHistory.result_message = error instanceof Error ? error.message : 'Unknown error';
      commandHistory.error_code = error instanceof Error ? error.name : 'UNKNOWN_ERROR';
      
      await this.saveCommandHistory(commandHistory as CommandHistory);

      return {
        success: false,
        type: 'unknown',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save command history to database
   */
  private async saveCommandHistory(history: Partial<CommandHistory>): Promise<void> {
    try {
      if (history.id) {
        await this.supabase
          .from('command_history')
          .update(history)
          .eq('id', history.id);
      } else {
        await this.supabase
          .from('command_history')
          .insert(history);
      }
    } catch (error) {
      console.error('Failed to save command history:', error);
    }
  }

  // ============================================================================
  // Built-in Handlers
  // ============================================================================

  /**
   * Handle prospect research command
   */
  private async handleResearchProspects(
    parsed: ParsedCommand,
    context: ExecutionContext
  ): Promise<HandlerResult> {
    const { count = 50, title, titles, industry } = parsed.entities;
    
    // Create research job
    const researchJob: Partial<ResearchJob> = {
      user_id: context.userId,
      job_type: 'prospect_search',
      status: 'queued',
      priority: 5,
      search_criteria: {
        count,
        person_titles: titles || (title ? [title] : []),
        industry: industry,
      },
      estimated_results: count,
    };

    try {
      const { data, error } = await this.supabase
        .from('research_jobs')
        .insert(researchJob)
        .select()
        .single();

      if (error) throw error;

      // Queue the job for async processing
      await ResearchQueue.add('prospect-search', {
        jobId: data.id,
        userId: context.userId,
        jobType: 'prospect_search',
        criteria: researchJob.search_criteria,
      });

      return {
        success: true,
        type: 'research_prospects',
        message: `Research job queued! Looking for ${count} ${title || 'contacts'}${industry ? ` in ${industry}` : ''}. You'll receive updates as results come in.`,
        resources: {
          research_job_id: data.id,
        },
        data: {
          jobId: data.id,
          estimatedTime: this.estimateResearchTime(count),
        },
      };
    } catch (error) {
      return {
        success: false,
        type: 'research_prospects',
        message: 'Failed to queue research job. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle person enrichment command
   */
  private async handleEnrichPerson(
    parsed: ParsedCommand,
    context: ExecutionContext
  ): Promise<HandlerResult> {
    const { email } = parsed.entities;
    
    if (!email) {
      return {
        success: false,
        type: 'enrich_person',
        message: 'Please provide an email address to enrich.',
      };
    }

    try {
      // Create research job
      const { data, error } = await this.supabase
        .from('research_jobs')
        .insert({
          user_id: context.userId,
          job_type: 'person_enrich',
          status: 'queued',
          enrichment_target: email,
        })
        .select()
        .single();

      if (error) throw error;

      // Queue enrichment job
      await ResearchQueue.add('enrich-person', {
        jobId: data.id,
        userId: context.userId,
        jobType: 'person_enrich',
        target: email,
      });

      return {
        success: true,
        type: 'enrich_person',
        message: `Enriching contact data for ${email}...`,
        resources: {
          research_job_id: data.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        type: 'enrich_person',
        message: 'Failed to start enrichment. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle company enrichment command
   */
  private async handleEnrichCompany(
    parsed: ParsedCommand,
    context: ExecutionContext
  ): Promise<HandlerResult> {
    const { domain } = parsed.entities;
    
    if (!domain) {
      return {
        success: false,
        type: 'enrich_company',
        message: 'Please provide a domain to enrich.',
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('research_jobs')
        .insert({
          user_id: context.userId,
          job_type: 'company_enrich',
          status: 'queued',
          enrichment_target: domain,
        })
        .select()
        .single();

      if (error) throw error;

      // Queue enrichment job
      await ResearchQueue.add('enrich-company', {
        jobId: data.id,
        userId: context.userId,
        jobType: 'company_enrich',
        target: domain,
      });

      return {
        success: true,
        type: 'enrich_company',
        message: `Enriching company data for ${domain}...`,
        resources: {
          research_job_id: data.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        type: 'enrich_company',
        message: 'Failed to start enrichment. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle create campaign command
   */
  private async handleCreateCampaign(
    parsed: ParsedCommand,
    context: ExecutionContext
  ): Promise<HandlerResult> {
    const { campaign_name } = parsed.entities;
    
    if (!campaign_name) {
      return {
        success: false,
        type: 'create_campaign',
        message: 'Please provide a name for the campaign.',
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('outreach_campaigns')
        .insert({
          user_id: context.userId,
          name: campaign_name,
          status: 'draft',
          campaign_type: 'email',
          targeting_criteria: {},
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        type: 'create_campaign',
        message: `Created campaign "${campaign_name}". Go to the campaign page to configure and launch.`,
        resources: {
          campaign_id: data.id,
        },
      };
    } catch (error) {
      return {
        success: false,
        type: 'create_campaign',
        message: 'Failed to create campaign. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle help command
   */
  private async handleHelp(
    _parsed: ParsedCommand,
    _context: ExecutionContext
  ): Promise<HandlerResult> {
    return {
      success: true,
      type: 'help',
      message: `Here are some things you can ask me:

**Research:**
• "research 50 VP Sales in fintech"
• "find 100 Head of Marketing in SaaS"

**Enrichment:**
• "enrich john@example.com"
• "enrich company example.com"

**Campaigns:**
• "create campaign for Q1 outreach"
• "create sequence for enterprise prospects"

**Analytics:**
• "show me results"
• "view campaign analytics"`,
      data: {
        examples: [
          'research 50 VP Sales in fintech',
          'enrich john@example.com',
          'create campaign for Q1 outreach',
          'show me results',
        ],
      },
    };
  }

  /**
   * Handle unknown command
   */
  private async handleUnknown(
    parsed: ParsedCommand,
    _context: ExecutionContext
  ): Promise<HandlerResult> {
    return {
      success: false,
      type: 'unknown',
      message: `I'm not sure how to handle that. Try asking for "help" to see what I can do.`,
      suggestedCommands: CommandParser.getSuggestions(parsed.tokens.join(' ')),
    };
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Estimate research time based on count
   */
  private estimateResearchTime(count: number): string {
    const minutes = Math.ceil(count / 10) * 2; // Rough estimate
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return 'About a minute';
    if (minutes < 5) return 'A few minutes';
    return `About ${minutes} minutes`;
  }

  /**
   * Generate helpful suggestions for incomplete commands
   */
  private generateHelpfulSuggestions(parsed: ParsedCommand): string[] {
    const suggestions: string[] = [];
    
    switch (parsed.type) {
      case 'research_prospects':
        if (!parsed.entities.industry) {
          suggestions.push(
            'research 50 VP Sales in fintech',
            'find 100 Head of Revenue in SaaS',
          );
        }
        break;
        
      case 'enrich_person':
        suggestions.push('enrich name@example.com');
        break;
        
      case 'enrich_company':
        suggestions.push('enrich company example.com');
        break;
    }
    
    return suggestions;
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const routerConfig: RouterConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

export const commandRouter = new CommandRouter(routerConfig);

export default commandRouter;