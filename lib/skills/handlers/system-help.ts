/**
 * Skill: system.help
 *
 * Lists all registered skills with descriptions and example commands.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, TableBlock, InsightBlock } from '../types';

async function handler(_input: SkillInput): Promise<SkillOutput> {
  const skills = skillRegistry.listAll();

  const intro: InsightBlock = {
    type: 'insight',
    title: 'GTM Command Center',
    description: `${skills.length} skills available. Type a command in natural language — I'll match it to the right skill automatically.`,
    severity: 'info',
  };

  const table: TableBlock = {
    type: 'table',
    title: 'Available Skills',
    columns: [
      { key: 'name', label: 'Skill', format: 'text' },
      { key: 'domain', label: 'Domain', format: 'badge' },
      { key: 'description', label: 'Description', format: 'text' },
      { key: 'example', label: 'Try', format: 'text' },
    ],
    rows: skills.map((s) => ({
      name: s.name,
      domain: s.domain,
      description: s.description,
      example: s.examples[0] || '',
    })),
  };

  return {
    skillId: 'system.help',
    status: 'success',
    blocks: [intro, table],
    followUps: [
      { label: 'Pipeline health', command: 'show pipeline health' },
      { label: 'Find prospects', command: 'find CMOs at fintech' },
      { label: 'Recommendations', command: 'what should I focus on?' },
    ],
    executionMs: 0,
    dataFreshness: 'live',
  };
}

skillRegistry.register({
  id: 'system.help',
  name: 'Help',
  description: 'Lists all available skills and example commands.',
  domain: 'system',
  inputSchema: {},
  responseType: ['insight', 'table'],
  triggerPatterns: [
    '\\b(help|what can|how do|commands|skills)\\b',
  ],
  estimatedMs: 50,
  examples: [
    'help',
    'what can you do?',
    'show commands',
    'list skills',
  ],
  handler,
});
