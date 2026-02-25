/**
 * Research & Outreach Platform
 * 
 * Phase 1: Research & Outreach Foundation
 * 
 * This module provides autonomous research and outreach capabilities including:
 * - Apollo.io integration for prospect search and enrichment
 * - Natural language command processing
 * - Async research queue with rate limiting
 * - Campaign and sequence management
 */

// Types
export * from './types';

// Apollo MCP Client
export { ApolloMCP, ApolloError } from './apollo-client';
export type { ApolloPerson, ApolloOrganization, ApolloSearchResponse } from './types';

// Command Parser
export { CommandParser, parseCommand, getCommandSuggestions } from './command-parser';
export type { ParsedCommand, ParseResult } from './command-parser';

// Command Router
export { CommandRouter, commandRouter } from './command-router';
export type { RouterConfig, ExecutionContext, HandlerResult } from './command-router';

// Queue System
export { ResearchQueue } from './research-queue';

// ============================================================================
// Convenience Functions
// ============================================================================

import { CommandRouter } from './command-router';
import { ApolloMCP } from './apollo-client';

/**
 * Execute a natural language command
 */
export async function executeCommand(
  command: string,
  userId: string,
  sessionId?: string
) {
  const router = new CommandRouter({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  });
  
  return router.execute(command, userId, sessionId);
}

/**
 * Check system health
 */
export async function checkHealth() {
  const [apolloHealth] = await Promise.all([
    ApolloMCP.checkHealth(),
  ]);
  
  return {
    status: apolloHealth.healthy ? 'healthy' : 'degraded',
    services: {
      apollo: apolloHealth,
    },
  };
}

// ============================================================================
// Module Version
// ============================================================================

export const VERSION = '1.0.0-phase1';
export const NAME = 'Research & Outreach Platform';