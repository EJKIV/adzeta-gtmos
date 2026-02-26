/**
 * AdZeta GTM — Agent System
 * 
 * Unified agentic framework for autonomous GTM operations.
 */

// Registry
export { skillRegistry, SkillDefinition } from './skill-registry';
export type { SkillDefinition } from './skill-registry';

// Delegation
export {
  analyzeIntent,
  makeDelegationDecision,
  delegate,
  IntentAnalysis,
  DelegationDecision,
  DelegationContext,
} from './delegation-router';

// Memory
export {
  memoryStore,
  globalMemoryStore,
  UserMemory,
  GlobalMemory,
} from './memory-store';

// Specialists
export {
  researchProspects,
  scoreProspects,
  deduplicateProspects,
  filterByQuality,
  exportToCSV,
  Prospect,
  ProspectResearchParams,
  ProspectResearchResult,
} from './prospect-researcher';

// Version
export const AGENT_SYSTEM_VERSION = '1.0.0';
