/**
 * AdZeta GTM — Skill Registry System
 * 
 * Central registry for all agent capabilities. Skills are registered
 * at startup and queried by the orchestrator for delegation decisions.
 */

export interface SkillDefinition {
  /** Unique skill identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** The agent that owns this skill */
  agentId: string;
  
  /** Description of what this skill does */
  description: string;
  
  /** Example inputs this skill accepts */
  inputSchema: Record<string, any>;
  
  /** Expected output format */
  outputSchema: Record<string, any>;
  
  /** Keywords and patterns for intent matching */
  triggers: {
    /** Natural language patterns that suggest this skill */
    patterns: string[];
    
    /** Required keywords */
    keywords: string[];
    
    /** Entity types this skill works with */
    entities: string[];
  };
  
  /** Cost model */
  cost: {
    /** Base cost per invocation */
    perCall: number;
    
    /** Additional cost per unit (contacts, etc) */
    perUnit?: number;
    
    /** Unit name */
    unitName?: string;
    
    /** Requires explicit approval if total > this */
    approvalThreshold: number;
  };
  
  /** Execution constraints */
  constraints: {
    /** Maximum time to wait for result */
    timeoutMs: number;
    
    /** Can run in parallel with others */
    parallelizable: boolean;
    
    /** Dependencies on other skills */
    dependsOn?: string[];
    
    /** Maximum items this skill can process */
    maxBatchSize?: number;
  };
  
  /** Quality metrics */
  quality: {
    /** Target success rate */
    targetSuccessRate: number;
    
    /** Auto-retry on failure */
    autoRetry: boolean;
    
    /** Maximum retries */
    maxRetries: number;
  };
  
  /** When this skill was registered */
  registeredAt: Date;
  
  /** Version of this skill */
  version: string;
}

