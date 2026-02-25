/**
 * Skill Registry
 *
 * Singleton registry that holds all registered skill definitions.
 * Skills self-register on import.
 */

import type { SkillDefinition } from './types';

class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  listAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Find the best matching skill for a given text input.
   * Returns the skill and a confidence score (0-1).
   */
  findByPattern(input: string): { skill: SkillDefinition; confidence: number } | null {
    const normalised = input.toLowerCase().trim();
    let bestMatch: { skill: SkillDefinition; confidence: number } | null = null;

    for (const skill of this.skills.values()) {
      let matchScore = 0;

      for (const pattern of skill.triggerPatterns) {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(normalised)) {
          matchScore += 1;
        }
      }

      if (matchScore > 0) {
        const confidence = Math.min(matchScore / Math.max(skill.triggerPatterns.length, 1), 1);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { skill, confidence };
        }
      }
    }

    return bestMatch;
  }
}

export const skillRegistry = new SkillRegistry();
