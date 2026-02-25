/**
 * Skill: intelligence.recommendations
 *
 * Returns prioritized recommendations from the recommendation engine.
 */

import { skillRegistry } from '../registry';
import type { SkillInput, SkillOutput, InsightBlock } from '../types';

async function handler(_input: SkillInput): Promise<SkillOutput> {
  // Mock recommendations (in production, calls generateRecommendations())
  const insights: InsightBlock[] = [
    {
      type: 'insight',
      title: 'Reply rate declining on Sequence #3',
      description: 'Reply rate dropped 4.2% this week. Consider pausing and A/B testing new subject lines before continuing.',
      severity: 'warning',
      confidence: 0.82,
    },
    {
      type: 'insight',
      title: 'High-value prospects not contacted',
      description: '12 A+ scored prospects from last week\'s research have not been added to any sequence. Add them to maximize pipeline.',
      severity: 'critical',
      confidence: 0.91,
    },
    {
      type: 'insight',
      title: 'Meeting conversion rate improving',
      description: 'Meetings-to-opportunity conversion is up 15% this month. The new discovery call script appears to be working.',
      severity: 'success',
      confidence: 0.75,
    },
    {
      type: 'insight',
      title: 'Fintech vertical outperforming',
      description: 'Fintech prospects have 2.3x higher reply rates than average. Consider increasing allocation to this vertical.',
      severity: 'info',
      confidence: 0.68,
    },
  ];

  return {
    skillId: 'intelligence.recommendations',
    status: 'success',
    blocks: insights,
    followUps: [
      { label: 'View sequence #3', command: 'show sequence 3 details' },
      { label: 'Uncontacted prospects', command: 'find uncontacted A+ prospects' },
      { label: 'Pipeline summary', command: 'show pipeline health' },
    ],
    executionMs: 0,
    dataFreshness: 'mock',
  };
}

skillRegistry.register({
  id: 'intelligence.recommendations',
  name: 'Recommendations',
  description: 'Shows prioritized, actionable recommendations based on current GTM health.',
  domain: 'intelligence',
  inputSchema: {},
  responseType: ['insight'],
  triggerPatterns: [
    '\\b(recommend|suggestion|advice|what should|priorities)\\b',
    '\\b(intelligence|insights|opportunities)\\b',
  ],
  estimatedMs: 300,
  examples: [
    'what should I focus on?',
    'show recommendations',
    'any suggestions?',
    'top priorities',
  ],
  handler,
});
