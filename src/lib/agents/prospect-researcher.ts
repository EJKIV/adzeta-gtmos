/**
 * AdZeta GTM — Prospect Researcher Agent
 * 
 * Specialist agent for lead generation and prospect research.
 * Integrates with Apollo for enrichment and web scraping fallback.
 */

import { invokeOpenClawTool } from '@/lib/research/openclaw-client';
import { memoryStore } from './memory-store';

// =============================================================================
// TYPES
// =============================================================================

export interface Prospect {
  id: string;
  company: {
    name: string;
    domain: string;
    industry: string;
    size: string;
    location: string;
    funding: string;
    website: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    phone?: string;
    linkedIn?: string;
  };
  quality: {
    score: 'A' | 'B' | 'C' | 'D' | 'F';
    matchPercentage: number;
    signalStrength: number;
    dataCompleteness: number;
  };
  signals: {
    hiring: boolean;
    funding: boolean;
    leadershipChange: boolean;
    techStack: string[];
  };
  enrichment: {
    source: string;
    enrichedAt: Date;
    confidence: number;
  };
}

export interface ProspectResearchParams {
  /** User ID for memory/personalization */
  userId: string;
  
  /** ICP criteria */
  icp: {
    titles?: string[];
    industries?: string[];
    fundingStages?: string[];
    locations?: string[];
    companySizes?: string[];
    technologies?: string[];
  };
  
  /** Max results to return */
  maxResults?: number;
  
  /** Whether to enrich with Apollo */
  enrichmentRequired?: boolean;
  
  /** Target account list (if already have companies) */
  companyList?: string[];
  
