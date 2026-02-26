/**
 * AdZeta GTM — Delegation Router
 * 
 * Intent analysis & skill matching for the orchestrator.
 * Determines which skills to invoke based on user input.
 */

import { skillRegistry, SkillDefinition } from './skill-registry';
import { UserMemory } from './memory-store';

export interface IntentAnalysis {
  /** Classified intent */
  intent: string;
  
  /** Confidence in classification (0-1) */
  confidence: number;
  
  /** Primary intent category */
  category: 'research' | 'campaign' | 'analytics' | 'optimization' | 'unknown';
  
  /** Extracted entities from input */
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  
  /** Suggested parameters */
  parameters: Record<string, any>;
  
  /** Ambiguity level */
  ambiguity: 'low' | 'medium' | 'high';
  
  /** Requires clarification questions */
  needsClarification: boolean;
  
  /** Clarifying questions */
  clarifyingQuestions?: string[];
}

export interface DelegationDecision {
  /** Can execute automatically or needs approval */
  action: 'execute' | 'propose' | 'clarify';
  
  /** Skills to invoke */
  skills: Array<{
    skill: SkillDefinition;
    confidence: number;
    parameters: Record<string, any>;
    priority: number;
  }>;
  
  /** Execution strategy */
  strategy: 'single' | 'parallel' | 'sequential';
  
  /** Estimated cost */
  estimatedCost: number;
  
  /** Estimated duration */
  estimatedDuration: string;
  
  /** User-facing explanation of what will happen */
  explanation: string;
  
  /** Any warnings or concerns */
  warnings?: string[];
}

export interface DelegationContext {
  /** Current user ID */
  userId: string;
  
  /** User's memory/prefs */
  userMemory: UserMemory;
  
  /** Session history */
  sessionHistory: Array<{
    role: 'user' | 'agent';
    content: string;
    timestamp: Date;
  }>;
  
  /** Current campaign context (if any) */
  activeCampaign?: string;
  
  /** Current project context */
  currentContext?: string;
}

/**
 * Parse intent from user input
 */
export async function analyzeIntent(
  input: string,
  context: DelegationContext
): Promise<IntentAnalysis> {
  const normalizedInput = input.toLowerCase().trim();
  
  // ============ INTENT CLASSIFICATION ============
  
  // Research intents
  const researchPatterns = [
    /find.*prospects?/, /research.*/, /discover.*/, 
    /build.*list/, /get.*leads?/, /look.*for/, /search.*/,
    /icp|ideal customer|target.*audience/,
    /funding|hiring|signals?/, /monitor.*/
  ];
  
  // Campaign intents
  const campaignPatterns = [
    /create.*campaign/, /launch.*campaign/, /start.*outreach/,
    /build.*sequence/, /design.*campaign/, /campaign.*strategy/,
    /a\/b.*test|split.*test/, /experiment/, /variant/,
    /write.*email|draft.*message|subject.*line/, /copy|message|template/,
    /personalize|customize/, /enrich/
  ];
  
  // Analytics intents
  const analyticsPatterns = [
    /analyze.*performance/, /how.*performing/, /show.*metrics/,
    /report|dashboard|stats/, /forecast|predict|project/,
    /what.*working/, /insights?/, /benchmark/
  ];
  
  // Optimization intents
  const optimizationPatterns = [
    /optimize.*/, /improve.*/, /tune.*/, /tweak/,
    /better.*results/, /increase.*(rate|response)/,
    /fix.*campaign/, /troubleshoot/
  ];
  
  let category: IntentAnalysis['category'] = 'unknown';
  let confidence = 0.5;
  
  for (const pattern of researchPatterns) {
    if (pattern.test(normalizedInput)) {
      category = 'research';
      confidence = 0.8;
      break;
    }
  }
  
  for (const pattern of campaignPatterns) {
    if (pattern.test(normalizedInput)) {
      category = 'campaign';
      confidence = 0.8;
      break;
    }
  }
  
  for (const pattern of analyticsPatterns) {
    if (pattern.test(normalizedInput)) {
      category = 'analytics';
      confidence = 0.8;
      break;
    }
  }
  
  for (const pattern of optimizationPatterns) {
    if (pattern.test(normalizedInput)) {
      category = 'optimization';
      confidence = 0.8;
      break;
    }
  }
  
  // ============ ENTITY EXTRACTION ============
  
  const entities = extractEntities(normalizedInput);
  
  // ============ PARAMETER EXTRACTION ============
  
  const parameters = extractParameters(normalizedInput, entities);
  
  // ============ AMBIGUITY ANALYSIS ============
  
  const ambiguity = assessAmbiguity(normalizedInput, category, entities);
  
  // ============ CLARIFICATION CHECK ============
  
  let needsClarification = false;
  const clarifyingQuestions: string[] = [];
  
  if (normalizedInput.length < 10) {
    needsClarification = true;
    clarifyingQuestions.push('Can you provide more details about what you\'re looking for?');
  }
  
  if (category === 'unknown' && confidence < 0.6) {
    needsClarification = true;
    clarifyingQuestions.push('I\'m not sure what you\'re asking. Are you looking to research prospects, create a campaign, or analyze performance?');
  }
  
  if (ambiguity === 'high') {
    needsClarification = true;
    clarifyingQuestions.push('I see multiple things you might want. Can you be more specific?');
  }
  
  // ============ INTENT LABEL ============
  
  const intent = inferIntentLabel(normalizedInput, category, entities);
  
  return {
    intent,
    confidence,
    category,
    entities,
    parameters,
    ambiguity,
    needsClarification,
    clarifyingQuestions: clarifyingQuestions.length > 0 ? clarifyingQuestions : undefined,
  };
}

