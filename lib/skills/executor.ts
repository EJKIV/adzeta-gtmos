/**
 * Skill Executor
 *
 * Executes skills by looking up handlers in the registry.
 * Supports both structured (skillId+params) and text-based (NLP) invocation.
 */

import { skillRegistry } from './registry';
import type { SkillInput, SkillOutput, SkillContext } from './types';
import { parseCommand, matchSkill } from '@/lib/nlp/command-parser';

// Ensure all skill handlers are imported so they self-register
import './register-all';

// ---------------------------------------------------------------------------
// Skill Match (pre-execution metadata)
// ---------------------------------------------------------------------------

export interface SkillMatch {
  skillId: string;
  skillName: string;
  params: Record<string, unknown>;
  context: SkillContext;
}

/**
 * Match a skill from free-form text without executing it.
 * Returns metadata about the matched skill, or null if no match.
 */
export function matchFromText(text: string, context: SkillContext): SkillMatch | null {
  const intent = parseCommand(text);
  const matched = matchSkill(intent);
  const rc = context.resultContext;

  if (matched) {
    const skill = skillRegistry.get(matched.skillId);
    return {
      skillId: matched.skillId,
      skillName: skill?.name ?? matched.skillId,
      params: {
        ...matched.params, query: text, intent,
        ...(rc?.prospectIds && { prospectIds: rc.prospectIds }),
        ...(rc?.entityId && { entityId: rc.entityId }),
      },
      context,
    };
  }

  // Try pattern matching directly from registry
  const patternMatch = skillRegistry.findByPattern(text);
  if (patternMatch) {
    return {
      skillId: patternMatch.skill.id,
      skillName: patternMatch.skill.name,
      params: {
        query: text, intent,
        ...(rc?.prospectIds && { prospectIds: rc.prospectIds }),
        ...(rc?.entityId && { entityId: rc.entityId }),
      },
      context,
    };
  }

  return null;
}

/**
 * Execute a skill by structured input (skillId + params).
 */
export async function executeSkill(input: SkillInput): Promise<SkillOutput> {
  const start = performance.now();
  const skill = skillRegistry.get(input.skillId);

  if (!skill) {
    return {
      skillId: input.skillId,
      status: 'error',
      blocks: [{ type: 'error', message: `Unknown skill: ${input.skillId}`, suggestion: 'Type "help" to see available commands.' }],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: Math.round(performance.now() - start),
      dataFreshness: 'mock',
    };
  }

  try {
    const output = await skill.handler(input);
    output.executionMs = Math.round(performance.now() - start);
    return output;
  } catch (err) {
    return {
      skillId: input.skillId,
      status: 'error',
      blocks: [{ type: 'error', message: err instanceof Error ? err.message : 'Execution failed', suggestion: 'Try again or type "help".' }],
      followUps: [{ label: 'Show help', command: 'help' }],
      executionMs: Math.round(performance.now() - start),
      dataFreshness: 'mock',
    };
  }
}

/**
 * Execute a skill from free-form text.
 * Parses NLP → matches skill → executes.
 */
export async function executeFromText(
  text: string,
  context: SkillContext
): Promise<SkillOutput> {
  const intent = parseCommand(text);
  const matched = matchSkill(intent);

  const rc = context.resultContext;

  if (!matched) {
    // Try pattern matching directly from registry
    const patternMatch = skillRegistry.findByPattern(text);
    if (patternMatch) {
      return executeSkill({
        skillId: patternMatch.skill.id,
        params: {
          query: text, intent,
          ...(rc?.prospectIds && { prospectIds: rc.prospectIds }),
          ...(rc?.entityId && { entityId: rc.entityId }),
        },
        context,
      });
    }

    // No match — return help suggestion
    return {
      skillId: 'unknown',
      status: 'error',
      blocks: [{ type: 'error', message: `I didn't understand "${text}".`, suggestion: 'Try "help" to see what I can do.' }],
      followUps: [
        { label: 'Show help', command: 'help' },
        { label: 'Pipeline summary', command: 'show pipeline health' },
      ],
      executionMs: 0,
      dataFreshness: 'mock',
    };
  }

  return executeSkill({
    skillId: matched.skillId,
    params: {
      ...matched.params, query: text, intent,
      ...(rc?.prospectIds && { prospectIds: rc.prospectIds }),
      ...(rc?.entityId && { entityId: rc.entityId }),
    },
    context,
  });
}