  /** Exclusion list (prospect IDs to skip) */
  exclusions?: string[];
  
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface ProspectResearchResult {
  /** Found prospects */
  prospects: Prospect[];
  
  /** Stats */
  stats: {
    totalFound: number;
    enriched: number;
    byQuality: Record<Prospect['quality']['score'], number>;
    estimatedCost: number;
  };
  
  /** Research insights */
  insights: {
    bestQuality: number;
    avgQuality: number;
    topCompanies: string[];
    recommendedAngles: string[];
  };
  
  /** Duration of research */
  duration: number;
}

// =============================================================================
// QUALITY SCORING
// =============================================================================

function calculateQuality(
  prospect: any,
  icp: ProspectResearchParams['icp']
): Prospect['quality'] {
  let score = 0;
  let maxScore = 0;
  
  // Title match
  if (icp.titles?.length) {
    maxScore += 30;
    const titles = icp.titles.map(t => t.toLowerCase());
    const contactTitle = prospect.contact?.title?.toLowerCase() || '';
    
    for (const title of titles) {
      if (contactTitle.includes(title)) {
        score += 30;
        break;
      }
    }
  }
  
  // Industry match
  if (icp.industries?.length) {
    maxScore += 20;
    const industries = icp.industries.map(i => i.toLowerCase());
    const companyIndustry = prospect.company?.industries?.[0]?.toLowerCase() || '';
    
    for (const industry of industries) {
      if (companyIndustry.includes(industry)) {
        score += 20;
        break;
      }
    }
  }
  
  // Funding stage match
  if (icp.fundingStages?.length) {
    maxScore += 15;
    const stages = icp.fundingStages.map(s => s.toLowerCase());
    const funding = prospect.company?.funding?.toLowerCase() || '';
    
    if (stages.some(s => funding.includes(s))) {
      score += 15;
    }
  }
  
  // Location match
  if (icp.locations?.length) {
    maxScore += 10;
    const locations = icp.lococations?.map(l => l.toLowerCase()) || [];
    const companyLoc = `${prospect.company?.city} ${prospect.company?.state}`.toLowerCase();
    
    for (const loc of locations) {
      if (companyLoc.includes(loc)) {
        score += 10;
        break;
      }
    }
  }
  
  // Company size match
  if (icp.companySizes?.length) {
    maxScore += 15;
    const size = prospect.company?.employee_count || 0;
    // Parse size ranges (e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+")
    const matchesSize = icp.companySizes.some(sizeRange => {
      const match = sizeRange.match(/(\d+)-(\d+)|(\d+)\+|(\d)+/);
      if (!match) return false;
      
      if (match[1] && match[2]) {
        return size >= parseInt(match[1]) && size <= parseInt(match[2]);
      } else if (match[3]) {
        return size >= parseInt(match[3]);
      }
      return false;
    });
    
    if (matchesSize) {
      score += 15;
    }
  }
  
  // Tech stack match
  if (icp.technologies?.length) {
    maxScore += 10;
    const tech = prospect.company?.technologies || [];
    const matchCount = icp.technologies.filter(t => 
      tech.some((ct: string) => ct.toLowerCase().includes(t.toLowerCase()))
    ).length;
    
    if (matchCount > 0) {
      score += Math.min(10, matchCount * 5);
    }
  }
  
  // Calculate percentage
  const percentage = Math.round((score / maxScore) * 100);
  
  // Determine letter grade
  let letter: Prospect['quality']['score'] = 'F';
  if (percentage >= 90) letter = 'A';
  else if (percentage >= 80) letter = 'B';
  else if (percentage >= 70) letter = 'C';
  else if (percentage >= 60) letter = 'D';
  
  // Signal strength (based on signals)
  let signalStrength = 0;
  if (prospect.signals?.hiring) signalStrength += 30;
  if (prospect.signals?.funding) signalStrength += 40;
  if (prospect.signals?.leadershipChange) signalStrength += 20;
  
  // Data completeness
  const hasEmail = prospect.contact?.email ? 25 : 0;
  const hasLinkedIn = prospect.contact?.linkedIn ? 15 : 0;
  const hasPhone = prospect.contact?.phone ? 10 : 0;
  const hasCompany = prospect.company?.website ? 25 : 0;
  const hasSize = prospect.company?.employee_count ? 15 : 0;
  const hasIndustry = prospect.company?.industries?.length ? 10 : 0;
  
  const dataCompleteness = hasEmail + hasLinkedIn + hasPhone + hasCompany + hasSize + hasIndustry;
  
  return {
    score: letter,
    matchPercentage: percentage,
    signalStrength,
    dataCompleteness,
  };
}

// =============================================================================
// RESEARCH IMPLEMENTATION
// =============================================================================

/**
 * Prospect Researcher — Main entry point
 */
export async function researchProspects(
  params: ProspectResearchParams
): Promise<ProspectResearchResult> {
  const startTime = Date.now();
  const { userId, icp, maxResults = 50, enrichmentRequired = true, signal } = params;
  
  // Track progress
  let found = 0;
  let enriched = 0;
  const prospects: Prospect[] = [];
  const byQuality: Record<Prospect['quality']['score'], number> = {
    A: 0, B: 0, C: 0, D: 0, F: 0
  };
  
  try {
    // Step 1: Search Apollo for prospects
    const searchResult = await invokeOpenClawTool(
      'apollo.search',
      {
        titles: icp.titles || ['CEO', 'CTO', 'VP', 'Director'],
        industries: icp.industries || [],
        employeeCount: icp.companySizes || [],
        maxResults: Math.min(maxResults * 2, 100), // Get more than needed
      }
    );
    
    if (!searchResult.success) {
      throw new Error(`Apollo search failed: ${searchResult.error}`);
    }
    
    const rawProspects = searchResult.data?.prospects || [];
    
    // Step 2: Enrich if required
    for (const raw of rawProspects) {
      if (signal?.aborted) break;
      if (prospects.length >= maxResults) break;
      
      let prospect = raw;
      
      if (enrichmentRequired) {
        const enrichResult = await invokeOpenClawTool(
          'apollo.enrich',
          { id: raw.id }
        );
        
        if (enrichResult.success) {
          prospect = { ...raw, ...enrichResult.data };
          enriched++;
        }
      }
      
      // Transform to standard format
      const formatted: Prospect = {
        id: prospect.id,
        company: {
          name: prospect.company?.name || prospect.organization?.name || 'Unknown',
          domain: prospect.company?.domain || prospect.organization?.domain || '',
          industry: prospect.company?.industries?.[0] || 'Unknown',
          size: prospect.company?.employee_count?.toString() || 'Unknown',
          location: `${prospect.company?.city || ''}, ${prospect.company?.state || ''}`,
          funding: prospect.company?.funding?.stage || 'Unknown',
          website: prospect.company?.website_url || '',
        },
        contact: {
          firstName: prospect.first_name || prospect.contact?.firstName || '',
          lastName: prospect.last_name || prospect.contact?.lastName || '',
          title: prospect.title || prospect.contact?.title || '',
          email: prospect.email || prospect.contact?.email || '',
          phone: prospect.phone_number || prospect.contact?.phone || '',
          linkedIn: prospect.linkedin_url || prospect.contact?.linkedIn || '',
        },
        quality: calculateQuality(prospect, icp),
        signals: {
          hiring: prospect.company?.hiring || false,
          funding: prospect.company?.recent_funding || false,
          leadershipChange: prospect.company?.leadership_change || false,
          techStack: prospect.company?.technologies || [],
        },
        enrichment: {
          source: enrichmentRequired ? 'Apollo Enriched' : 'Apollo Basic',
          enrichedAt: new Date(),
          confidence: enrichmentRequired ? 0.92 : 0.75,
        },
      };
      
      // Update stats
      found++;
      byQuality[formatted.quality.score]++;
      
      // Only add quality prospects
      if (formatted.quality.score !== 'F') {
        prospects.push(formatted);
      }
    }
    
    // Step 3: Learn and update memory
    const userMemory = await memoryStore.getUserMemory(userId);
    
    // Update effectiveness
    if (prospects.length > 0) {
      const avgQuality = prospects.reduce((sum, p) => 
        sum + p.quality.matchPercentage, 0
      ) / prospects.length;
      
      // Record ICP effectiveness
      await memoryStore.recordIcpSnapshot(
        userId,
        icp,
        {
          prospectsFound: prospects.length,
          replyRate: userMemory.averageReplyRate,
          meetingRate: 0, // Unknown yet
        },
        `Found ${prospects.length} prospects with Avg Quality: ${avgQuality.toFixed(1)}%`
      );
    }
    
    // Step 4: Generate insights
    const qualities = prospects.map(p => p.quality.matchPercentage);
    const avgQuality = qualities.length > 0 
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length 
      : 0;
    
    const companyCounts: Record<string, number> = {};
    prospects.forEach(p => {
      companyCounts[p.company.name] = (companyCounts[p.company.name] || 0) + 1;
    });
    
    const topCompanies = Object.entries(companyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    
    // Get recommended angles from memory
    const recommendedAngles = await memoryStore.getRecommendedAngles(userId);
    
    const duration = Date.now() - startTime;
    
    return {
      prospects,
      stats: {
        totalFound: found,
        enriched,
        byQuality,
        estimatedCost: enriched * 0.05, // $0.05/contact
      },
      insights: {
        bestQuality: Math.max(...qualities, 0),
        avgQuality,
        topCompanies,
        recommendedAngles: recommendedAngles.length > 0 
          ? recommendedAngles 
          : ['Personalized industry insight', 'Problem-solution fit', 'Social proof angle'],
      },
      duration,
    };
    
  } catch (error) {
    console.error('[ProspectResearcher] Research failed:', error);
    throw error;
  }
}

/**
 * Batch quality scoring for existing prospects
 */
export function scoreProspects(
  prospects: any[],
  icp: ProspectResearchParams['icp']
): Prospect[] {
  return prospects.map(p => ({
    ...p,
    quality: calculateQuality(p, icp),
  }));
}

/**
 * Deduplicate prospects by email/domain
 */
export function deduplicateProspects(prospects: Prospect[]): Prospect[] {
  const seen = new Set<string>();
  
  return prospects.filter(p => {
    const key = p.contact.email || `${p.company.domain}-${p.contact.firstName}-${p.contact.lastName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Filter prospects by minimum quality score
 */
export function filterByQuality(
  prospects: Prospect[],
  minScore: Prospect['quality']['score']
): Prospect[] {
  const scoreOrder: Prospect['quality']['score'][] = ['A', 'B', 'C', 'D', 'F'];
  const minIndex = scoreOrder.indexOf(minScore);
  
  return prospects.filter(p => 
    scoreOrder.indexOf(p.quality.score) <= minIndex
  );
}

/**
 * Export prospects to CSV
 */
export function exportToCSV(prospects: Prospect[]): string {
  const headers = [
    'First Name',
    'Last Name',
    'Title',
    'Email',
    'Company',
    'Industry',
    'Size',
    'Location',
    'Website',
    'Quality Score',
    'Match %',
    'LinkedIn',
    'Phone',
  ];
  
  const rows = prospects.map(p => [
    p.contact.firstName,
    p.contact.lastName,
    p.contact.title,
    p.contact.email,
    p.company.name,
    p.company.industry,
    p.company.size,
    p.company.location,
    p.company.website,
    p.quality.score,
    p.quality.matchPercentage.toString(),
    p.contact.linkedIn || '',
    p.contact.phone || '',
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell?.replace(/"/g, '""') || ''}"`).join(','))
    .join('\n');
}