/**
 * Extract entities from input
 */
function extractEntities(input: string): IntentAnalysis['entities'] {
  const entities: IntentAnalysis['entities'] = [];
  
  // Industry extraction
  const industryPattern = /(?:in|at|for)\s+(?:the\s+)?([a-z\s]+)(?:\s+industry|\s+sector|\s+space)?/i;
  const industryMatch = input.match(industryPattern);
  if (industryMatch) {
    entities.push({
      type: 'industry',
      value: industryMatch[1].trim(),
      confidence: 0.9,
    });
  }
  
  // Location extraction
  const locationPattern = /(?:in|at|from)\s+([a-z\s,]+(?:\s+(?:area|region|city|state|country))?)/i;
  const locationMatch = input.match(locationPattern);
  if (locationMatch) {
    entities.push({
      type: 'location',
      value: locationMatch[1].trim(),
      confidence: 0.8,
    });
  }
  
  // Company size extraction
  const sizePattern = /(\d+(?:\+|-|\s*-\s*\d+)?)\s*(?:employees?|people|headcount|size)/i;
  const sizeMatch = input.match(sizePattern);
  if (sizeMatch) {
    entities.push({
      type: 'company_size',
      value: sizeMatch[1],
      confidence: 0.85,
    });
  }
  
  // Funding stage extraction
  const fundingPattern = /(series\s*[a-f]|seed|pre-seed|angel|bootstrap(?:ped)?)/i;
  const fundingMatch = input.match(fundingPattern);
  if (fundingMatch) {
    entities.push({
      type: 'funding_stage',
      value: fundingMatch[1],
      confidence: 0.9,
    });
  }
  
  // Job title extraction
  const titlePattern = /(?:cmo|ceo|cto|cfo|vp\s+of|head\s+of|director\s+of|founder|co-founder)/i;
  const titleMatch = input.match(titlePattern);
  if (titleMatch) {
    entities.push({
      type: 'job_title',
      value: titleMatch[0],
      confidence: 0.9,
    });
  }
  
  // Time frame extraction
  const timePattern = /(\d+)\s*(day|week|month|quarter|year)s?/i;
  const timeMatch = input.match(timePattern);
  if (timeMatch) {
    entities.push({
      type: 'timeframe',
      value: `${timeMatch[1]} ${timeMatch[2]}`,
      confidence: 0.85,
    });
  }
  
  // Number extraction (for counts)
  const numberPattern = /(\d+(?:,\d+)?)\s*(?:prospects?|leads?|companies?|contacts?|results?)/i;
  const numberMatch = input.match(numberPattern);
  if (numberMatch) {
    entities.push({
      type: 'count',
      value: numberMatch[1].replace(',', ''),
      confidence: 0.9,
    });
  }
  
  return entities;
}

