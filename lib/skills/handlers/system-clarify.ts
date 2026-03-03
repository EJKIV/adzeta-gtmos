/**
 * Skill: system.clarify_intent
 * 
 * Asks clarifying questions when task information is incomplete.
 * Uses ACTION BUTTONS - NOT FORMS.
 * Keeps probing until confident.
 * 
 * NEW: Part of normal execution flow, does NOT pause workflow.
 * Returns questions inline as part of response.
 */

import { skillRegistry } from '../registry';
import { generateClarificationQuestions, applyAnswers } from '@/lib/clarification/engine';
import type { SkillInput, SkillOutput, InsightBlock, ActionBlock } from '../types';

async function handler(input: SkillInput): Promise<SkillOutput> {
  const { 
    intent = {}, 
    answers, 
    depth = 0,
    commandId,
  } = input.params as {
    intent: Record<string, unknown>;
    answers?: Record<string, unknown>;
    depth?: number;
    commandId?: string;
  };

  // Apply any answers from user
  let currentIntent = { ...intent };
  if (answers && Object.keys(answers).length > 0) {
    currentIntent = applyAnswers(currentIntent, answers);
  }

  // Generate next clarification step
  const clarification = await generateClarificationQuestions({
    intent: currentIntent,
    depth,
    mode: 'follow_up',
    userId: input.context?.userId,
    supabase: input.context?.supabase,
  });

  // Build blocks for response
  const blocks: (InsightBlock | ActionBlock)[] = [
    {
      type: 'insight',
      title: clarification.ready ? 'Ready to proceed' : 'Need a bit more info',
      description: clarification.message,
      severity: clarification.ready ? 'success' : 'info',
    },
  ];

  // Add action buttons (NOT forms)
  if (clarification.actions.length > 0) {
    blocks.push({
      type: 'action',
      label: clarification.ready ? 'Confirm' : 'Options',
      actions: clarification.actions.map(action => ({
        ...action,
        // Include intent state in action so frontend can pass it back
        payload: {
          ...action.provides,
          intent: currentIntent,
          depth: depth + 1,
          commandId,
        },
      })),
    });
  }

  return {
    skillId: 'system.clarify_intent',
    status: clarification.ready ? 'success' : 'needs_more_info',
    // Returns questions inline - does NOT pause workflow
    blocks,
    // Pass intent forward for next skill
    result: {
      intent: currentIntent,
      confidence: clarification.confidence,
      ready: clarification.ready,
      depth: depth + 1,
      next: clarification.nextStep,
    },
    // Continue to next skill or ask more
    followUps: clarification.ready
      ? [{ label: 'Proceed', command: clarification.nextStep?.action || 'create campaign' }]
      : [],
  };
}

skillRegistry.register({
  id: 'system.clarify_intent',
  name: 'Clarify Intent',
  description: 'Asks clarifying questions using action buttons (not forms). Keeps probing dynamically until confident.',
  domain: 'system',
  inputSchema: {
    intent: { type: 'object', description: 'Current partial intent' },
    answers: { type: 'object', optional: true, description: 'User answers from previous questions' },
    depth: { type: 'number', default: 0, description: 'How many rounds of clarification so far' },
    commandId: { type: 'string', optional: true },
  },
  responseType: ['insight', 'action'],
  triggerPatterns: [
    '\b(start|create|launch|setup|make)\s+(?:a\s+)?(sequence|campaign|outreach)\b',
  ],
  requiredContext: ['current_page', 'user'],
  estimatedMs: 200,
  handler,
});
