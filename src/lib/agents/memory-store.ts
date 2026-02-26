/**
 * AdZeta GTM — Memory Store
 * 
 * Persistent memory for the agent system.
 * Per-user learning, conversation history, and preferences.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// TYPES
// =============================================================================

export interface UserMemory {
  /** User ID */
  id: string;
  
  /** When memory was created */
  createdAt: Date;
  
  /** When memory was last updated */
  updatedAt: Date;
  
  // ==================== ICP EVOLUTION ====================
  
  /** Historical ICP snapshots with performance */
  icpSnapshots: Array<{
    criteria: any;
    resultsSummary: {
      prospectsFound: number;
      replyRate: number;
      meetingRate: number;
    };
    date: Date;
    notes: string;
  }>;
  
  /** Current ICP definition */
  currentIcp?: {
    criteria: any;
    validatedAt: Date;
    confidence: number;
  };
  
  // ==================== WHAT WORKS ====================
  
  /** Successful messaging angles */
  successfulAngles: Array<{
    angle: string;
    usedFor: string;
    responseRate: number;
    sampleSize: number;
    date: Date;
  }>;
  
  /** Angles to avoid */
  avoidedAngles: Array<{
    angle: string;
    reason: string;
    negativeIndicator: string;
  }>;
  
  /** Best performing templates */
  topTemplates: Array<{
    id: string;
    name: string;
    responseRate: number;
    useCount: number;
  }>;
  
  // ==================== USER PREFERENCES ====================
  
  /** Risk tolerance */
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  
  /** Preferred industries */
  preferredIndustries: string[];
  
  /** Industries to avoid */
  avoidIndustries: string[];
  
  /** Brand voice description */
  brandVoice: string;
  
  /** Communication preferences */
  communicationStyle: {
    tone: 'formal' | 'casual' | 'playful';
    length: 'brief' | 'detailed' | 'comprehensive';
    emojiUse: 'minimal' | 'moderate' | 'frequent';
  };
  
  // ==================== PERFORMANCE HISTORY ====================
  
  /** How often agent predictions matched reality */
  predictionAccuracy: number; // 0-1
  
  /** How often user approved delegated work */
  delegationSatisfaction: number; // 0-1
  
  /** Number of successful campaigns */
  successfulCampaignCount: number;
  
  /** Number of failed campaigns */
  failedCampaignCount: number;
  
  /** Average reply rate across all campaigns */
  averageReplyRate: number;
  
  // ==================== AUTONOMY LEVEL ====================
  
  /** Current autonomy level */
  currentAutonomy: 'supervised' | 'assisted' | 'autonomous';
  
  /** Whether autonomy has been earned */
  autonomyEarned: boolean;
  
  /** When autonomy was last evaluated */
  autonomyEvaluatedAt: Date;
  
  // ==================== CONVERSATION CONTEXT ====================
  
  /** Recent conversation history */
  recentConversations: Array<{
    id: string;
    summary: string;
    outcome: string;
    date: Date;
  }>;
  
  /** Active threads with the agent */
  activeThreads: Array<{
    threadId: string;
    context: string;
    lastActivity: Date;
  }>;
  
  // ==================== LEARNED PATTERNS ====================
  
  /** Optimal send times for this user's audience */
  optimalSendTimes: Array<{
    day: string;
    hour: number;
    confidence: number;
  }>;
  
  /** Best channels for this ICP */
  effectiveChannels: Array<{
    channel: string;
    responseRate: number;
    sampleSize: number;
  }>;
}

export interface GlobalMemory {
  /** Industry benchmarks */
  benchmarks: Record<string, {
    averageReplyRate: number;
    averageOpenRate: number;
    averageMeetingRate: number;
    dataPoints: number;
    updatedAt: Date;
  }>;
  
  /** Template effectiveness scores (anonymized) */
  templateEffectiveness: Array<{
    templateId: string;
    industry: string;
    responseRate: number;
    useCount: number;
  }>;
  
  /** Strategy success rates (anonymized) */
  strategySuccess: Array<{
    strategyType: string;
    avgReplyRate: number;
    dataPoints: number;
  }>;
}

// =============================================================================
// MEMORY STORE
// =============================================================================

