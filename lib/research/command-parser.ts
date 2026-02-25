/**
 * Natural Language Command Parser
 * 
 * Parses user text input and routes to appropriate handlers
 * Extracts entities like industry, count, criteria
 */

import { CommandType, CommandStatus } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedCommand {
  type: CommandType;
  confidence: number;
  entities: {
    action?: string;
    count?: number;
    title?: string;
    titles?: string[];
    industry?: string;
    industries?: string[];
    company_size?: string;
    location?: string;
    domain?: string;
    email?: string;
    account_name?: string;
    sequence_name?: string;
    campaign_name?: string;
    [key: string]: unknown;
  };
  tokens: string[];
  intent: string;
}

export interface ParseResult {
  success: boolean;
  parsed?: ParsedCommand;
  error?: string;
}

// ============================================================================
// Command Patterns
// ============================================================================

interface CommandPattern {
  type: CommandType;
  patterns: RegExp[];
  confidence: number;
  extractor: (matches: RegExpMatchArray | null, tokens: string[]) => ParsedCommand['entities'];
}

// Industry keywords
const INDUSTRIES = [
  'fintech', 'saas', 'software', 'healthcare', 'health tech', 'ai',
  'machine learning', 'ecommerce', 'e-commerce', 'retail', 'manufacturing',
  'logistics', 'transportation', 'real estate', 'media', 'entertainment',
  'education', 'edtech', 'cybersecurity', 'crypto', 'web3', 'gaming',
  'mobile', 'enterprise', 'b2b', 'b2c', 'consumer', 'insurtech'
];

// Title patterns
const TITLES = [
  'vp sales', 'vp marketing', 'head of sales', 'head of marketing',
  'head of revenue', 'cro', 'chief revenue officer', 'cmo',
  'chief marketing officer', 'director of sales', 'director of marketing',
  'sales manager', 'marketing manager', 'revops', 'revenue operations',
  'sales operations', 'marketing operations', 'demand generation',
  'growth', 'business development', 'sdr', 'bdr', 'account executive',
  'ae', 'founder', 'ceo', 'cto', 'cto', 'co-founder'
];

// Company size patterns
const COMPANY_SIZES = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+',
  'startup', 'small business', 'mid market', 'enterprise'
];

