/**
 * Command Parser Tests
 */

import { CommandParser, parseCommand, getCommandSuggestions } from '../command-parser';

describe('CommandParser', () => {
  describe('parse', () => {
    test('parses research command with count, title, and industry', () => {
      const result = CommandParser.parse('research 50 VP Sales in fintech');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('research_prospects');
      expect(result.parsed?.entities.count).toBe(50);
      expect(result.parsed?.entities.title).toContain('vp sales');
      expect(result.parsed?.entities.industry).toBe('fintech');
      expect(result.parsed?.confidence).toBeGreaterThan(0.8);
    });

    test('parses research command without count', () => {
      const result = CommandParser.parse('research Head of Marketing in SaaS');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('research_prospects');
      expect(result.parsed?.entities.title?.toLowerCase()).toContain('head of marketing');
      expect(result.parsed?.entities.industry).toBe('saas');
    });

    test('parses find command variant', () => {
      const result = CommandParser.parse('find 100 VP Sales in healthcare');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('research_prospects');
      expect(result.parsed?.entities.count).toBe(100);
    });

    test('parses enrich person command', () => {
      const result = CommandParser.parse('enrich john@example.com');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('enrich_person');
      expect(result.parsed?.entities.email).toBe('john@example.com');
    });

    test('parses enrich company command', () => {
      const result = CommandParser.parse('enrich company stripe.com');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('enrich_company');
      expect(result.parsed?.entities.domain).toBe('stripe.com');
    });

    test('parses create campaign command', () => {
      const result = CommandParser.parse('create campaign for Q1 outreach');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('create_campaign');
      expect(result.parsed?.entities.campaign_name).toBe('Q1 outreach');
    });

    test('parses help command', () => {
      const result = CommandParser.parse('help');
      
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('help');
    });

    test('parses help command variants', () => {
      const variants = ['help', 'help me', 'help?', 'commands', '?'];
      
      variants.forEach((cmd) => {
        const result = CommandParser.parse(cmd);
        expect(result.success).toBe(true);
        expect(result.parsed?.type).toBe('help');
      });
    });

    test('handles empty command', () => {
      const result = CommandParser.parse('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty');
    });

    test('handles whitespace-only command', () => {
      const result = CommandParser.parse('   ');
      
      expect(result.success).toBe(false);
    });

    test('returns unknown type for unrecognizable commands', () => {
      const result = CommandParser.parse('xyz abc 123');
      
      // Should still succeed but with low confidence and unknown type
      expect(result.success).toBe(true);
      expect(result.parsed?.type).toBe('unknown');
      expect(result.parsed?.confidence).toBeLessThan(0.6);
    });
  });

  describe('getSuggestions', () => {
    test('returns research suggestions for partial research command', () => {
      const suggestions = CommandParser.getSuggestions('re');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('research'))).toBe(true);
    });

    test('returns enrichment suggestions for enrich partial', () => {
      const suggestions = CommandParser.getSuggestions('en');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('enrich'))).toBe(true);
    });

    test('returns empty array for no match', () => {
      const suggestions = CommandParser.getSuggestions('xyz123unknown');
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('validate', () => {
    test('validates research command requires industry or title', () => {
      const parsed = {
        type: 'research_prospects' as const,
        entities: { count: 50 },
        confidence: 0.9,
        tokens: ['research', '50'],
        intent: 'research_prospects',
      };
      
      const validation = CommandParser.validate(parsed);
      
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('industry or job title');
    });

    test('validates enrich_person requires email', () => {
      const parsed = {
        type: 'enrich_person' as const,
        entities: {},
        confidence: 0.9,
        tokens: ['enrich'],
        intent: 'enrich_person',
      };
      
      const validation = CommandParser.validate(parsed);
      
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('email address');
    });

    test('validates enrich_company requires domain', () => {
      const parsed = {
        type: 'enrich_company' as const,
        entities: {},
        confidence: 0.9,
        tokens: ['enrich', 'company'],
        intent: 'enrich_company',
      };
      
      const validation = CommandParser.validate(parsed);
      
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('domain');
    });

    test('validates create_campaign requires name', () => {
      const parsed = {
        type: 'create_campaign' as const,
        entities: {},
        confidence: 0.9,
        tokens: ['create', 'campaign'],
        intent: 'create_campaign',
      };
      
      const validation = CommandParser.validate(parsed);
      
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('campaign name');
    });

    test('validates help command has no required fields', () => {
      const parsed = {
        type: 'help' as const,
        entities: {},
        confidence: 0.95,
        tokens: ['help'],
        intent: 'help',
      };
      
      const validation = CommandParser.validate(parsed);
      
      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });
  });

  describe('format', () => {
    test('formats research command correctly', () => {
      const parsed = {
        type: 'research_prospects' as const,
        entities: { count: 50, title: 'VP Sales', industry: 'fintech' },
        confidence: 0.9,
        tokens: ['research', '50', 'vp', 'sales', 'in', 'fintech'],
        intent: 'research_prospects',
      };
      
      const formatted = CommandParser.format(parsed);
      
      expect(formatted).toContain('Research');
      expect(formatted).toContain('50');
      expect(formatted).toContain('fintech');
    });

    test('formats enrich command correctly', () => {
      const parsed = {
        type: 'enrich_person' as const,
        entities: { email: 'test@example.com' },
        confidence: 0.95,
        tokens: ['enrich', 'test@example.com'],
        intent: 'enrich_person',
      };
      
      const formatted = CommandParser.format(parsed);
      
      expect(formatted).toContain('test@example.com');
    });
  });
});