/**
 * Extract parameters from input and entities
 */
function extractParameters(
  input: string,
  entities: IntentAnalysis['entities']
): Record<string, any> {
  const parameters: Record<string, any> = {};
  
  // Extract from entities
  entities.forEach(entity => {
    switch (entity.type) {
      case 'industry':
        parameters.industry = entity.value;
        break;
      case 'location':
        parameters.location = entity.value;
        break;
      case 'company_size':
        parameters.companySize = entity.value;
        break;
      case 'funding_stage':
        parameters.fundingStage = entity.value.toLowerCase();
        break;
      case 'job_title':
        parameters.title = entity.value.toLowerCase();
        break;
      case 'timeframe':
        parameters.timeframe = entity.value;
        break;
      case 'count':
        parameters.maxResults = parseInt(entity.value, 10);
        break;
    }
  });
  
  // Extract explicit flags
  if (input.includes('a/b test') || input.includes('ab test') || input.includes('split test')) {
    parameters.abTest = true;
  }
  
  if (input.includes('enrich')) {
    parameters.enrichmentRequired = true;
  }
  
  if (input.includes('personalize')) {
    parameters.personalizationRequired = true;
  }
  
  // Extract campaign goal
  if (input.includes('meeting') || input.includes('demo') || input.includes('booking')) {
    parameters.goal = 'meeting';
  } else if (input.includes('reply') || input.includes('response')) {
    parameters.goal = 'reply';
  }
  
  return parameters;
}

/**
 * Assess ambiguity level
 */
function assessAmbiguity(
  input: string,
  category: string,
  entities: IntentAnalysis['entities']
): 'low' | 'medium' | 'high' {
  // High ambiguity: very short input
  if (input.length < 15) return 'high';
  
  // High ambiguity: unknown category with no entities
  if (category === 'unknown' && entities.length === 0) return 'high';
  
  // Medium ambiguity: some entities but unclear action
  if (entities.length > 0 && category === 'unknown') return 'medium';
  
  // Medium ambiguity: multiple clear intents
  const hasResearch = /find|search|research|discover/.test(input);
  const hasCampaign = /create|launch|build|campaign/.test(input);
  const hasAnalytics = /analyze|report|metric/.test(input);
  
  const intentCount = [hasResearch, hasCampaign, hasAnalytics].filter(Boolean).length;
  if (intentCount > 1) return 'medium';
  
  return 'low';
}

/**
 * Infer intent label
 */
function inferIntentLabel(
  input: string,
  category: string,
  entities: IntentAnalysis['entities']
): string {
  if (category === 'research') {
    const hasIcp = input.includes('icp') || input.includes('customer profile') || input.includes('target audience');
    if (hasIcp) return 'define_icp';
    
    const hasSignals = input.includes('signal') || input.includes('hiring') || input.includes('funding');
    if (hasSignals) return 'monitor_signals';
    
    return 'find_prospects';
  }
  
  if (category === 'campaign') {
    const hasSequence = input.includes('sequence') || input.includes('steps') || input.includes('touches');
    if (hasSequence) return 'build_sequence';
    
    const hasTest = input.includes('a/b') || input.includes('test') || input.includes('experiment');
    if (hasTest) return 'design_ab_test';
    
    const hasCopy = input.includes('write') || input.includes('copy') || input.includes('draft') || input.includes('subject');
    if (hasCopy) return 'write_copy';
    
    return 'create_campaign';
  }
  
  if (category === 'analytics') {
    const hasForecast = input.includes('forecast') || input.includes('predict') || input.includes('project');
    if (hasForecast) return 'forecast_pipeline';
    
    return 'analyze_performance';
  }
  
  if (category === 'optimization') {
    return 'optimize_campaign';
  }
  
  return 'unknown';
}