// Command patterns for matching
const commandPatterns: CommandPattern[] = [
  // Research commands
  {
    type: 'research_prospects',
    patterns: [
      /^(?:research|find|get|search for?)\s+(?:for\s+)?(\d+)?\s*(.*?)\s+in\s+(.+)$/i,
      /^(?:research|find|get|search)\s+(\d+)?\s*(vp|head of|director|manager|sales|marketing|revenue|cro|cmo).*?(?:in|at)\s+(.+)$/i,
      /^(?:find me|get me|show me)\s+(\d+)?\s*(?:people|contacts|prospects).*?in\s+(.+)$/i,
    ],
    confidence: 0.9,
    extractor: (matches, tokens) => {
      const entities: ParsedCommand['entities'] = {};
      
      if (matches) {
        const countMatch = matches[1];
        if (countMatch) {
          entities.count = parseInt(countMatch, 10);
        }
        
        // Extract title(s)
        const titleText = matches[2];
        if (titleText) {
          const foundTitles = TITLES.filter(t => 
            titleText.toLowerCase().includes(t)
          );
          if (foundTitles.length > 0) {
            entities.titles = foundTitles;
            entities.title = foundTitles[0];
          } else {
            entities.title = titleText.trim();
          }
        }
        
        // Extract industry
        const industryText = matches[3];
        if (industryText) {
          const foundIndustry = INDUSTRIES.find(i => 
            industryText.toLowerCase().includes(i)
          );
          entities.industry = foundIndustry || industryText.trim();
        }
      }
      
      // Additional extraction from tokens
      const sizeMatch = tokens.find(t => 
        COMPANY_SIZES.some(s => t.includes(s))
      );
      if (sizeMatch) {
        entities.company_size = sizeMatch;
      }
      
      return entities;
    },
  },
  
  // Enrich person
  {
    type: 'enrich_person',
    patterns: [
      /^(?:enrich|lookup|get info on?)\s+(?:person\s+)?(.+@.+\..+)$/i,
      /^(?:enrich|lookup)\s+email\s+(.+)$/i,
    ],
    confidence: 0.95,
    extractor: (matches) => {
      return {
        email: matches?.[1]?.trim(),
        action: 'enrich_person',
      };
    },
  },
  
  // Enrich company
  {
    type: 'enrich_company',
    patterns: [
      /^(?:enrich|lookup|get info on?)\s+(?:company\s+)?(.+\..+)$/i,
      /^(?:enrich|lookup)\s+(?:domain|company)\s+(.+)$/i,
    ],
    confidence: 0.85,
    extractor: (matches) => {
      return {
        domain: matches?.[1]?.trim(),
        action: 'enrich_company',
      };
    },
  },
  
  // Create campaign
  {
    type: 'create_campaign',
    patterns: [
      /^(?:create|start|new|launch)\s+(?:a\s+)?(?:campaign|sequence|outreach)\s+(?:for\s+)?(.+)$/i,
      /^(?:create|start|new)\s+(?:outreach|campaign)\s+(?:to\s+)?(.+)$/i,
    ],
    confidence: 0.8,
    extractor: (matches) => {
      return {
        campaign_name: matches?.[1]?.trim(),
        action: 'create_campaign',
      };
    },
  },
  
  // Help
  {
    type: 'help',
    patterns: [
      /^help$/i,
      /^help\s+me$/i,
      /^(?:what|how)\s+can\s+i\s+(?:do|use)$/i,
      /^commands$/i,
      /^\?$/,
    ],
    confidence: 0.95,
    extractor: () => ({
      action: 'help',
    }),
  },
];

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Tokenize command text
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s@.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Extract entities using pattern matching
 */
function extractEntities(tokens: string[]): ParsedCommand['entities'] {
  const entities: ParsedCommand['entities'] = {};
  
  // Look for numbers (counts)
  const numbers = tokens
    .map(t => parseInt(t, 10))
    .filter(n => !isNaN(n) && n > 0 && n < 10000);
  if (numbers.length > 0) {
    entities.count = numbers[0];
  }
  
  // Look for titles
  const foundTitles = TITLES.filter(title => {
    const titleTokens = title.toLowerCase().split(/\s+/);
    return titleTokens.every(tt => tokens.includes(tt));
  });
  if (foundTitles.length > 0) {
    entities.titles = foundTitles;
    entities.title = foundTitles[0];
  }
  
  // Look for industries
  const foundIndustries = INDUSTRIES.filter(ind => {
    const indTokens = ind.toLowerCase().split(/[-\s]+/);
    return indTokens.every(it => tokens.includes(it) || 
      tokens.some(t => t.includes(it))
    );
  });
  if (foundIndustries.length > 0) {
    entities.industries = foundIndustries;
    entities.industry = foundIndustries[0];
  }
  
  // Look for emails
  const emailToken = tokens.find(t => t.includes('@') && t.includes('.'));
  if (emailToken) {
    entities.email = emailToken;
  }
  
  // Look for domains
  const domainToken = tokens.find(t => {
    return t.includes('.') && !t.includes('@') && 
           !t.match(/^\d/) && t.length > 3;
  });
  if (domainToken) {
    entities.domain = domainToken.includes('http') ? 
      new URL(domainToken).hostname : domainToken;
  }
  
  // Look for company sizes
  const sizeMatch = tokens.find(t => 
    COMPANY_SIZES.some(s => t.includes(s.toLowerCase()))
  );
  if (sizeMatch) {
    entities.company_size = sizeMatch;
  }
  
  return entities;
}

/**
 * Parse a natural language command
 */