/** Registry singleton */
class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private agents: Map<string, string[]> = new Map(); // agentId -> skillIds
  
  /**
   * Register a new skill
   */
  register(skill: Omit<SkillDefinition, 'registeredAt'>): SkillDefinition {
    const fullSkill: SkillDefinition = {
      ...skill,
      registeredAt: new Date(),
    };
    
    this.skills.set(skill.id, fullSkill);
    
    // Add to agent index
    const agentSkills = this.agents.get(skill.agentId) || [];
    agentSkills.push(skill.id);
    this.agents.set(skill.agentId, agentSkills);
    
    return fullSkill;
  }
  
  /**
   * Get skill by ID
   */
  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }
  
  /**
   * Get all skills for an agent
   */
  getByAgent(agentId: string): SkillDefinition[] {
    const skillIds = this.agents.get(agentId) || [];
    return skillIds.map(id => this.skills.get(id)).filter(Boolean) as SkillDefinition[];
  }
  
  /**
   * Find skills matching intent
   */
  findMatchingSkills(intent: string): Array<{ skill: SkillDefinition; confidence: number }> {
    const matches: Array<{ skill: SkillDefinition; confidence: number }> = [];
    
    for (const skill of this.skills.values()) {
      let confidence = this.calculateMatchConfidence(intent, skill);
      if (confidence > 0.3) {
        matches.push({ skill, confidence });
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Calculate how well a skill matches an intent
   */
  private calculateMatchConfidence(intent: string, skill: SkillDefinition): number {
    const intentLower = intent.toLowerCase();
    let score = 0;
    let maxScore = 0;
    
    // Pattern matching
    for (const pattern of skill.triggers.patterns) {
      maxScore += 2;
      const regex = new RegExp(pattern, 'i');
      if (regex.test(intentLower)) {
        score += 2;
      }
    }
    
    // Keyword matching
    for (const keyword of skill.triggers.keywords) {
      maxScore += 1;
      if (intentLower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    // Entity detection
    for (const entity of skill.triggers.entities) {
      maxScore += 1.5;
      if (intentLower.includes(entity.toLowerCase())) {
        score += 1.5;
      }
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }
  
  /**
   * Get all registered skills
   */
  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * Get all registered agents
   */
  getAgents(): string[] {
    return Array.from(this.agents.keys());
  }
  
  /**
   * Remove a skill
   */
  unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;
    
    this.skills.delete(skillId);
    
    const agentSkills = this.agents.get(skill.agentId) || [];
    this.agents.set(
      skill.agentId,
      agentSkills.filter(id => id !== skillId)
    );
    
    return true;
  }
}

/** Global registry instance */
export const skillRegistry = new SkillRegistry();

// ============================================
// PRE-REGISTERED SKILLS
// ============================================

/**
 * Initialize registry with GTM agent skills
 */
export function initializeSkillRegistry() {
  // ==================== RESEARCH SKILLS ====================
  
  skillRegistry.register({
    id: 'icp-analysis',
    name: 'ICP Analysis',
    agentId: 'icp-architect',
    description: 'Analyze and refine Ideal Customer Profile definitions based on market data and historical performance',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        currentCustomers: { type: 'array' },
        targetIndustry: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        enrichedIcp: { type: 'object' },
        criteria: { type: 'array' },
        validationScore: { type: 'number' },
      },
    },
    triggers: {
      patterns: [
        'define.*icp',
        'refine.*customer.*profile',
        'ideal customer',
        'target audience',
        'icp analysis',
      ],
      keywords: ['icp', 'customer', 'profile', 'target', 'audience', 'persona'],
      entities: ['company', 'industry', 'persona', 'profile'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 30000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.95,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  skillRegistry.register({
    id: 'prospect-research',
    name: 'Prospect Research',
    agentId: 'prospect-researcher',
    description: 'Research and enrich prospects from multiple sources including Apollo, Clearbit, and web',
    inputSchema: {
      type: 'object',
      properties: {
        icp: { type: 'object' },
        companyList: { type: 'array' },
        enrichmentRequired: { type: 'boolean' },
        maxResults: { type: 'number' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        prospects: { type: 'array' },
        totalFound: { type: 'number' },
        qualityDistribution: { type: 'object' },
      },
    },
    triggers: {
      patterns: [
        'find.*prospects?',
        'research.*leads?',
        'discover.*companies?',
        'build.*list',
      ],
      keywords: ['prospect', 'lead', 'research', 'find', 'discover', 'enrich', 'apollo'],
      entities: ['contact', 'company', 'prospect', 'lead', 'cmo', 'ceo', 'vp'],
    },
    cost: {
      perCall: 0,
      perUnit: 0.05,
      unitName: 'contact',
      approvalThreshold: 1.00,
    },
    constraints: {
      timeoutMs: 120000,
      parallelizable: true,
      maxBatchSize: 100,
    },
    quality: {
      targetSuccessRate: 0.90,
      autoRetry: true,
      maxRetries: 2,
    },
    version: '1.0.0',
  });
  
  skillRegistry.register({
    id: 'signal-monitoring',
    name: 'Signal Monitoring',
    agentId: 'signal-scout',
    description: 'Monitor buying signals including hiring, funding, tech stack changes, and leadership moves',
    inputSchema: {
      type: 'object',
      properties: {
        accounts: { type: 'array' },
        signalTypes: { type: 'array' },
        since: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        signals: { type: 'array' },
        highPrioritySignals: { type: 'array' },
        recommendedActions: { type: 'array' },
      },
    },
    triggers: {
      patterns: [
        'monitor.*signals?',
        'track.*hiring',
        'funding.*news',
        'buying.*signals?',
      ],
      keywords: ['signal', 'monitor', 'track', 'hiring', 'funding', 'news'],
      entities: ['signal', 'hiring', 'funding', 'leadership'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.50,
    },
    constraints: {
      timeoutMs: 60000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.85,
      autoRetry: false,
      maxRetries: 1,
    },
    version: '1.0.0',
  });
  
  // ==================== CAMPAIGN SKILLS ====================
  
  skillRegistry.register({
    id: 'campaign-strategy',
    name: 'Campaign Strategy',
    agentId: 'campaign-strategist',
    description: 'Design multi-channel campaign architectures including channel mix, sequencing, and personalization',
    inputSchema: {
      type: 'object',
      properties: {
        icp: { type: 'object' },
        goal: { type: 'string' },
        timeline: { type: 'string' },
        budget: { type: 'number' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        strategy: { type: 'object' },
        channelMix: { type: 'array' },
        expectedPerformance: { type: 'object' },
      },
    },
    triggers: {
      patterns: [
        'create.*campaign',
        'design.*campaign',
        'campaign.*strategy',
        'outreach.*plan',
      ],
      keywords: ['campaign', 'strategy', 'outreach', 'plan', 'design', 'create'],
      entities: ['campaign', 'sequence', 'email', 'linkedin'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 45000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.90,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  skillRegistry.register({
    id: 'sequence-build',
    name: 'Sequence Building',
    agentId: 'sequence-architect',
    description: 'Build multi-touch outreach sequences with timing, branching logic, and personalization',
    inputSchema: {
      type: 'object',
      properties: {
        touches: { type: 'number' },
        strategy: { type: 'object' },
        channels: { type: 'array' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        sequence: { type: 'object' },
        timeline: { type: 'string' },
        steps: { type: 'array' },
      },
    },
    triggers: {
      patterns: [
        'build.*sequence',
        'create.*sequence',
        'sequence.*steps',
        'touch.*sequence',
      ],
      keywords: ['sequence', 'build', 'create', 'steps', 'touches', 'cadence'],
      entities: ['sequence', 'step', 'touch', 'email', 'linkedin'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 30000,
      parallelizable: true,
      dependsOn: ['campaign-strategy'],
    },
    quality: {
      targetSuccessRate: 0.95,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  skillRegistry.register({
    id: 'ab-test-design',
    name: 'A/B Test Design',
    agentId: 'ab-test-designer',
    description: 'Design statistically rigorous A/B tests with proper sample sizes and significance thresholds',
    inputSchema: {
      type: 'object',
      properties: {
        element: { type: 'string' },
        variants: { type: 'number' },
        metric: { type: 'string' },
        traffic: { type: 'number' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        testDesign: { type: 'object' },
        sampleSize: { type: 'number' },
        durationEstimate: { type: 'string' },
      },
    },
    triggers: {
      patterns: [
        'a/b.*test',
        'test.*variant',
        'split.*test',
        'experiment.*design',
      ],
      keywords: ['ab', 'test', 'variant', 'experiment', 'split', 'randomize'],
      entities: ['test', 'variant', 'subject', 'body', 'cta'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 15000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.98,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  // ==================== COPYWRITING ====================
  
  skillRegistry.register({
    id: 'copy-write',
    name: 'Copywriting',
    agentId: 'copywriter',
    description: 'Generate personalized outreach copy including subject lines, email bodies, and LinkedIn messages',
    inputSchema: {
      type: 'object',
      properties: {
        angle: { type: 'string' },
        persona: { type: 'string' },
        prospectData: { type: 'object' },
        tone: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        variants: { type: 'array' },
        subjectLines: { type: 'array' },
        spamScores: { type: 'array' },
      },
    },
    triggers: {
      patterns: [
        'write.*email',
        'generate.*copy',
        'subject.*line',
        'message.*template',
      ],
      keywords: ['write', 'copy', 'email', 'subject', 'message', 'draft'],
      entities: ['email', 'subject', 'body', 'message', 'template'],
    },
    cost: {
      perCall: 0,
      perUnit: 0.002,
      unitName: 'variant',
      approvalThreshold: 0.50,
    },
    constraints: {
      timeoutMs: 30000,
      parallelizable: true,
      dependsOn: ['campaign-strategy'],
    },
    quality: {
      targetSuccessRate: 0.95,
      autoRetry: true,
      maxRetries: 1,
    },
    version: '1.0.0',
  });
  
  // ==================== ANALYTICS ====================
  
  skillRegistry.register({
    id: 'performance-analysis',
    name: 'Performance Analysis',
    agentId: 'performance-analyst',
    description: 'Analyze campaign performance with KPIs, funnel analysis, and benchmark comparisons',
    inputSchema: {
      type: 'object',
      properties: {
        campaignIds: { type: 'array' },
        metrics: { type: 'array' },
        timeframe: { type: 'object' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        report: { type: 'object' },
        insights: { type: 'array' },
        recommendations: { type: 'array' },
      },
    },
    triggers: {
      patterns: [
        'analyze.*performance',
        'campaign.*report',
        'how.*performing',
        'show.*metrics',
      ],
      keywords: ['analyze', 'performance', 'metrics', 'report', 'kpis', 'stats'],
      entities: ['metric', 'kpi', 'conversion', 'rate', 'performance'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 30000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.95,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  skillRegistry.register({
    id: 'forecasting',
    name: 'Pipeline Forecasting',
    agentId: 'forecasting-model',
    description: 'Predict pipeline generation and response rates with confidence intervals',
    inputSchema: {
      type: 'object',
      properties: {
        campaigns: { type: 'array' },
        timeframe: { type: 'string' },
        scenarios: { type: 'array' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        forecast: { type: 'object' },
        scenarios: { type: 'array' },
        confidenceIntervals: { type: 'object' },
      },
    },
    triggers: {
      patterns: [
        'forecast.*pipeline',
        'predict.*revenue',
        'project.*outreach',
        'scenario.*planning',
      ],
      keywords: ['forecast', 'predict', 'project', 'scenario', 'pipeline', 'revenue'],
      entities: ['forecast', 'prediction', 'scenario', 'month', 'quarter'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 45000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.80,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  // ==================== RESPONSE HANDling ====================
  
  skillRegistry.register({
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    agentId: 'sentiment-reader',
    description: 'Analyze reply tone, sentiment, interest level, and intent from prospect responses',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        context: { type: 'object' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        sentiment: { type: 'number' },
        interest: { type: 'string' },
        tone: { type: 'string' },
        intent: { type: 'string' },
      },
    },
    triggers: {
      patterns: [
        'analyze.*reply',
        'sentiment.*check',
        'tone.*analysis',
        'classify.*response',
      ],
      keywords: ['sentiment', 'analysis', 'tone', 'reply', 'response', 'classify'],
      entities: ['sentiment', 'tone', 'interest', 'intent', 'reply'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 5000,
      parallelizable: true,
    },
    quality: {
      targetSuccessRate: 0.85,
      autoRetry: false,
      maxRetries: 1,
    },
    version: '1.0.0',
  });
  
  skillRegistry.register({
    id: 'response-routing',
    name: 'Response Routing',
    agentId: 'response-router',
    description: 'Triage prospect replies and route to appropriate action or human owner',
    inputSchema: {
      type: 'object',
      properties: {
        reply: { type: 'object' },
        sentiment: { type: 'object' },
        accountValue: { type: 'number' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string' },
        assignedTo: { type: 'string' },
        priority: { type: 'string' },
      },
    },
    triggers: {
      patterns: [
        'route.*reply',
        'triage.*response',
        'handle.*reply',
        'reply.*action',
      ],
      keywords: ['route', 'triage', 'reply', 'response', 'handle'],
      entities: ['sdr', 'ae', 'reply', 'response', 'handoff'],
    },
    cost: {
      perCall: 0,
      approvalThreshold: 0.10,
    },
    constraints: {
      timeoutMs: 3000,
      parallelizable: true,
      dependsOn: ['sentiment-analysis'],
    },
    quality: {
      targetSuccessRate: 0.90,
      autoRetry: false,
      maxRetries: 0,
    },
    version: '1.0.0',
  });
  
  console.log(`[SkillRegistry] Initialized with ${skillRegistry.getAll().length} skills`);
}

// Auto-initialize on import
initializeSkillRegistry();
