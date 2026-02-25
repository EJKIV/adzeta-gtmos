'use client';

/**
 * Prospects List Component
 * 
 * Display enriched prospects with filtering and actions
 */

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  Filter,
  Mail,
  Linkedin,
  Building2,
  Star,
  StarOff,
  MoreVertical,
  Plus,
  Download,
  User,
  MapPin,
  Cpu,
  ChevronDown,
  X
} from 'lucide-react';
import { Prospect, ProspectQuality, ProspectEnrichmentStatus } from '@/lib/research/types';

interface ProspectsListProps {
  userId: string;
  className?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const qualityColors: Record<ProspectQuality, string> = {
  a: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  b: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  c: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  d: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  f: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const enrichmentStatusColors: Record<ProspectEnrichmentStatus, string> = {
  raw: 'text-slate-400',
  enriching: 'text-blue-400',
  enriched: 'text-emerald-400',
  failed: 'text-red-400',
  stale: 'text-yellow-400',
};

export function ProspectsList({ userId, className = '' }: ProspectsListProps) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState<ProspectQuality[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());

  // Fetch prospects
  useEffect(() => {
    const fetchProspects = async () => {
      if (!userId) return;
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch prospects:', error);
      } else {
        setProspects(data || []);
      }
      
      setLoading(false);
    };

    fetchProspects();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('prospects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospects',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProspects((prev) => [payload.new as Prospect, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProspects((prev) =
              prev.map((p) =
                p.id === payload.new.id ? (payload.new as Prospect) : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Filter prospects
  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchable = [
          prospect.person_name,
          prospect.person_email,
          prospect.person_title,
          prospect.company_name,
          prospect.company_industry,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
          
        if (!searchable.includes(query)) {
          return false;
        }
      }

      // Quality filter
      if (qualityFilter.length > 0 && prospect.quality_score) {
        if (!qualityFilter.includes(prospect.quality_score)) {
          return false;
        }
      }

      return true;
    });
  }, [prospects, searchQuery, qualityFilter]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedProspects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle quality filter
  const toggleQualityFilter = (quality: ProspectQuality) => {
    setQualityFilter((prev) => {
      if (prev.includes(quality)) {
        return prev.filter((q) => q !== quality);
      }
      return [...prev, quality];
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-pulse text-slate-500">Loading prospects...</div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-slate-100">Prospects</h3>
          <span className="px-2.5 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full">
            {filteredProspects.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prospects..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg
                         text-sm text-slate-300 placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>

          {/* Quality Filter */}
          <div className="relative group">
            <button className="flex items-center space-x-2 px-3 py-2 bg-slate-800 
                             border border-slate-700 rounded-lg text-sm text-slate-300
                             hover:bg-slate-750 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Quality</span>
              {qualityFilter.length > 0 && (
                <span className="ml-1 px-1.5 bg-violet-600 rounded text-xs">
                  {qualityFilter.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>

            <div className="absolute top-full right-0 mt-2 p-2 bg-slate-800 
                          border border-slate-700 rounded-lg shadow-xl
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          transition-all z-10">
              {(['a', 'b', 'c', 'd', 'f'] as ProspectQuality[]).map((quality) => (
                <button
                  key={quality}
                  onClick={() => toggleQualityFilter(quality)}
                  className={`flex items-center w-full px-3 py-2 text-sm rounded
                    ${qualityFilter.includes(quality) 
                      ? 'bg-violet-600/20 text-violet-300' 
                      : 'text-slate-300 hover:bg-slate-700'}
                  `}
                >
                  <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mr-2
                    ${qualityColors[quality]}`}
003e
                    {quality.toUpperCase()}
                  </span>
                  Tier {quality.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg
                           text-slate-400 hover:text-slate-200 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Actions Bar */}
      {selectedProspects.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-violet-600/20 border-b border-violet-600/30">
          <span className="text-sm text-violet-300">
            {selectedProspects.size} selected
          </span>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 
                             text-white rounded-lg transition-colors">
              Add to Campaign
            </button>
            <button 
              onClick={() => setSelectedProspects(new Set())}
              className="p-1.5 text-violet-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prospects List */}
      <div className="divide-y divide-slate-800">
        {filteredProspects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <User className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-slate-500">No prospects found</p>
            <button className="mt-4 flex items-center px-4 py-2 bg-violet-600 
                             hover:bg-violet-500 text-white rounded-lg transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              Research Prospects
            </button>
          </div>
        ) : (
          filteredProspects.map((prospect) => (
            <ProspectRow
              key={prospect.id}
              prospect={prospect}
              selected={selectedProspects.has(prospect.id)}
              onToggle={() => toggleSelection(prospect.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProspectRow({
  prospect,
  selected,
  onToggle,
}: {
  prospect: Prospect;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`flex items-center p-4 hover:bg-slate-800/50 transition-colors
      ${selected ? 'bg-violet-600/10' : ''}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mr-4 w-4 h-4 rounded border-slate-600 text-violet-600 
                   focus:ring-violet-500/50 bg-slate-800"
      />

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 
                      flex items-center justify-center text-white font-semibold">
        {prospect.person_name.charAt(0)}
      </div>

      {/* Info */}
      <div className="ml-4 flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-slate-100">{prospect.person_name}</span>
          {prospect.quality_score && (
            <span className={`px-1.5 py-0.5 text-xs font-bold border rounded
              ${qualityColors[prospect.quality_score]}`}
            >
              {prospect.quality_score.toUpperCase()}
            </span>
          )}
          {prospect.is_email_verified && (
            <span className="text-emerald-400">✓</span>
          )}
        </div>
        
        <div className="mt-0.5 text-sm text-slate-400">
          {prospect.person_title} {prospect.company_name && `at ${prospect.company_name}`}
        </div>

        {/* Details Row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {prospect.company_industry && (
            <span className="flex items-center">
              <Building2 className="w-3 h-3 mr-1" />
              {prospect.company_industry}
            </span>
          )}
          {prospect.company_size && (
            <span className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              {prospect.company_size}
            </span>
          )}
          {prospect.person_location && (
            <span className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {prospect.person_location}
            </span>
          )}
          {prospect.technologies && prospect.technologies.length > 0 && (
            <span className="flex items-center">
              <Cpu className="w-3 h-3 mr-1" />
              {prospect.technologies.slice(0, 3).join(', ')}
              {prospect.technologies.length > 3 && ` +${prospect.technologies.length - 3}`}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <span className={`text-xs ${enrichmentStatusColors[prospect.enrichment_status]}`}>
          {prospect.enrichment_status}
        </span>

        {prospect.person_email && (
          <a
            href={`mailto:${prospect.person_email}`}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Mail className="w-4 h-4" />
          </a>
        )}

        {prospect.person_linkedin_url && (
          <a
            href={prospect.person_linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        )}

        <button className="p-2 text-slate-500 hover:text-slate-300 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ProspectsList;