export function parseCommand(command: string): ParseResult {
  const trimmedCommand = command.trim();
  
  if (!trimmedCommand) {
    return {
      success: false,
      error: 'Empty command',
    };
  }
  
  const normalized = trimmedCommand.toLowerCase().trim();
  const tokens = tokenize(trimmedCommand);
  
  // Try pattern matching first
  for (const pattern of commandPatterns) {
    for (const regex of pattern.patterns) {
      const match = normalized.match(regex);
      if (match) {
        const extractedEntities = pattern.extractor(match, tokens);
        const genericEntities = extractEntities(tokens);
        
        return {
          success: true,
          parsed: {
            type: pattern.type,
            confidence: pattern.confidence,
            entities: { ...genericEntities, ...extractedEntities },
            tokens,
            intent: pattern.type,
          },
        };
      }
    }
  }
  
  // Fallback: token-based extraction with unknown type
  const entities = extractEntities(tokens);
  const hasEntities = Object.keys(entities).length > 0;
  
  if (hasEntities) {
    return {
      success: true,
      parsed: {
        type: 'unknown',
        confidence: 0.5,
        entities,
        tokens,
        intent: 'unknown',
      },
    };
  }
  
  return {
    success: false,
    error: 'Unable to parse command. Try: "research 50 VP Sales in fintech" or "help"',
  };
}

/**
 * Get suggestions for incomplete commands
 */
export function getCommandSuggestions(partial: string): string[] {
  const suggestions: string[] = [];
  const normalized = partial.toLowerCase().trim();
  
  if (normalized.startsWith('re') || normalized.includes('research') || normalized.includes('find')) {
    suggestions.push(
      'research 50 VP Sales in fintech',
      'find 100 Head of Revenue in SaaS',
      'research marketing managers in healthcare',
    );
  }
  
  if (normalized.startsWith('en')) {
    suggestions.push(
      'enrich john@example.com',
      'enrich company example.com',
      'enrich domain example.com',
    );
  }
  
  if (normalized.startsWith('c') || normalized.includes('create') || normalized.includes('campaign')) {
    suggestions.push(
      'create campaign for Q1 outreach',
      'start new sequence for fintech prospects',
    );
  }
  
  if (normalized.includes('help') || normalized === '?') {
    suggestions.push('help');
  }
  
  return suggestions;
}

/**
 * Format command for display
 */
export function formatCommandForDisplay(command: ParsedCommand): string {
  const parts: string[] = [];
  
  switch (command.type) {
    case 'research_prospects':
      parts.push('Research');
      if (command.entities.count) {
        parts.push(`${command.entities.count}`);
      }
      if (command.entities.title) {
        parts.push(command.entities.title);
      }
      if (command.entities.industry) {
        parts.push(`in ${command.entities.industry}`);
      }
      break;
      
    case 'enrich_person':
      parts.push(`Enrich person: ${command.entities.email}`);
      break;
      
    case 'enrich_company':
      parts.push(`Enrich company: ${command.entities.domain}`);
      break;
      
    case 'create_campaign':
      parts.push(`Create campaign: ${command.entities.campaign_name}`);
      break;
      
    case 'help':
      parts.push('Help');
      break;
      
    default:
      parts.push(`Unknown command (${command.intent})`);
  }
  
  return parts.join(' ');
}

/**
 * Validate parsed command has required fields
 */
export function validateCommand(parsed: ParsedCommand): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  switch (parsed.type) {
    case 'research_prospects':
      // At least need an industry or some criteria
      if (!parsed.entities.industry && !parsed.entities.title) {
        missing.push('industry or job title');
      }
      break;
      
    case 'enrich_person':
      if (!parsed.entities.email) {
        missing.push('email address');
      }
      break;
      
    case 'enrich_company':
      if (!parsed.entities.domain) {
        missing.push('domain');
      }
      break;
      
    case 'create_campaign':
      if (!parsed.entities.campaign_name) {
        missing.push('campaign name');
      }
      break;
      
    case 'help':
      // No required fields
      break;
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Export
// ============================================================================

export const CommandParser = {
  parse: parseCommand,
  getSuggestions: getCommandSuggestions,
  format: formatCommandForDisplay,
  validate: validateCommand,
  tokenize,
  extractEntities,
};

export default CommandParser;