/**
 * Make delegation decision based on intent analysis
 */
export async function makeDelegationDecision(
  intent: IntentAnalysis,
  context: DelegationContext
): Promise<DelegationDecision> {
  // Find matching skills
  const matchingSkills = skillRegistry.findMatchingSkills(intent.intent);
  
  // If no matches, return clarify
  if (matchingSkills.length === 0) {
    return {
      action: 'clarify',
      skills: [],
      strategy: 'single',
      estimatedCost: 0,
      estimatedDuration: '0s',
      explanation: 'I\'m not sure how to help with that. Could you rephrase?',
    };
  }
  
  // Filter skills by category
  const categorySkills = matchingSkills.filter(
    m => {
      const skill = m.skill;
      switch (intent.category) {
        case 'research': return skill.agentId.includes('researcher') || skill.agentId.includes('architect') || skill.agentId.includes('scout');
        case 'campaign': return skill.agentId.includes('strategist') || skill.agentId.includes('architect') || skill.agentId.includes('copy');
        case 'analytics': return skill.agentId.includes('analyst') || skill.agentId.includes('model');
        case 'optimization': return skill.agentId.includes('optimization') || skill.agentId.includes('test');
        default: return true;
      }
    }
  );
  
  // Take top matches
  const topSkills = categorySkills.slice(0, 3);
  
  // Determine strategy
  let strategy: DelegationDecision['strategy'] = 'single';
  if (topSkills.length > 1) {
    const canParallel = topSkills.every(s => s.skill.constraints.parallelizable);
    strategy = canParallel ? 'parallel' : 'sequential';
  }
  
  // Calculate cost
  let estimatedCost = 0;
  topSkills.forEach(match => {
    const cost = match.skill.cost.perCall;
    const unitCost = match.skill.cost.perUnit || 0;
    const unitCount = intent.parameters.maxResults || 1;
    estimatedCost += cost + (unitCost * unitCount);
  });
  
  // Check approval thresholds
  let action: DelegationDecision['action'] = 'execute';
  const needsApproval = topSkills.some(match => 
    estimatedCost > match.skill.cost.approvalThreshold
  );
  
  if (needsApproval && estimatedCost > 1.00) {
    action = 'propose';
  }
  
  if (intent.needsClarification) {
    action = 'clarify';
  }
  
  // Calculate duration
  const maxTimeout = Math.max(...topSkills.map(s => s.skill.constraints.timeoutMs));
  const estimatedDuration = `${Math.ceil(maxTimeout / 1000)}s`;
  
  // Build explanation
  const skillNames = topSkills.map(s => s.skill.name).join(', ');
  let explanation = '';
  
  if (action === 'execute') {
    explanation = `I'll ${strategy === 'parallel' ? 'run these in parallel' : 'do this step by step'}: ${skillNames}.`;
  } else if (action === 'propose') {
    explanation = `I'm ready to ${skillNames.toLowerCase()}. This will cost approximately $${estimatedCost.toFixed(2)}. Should I proceed?`;
  } else {
    explanation = intent.clarifyingQuestions?.[0] || 'Could you clarify what you need?';
  }
  
  // Build warnings
  const warnings: string[] = [];
  if (estimatedCost > 0.50) {
    warnings.push(`This operation will cost approximately $${estimatedCost.toFixed(2)}.`);
  }
  if (intent.parameters.maxResults && intent.parameters.maxResults > 100) {
    warnings.push('Large prospect list may take several minutes.');
  }
  
  return {
    action,
    skills: topSkills.map(match => ({
      skill: match.skill,
      confidence: match.confidence,
      parameters: intent.parameters,
      priority: 1,
    })),
    strategy,
    estimatedCost,
    estimatedDuration,
    explanation,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Main delegation function
 */
export async function delegate(
  input: string,
  context: DelegationContext
): Promise<DelegationDecision> {
  // Step 1: Analyze intent
  const intent = await analyzeIntent(input, context);
  
  // Step 2: Make delegation decision
  const decision = await makeDelegationDecision(intent, context);
  
  return decision;
}

// Export types
export type { SkillDefinition } from './skill-registry';