class MemoryStore {
  private supabase: SupabaseClient;
  private cache: Map<string, UserMemory> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();
  
  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[MemoryStore] Supabase not configured, using in-memory fallback');
      this.supabase = null as any; // Will use fallback
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }
  
  // ==================== USER MEMORY ====================
  
  /**
   * Get or create user memory
   */
  async getUserMemory(userId: string): Promise<UserMemory> {
    // Check cache
    const cached = this.getFromCache(userId);
    if (cached) return cached;
    
    // Try database
    const memory = await this.loadFromDatabase(userId);
    if (memory) {
      this.setCache(userId, memory);
      return memory;
    }
    
    // Create new memory
    const newMemory = this.createDefaultMemory(userId);
    await this.saveUserMemory(newMemory);
    this.setCache(userId, newMemory);
    return newMemory;
  }
  
  /**
   * Save user memory
   */
  async saveUserMemory(memory: UserMemory): Promise<void> {
    memory.updatedAt = new Date();
    
    // Update cache
    this.setCache(memory.id, memory);
    
    // Save to database
    await this.saveToDatabase(memory);
  }
  
  /**
   * Update specific fields in user memory
   */
  async updateUserMemory(
    userId: string,
    updates: Partial<UserMemory>
  ): Promise<UserMemory> {
    const memory = await this.getUserMemory(userId);
    const updated = { ...memory, ...updates, updatedAt: new Date() };
    await this.saveUserMemory(updated);
    return updated;
  }
  
  // ==================== LEARNING METHODS ====================
  
  /**
   * Record a successful messaging angle
   */
  async recordSuccessfulAngle(
    userId: string,
    angle: string,
    responseRate: number,
    sampleSize: number,
    usedFor: string
  ): Promise<void> {
    const memory = await this.getUserMemory(userId);
    memory.successfulAngles.push({
      angle,
      responseRate,
      sampleSize,
      usedFor,
      date: new Date(),
    });
    
    // Keep only top 20 angles
    memory.successfulAngles = memory.successfulAngles
      .sort((a, b) => b.responseRate - a.responseRate)
      .slice(0, 20);
    
    await this.saveUserMemory(memory);
  }
  
  /**
   * Record a failed angle
   */
  async recordAvoidedAngle(
    userId: string,
    angle: string,
    reason: string,
    negativeIndicator: string
  ): Promise<void> {
    const memory = await this.getUserMemory(userId);
    memory.avoidedAngles.push({ angle, reason, negativeIndicator });
    
    // Keep only last 50
    if (memory.avoidedAngles.length > 50) {
      memory.avoidedAngles = memory.avoidedAngles.slice(-50);
    }
    
    await this.saveUserMemory(memory);
  }
  
  /**
   * Record ICP snapshot
   */
  async recordIcpSnapshot(
    userId: string,
    criteria: any,
    results: any,
    notes: string
  ): Promise<void> {
    const memory = await this.getUserMemory(userId);
    memory.icpSnapshots.push({
      criteria,
      resultsSummary: results,
      date: new Date(),
      notes,
    });
    
    // Keep only last 10 snapshots
    if (memory.icpSnapshots.length > 10) {
      memory.icpSnapshots = memory.icpSnapshots.slice(-10);
    }
    
    // Update current ICP if this was validated
    memory.currentIcp = {
      criteria,
      validatedAt: new Date(),
      confidence: results.prospectsFound > 50 ? 0.9 : 0.7,
    };
    
    await this.saveUserMemory(memory);
  }
  
  /**
   * Evaluate autonomy level based on performance
   */
  async evaluateAutonomy(userId: string): Promise<UserMemory['currentAutonomy']> {
    const memory = await this.getUserMemory(userId);
    
    const totalCampaigns = memory.successfulCampaignCount + memory.failedCampaignCount;
    const successRate = totalCampaigns > 0 
      ? memory.successfulCampaignCount / totalCampaigns 
      : 0;
    
    const satisfactoryRate = memory.delegationSatisfaction;
    
    let newLevel: UserMemory['currentAutonomy'] = 'supervised';
    
    if (totalCampaigns >= 10 && successRate >= 0.8 && satisfactoryRate >= 0.9) {
      newLevel = 'autonomous';
      memory.autonomyEarned = true;
    } else if (totalCampaigns >= 3 && successRate >= 0.7 && satisfactoryRate >= 0.8) {
      newLevel = 'assisted';
    }
    
    memory.currentAutonomy = newLevel;
    memory.autonomyEvaluatedAt = new Date();
    await this.saveUserMemory(memory);
    
    return newLevel;
  }
  
  /**
   * Add conversation to history
   */
  async addConversation(
    userId: string,
    summary: string,
    outcome: string
  ): Promise<void> {
    const memory = await this.getUserMemory(userId);
    memory.recentConversations.push({
      id: crypto.randomUUID(),
      summary,
      outcome,
      date: new Date(),
    });
    
    // Keep only last 20
    if (memory.recentConversations.length > 20) {
      memory.recentConversations = memory.recentConversations.slice(-20);
    }
    
    await this.saveUserMemory(memory);
  }
  
  // ==================== INSIGHTS ====================
  
  /**
   * Get recommended angles for ICP
   */
  async getRecommendedAngles(userId: string): Promise<string[]> {
    const memory = await this.getUserMemory(userId);
    return memory.successfulAngles
      .filter(a => a.responseRate >= 0.05)
      .slice(0, 5)
      .map(a => a.angle);
  }
  
  /**
   * Get current ICP
   */
  async getCurrentIcp(userId: string): Promise<UserMemory['currentIcp'] | null> {
    const memory = await this.getUserMemory(userId);
    return memory.currentIcp || null;
  }
  
  // ==================== DATABASE OPERATIONS ====================
  
  private async loadFromDatabase(userId: string): Promise<UserMemory | null> {
    if (!this.supabase) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('agent_memories')
        .select('memory')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) return null;
      
      return this.memoryFromJSON(data.memory);
    } catch (err) {
      console.warn('[MemoryStore] Failed to load from database:', err);
      return null;
    }
  }
  
  private async saveToDatabase(memory: UserMemory): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase
        .from('agent_memories')
        .upsert({
          user_id: memory.id,
          memory: this.memoryToJSON(memory),
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.warn('[MemoryStore] Failed to save to database:', err);
    }
  }
  
  // ==================== CACHE ====================
  
  private getFromCache(userId: string): UserMemory | null {
    const timestamp = this.cacheTimestamps.get(userId);
    if (!timestamp || Date.now() - timestamp > this.cacheTTL) {
      this.cache.delete(userId);
      this.cacheTimestamps.delete(userId);
      return null;
    }
    return this.cache.get(userId) || null;
  }
  
  private setCache(userId: string, memory: UserMemory): void {
    this.cache.set(userId, memory);
    this.cacheTimestamps.set(userId, Date.now());
  }
  
  // ==================== SERIALIZATION ====================
  
  private memoryToJSON(memory: UserMemory): any {
    return JSON.parse(JSON.stringify(memory));
  }
  
  private memoryFromJSON(data: any): UserMemory {
    return data as UserMemory;
  }
  
  // ==================== DEFAULTS ====================
  
  private createDefaultMemory(userId: string): UserMemory {
    return {
      id: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      icpSnapshots: [],
      successfulAngles: [],
      avoidedAngles: [],
      topTemplates: [],
      
      riskTolerance: 'balanced',
      preferredIndustries: [],
      avoidIndustries: [],
      brandVoice: 'Professional, direct, and value-focused',
      communicationStyle: {
        tone: 'casual',
        length: 'brief',
        emojiUse: 'minimal',
      },
      
      predictionAccuracy: 0.5,
      delegationSatisfaction: 1.0,
      successfulCampaignCount: 0,
      failedCampaignCount: 0,
      averageReplyRate: 0,
      
      currentAutonomy: 'supervised',
      autonomyEarned: false,
      autonomyEvaluatedAt: new Date(),
      
      recentConversations: [],
      activeThreads: [],
      
      optimalSendTimes: [],
      effectiveChannels: [],
    };
  }
}

// =============================================================================
// GLOBAL_MEMORY STORE
// =============================================================================

class GlobalMemoryStore {
  private globalMemory: GlobalMemory = {
    benchmarks: {},
    templateEffectiveness: [],
    strategySuccess: [],
  };
  
  /**
   * Update benchmarks for an industry
   */
  updateBenchmark(
    industry: string,
    metrics: {
      replyRate: number;
      openRate: number;
      meetingRate: number;
    }
  ): void {
    const existing = this.globalMemory.benchmarks[industry];
    
    if (existing) {
      // Weighted average
      const weight = 0.7; // 70% existing, 30% new
      existing.averageReplyRate = existing.averageReplyRate * weight + metrics.replyRate * (1 - weight);
      existing.averageOpenRate = existing.averageOpenRate * weight + metrics.openRate * (1 - weight);
      existing.averageMeetingRate = existing.averageMeetingRate * weight + metrics.meetingRate * (1 - weight);
      existing.dataPoints++;
    } else {
      this.globalMemory.benchmarks[industry] = {
        averageReplyRate: metrics.replyRate,
        averageOpenRate: metrics.openRate,
        averageMeetingRate: metrics.meetingRate,
        dataPoints: 1,
        updatedAt: new Date(),
      };
    }
  }
  
  /**
   * Get benchmark for industry
   */
  getBenchmark(industry: string): GlobalMemory['benchmarks'][string] | null {
    return this.globalMemory.benchmarks[industry] || null;
  }
  
  /**
   * Record template effectiveness
   */
  recordTemplateEffectiveness(
    templateId: string,
    industry: string,
    responseRate: number
  ): void {
    this.globalMemory.templateEffectiveness.push({
      templateId,
      industry,
      responseRate,
      useCount: 1,
    });
    
    // Keep last 1000
    if (this.globalMemory.templateEffectiveness.length > 1000) {
      this.globalMemory.templateEffectiveness = this.globalMemory.templateEffectiveness.slice(-1000);
    }
  }
  
  /**
   * Get top templates for industry
   */
  getTopTemplates(industry: string, limit = 5): string[] {
    return this.globalMemory.templateEffectiveness
      .filter(t => t.industry === industry)
      .sort((a, b) => b.responseRate - a.responseRate)
      .slice(0, limit)
      .map(t => t.templateId);
  }
  
  /**
   * Get strategy success rate
   */
  getStrategySuccess(strategyType: string): number | null {
    const results = this.globalMemory.strategySuccess.filter(
      s => s.strategyType === strategyType
    );
    
    if (results.length === 0) return null;
    
    return results.reduce((sum, s) => sum + s.avgReplyRate, 0) / results.length;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const memoryStore = new MemoryStore();
export const globalMemoryStore = new GlobalMemoryStore();
