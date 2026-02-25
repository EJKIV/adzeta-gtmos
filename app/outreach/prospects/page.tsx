'use client';

/**
 * Prospects Page
 * Uses ProspectStream component for swipeable cards per WORKFLOWS.md
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Filter,
  Search,
  Download,
} from 'lucide-react';
import { ProspectStream } from '@/components';
import { useOutreach } from '../layout';
import type { Prospect } from '@/types';

const filters = [
  { label: 'All', count: 247 },
  { label: 'A+', count: 42 },
  { label: 'A', count: 89 },
  { label: 'B+', count: 76 },
  { label: 'New', count: 24 },
];

const mockProspects: Prospect[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Chen',
    name: 'Sarah Chen',
    title: 'VP Marketing',
    company: 'FintechFlow',
    industry: 'Financial Services',
    companySize: '50-200',
    location: 'New York, NY',
    email: 'sarah@fintechflow.com',
    score: 94,
    scoreGrade: 'A+',
    confidence: 95,
    signals: [
      { type: 'funding', label: 'Series B', description: 'Raised $25M last month', timestamp: new Date(), source: 'Apollo', strength: 'high' },
      { type: 'hiring', label: 'Hiring', description: 'Active recruitment for growth team', timestamp: new Date(), source: 'Apollo', strength: 'medium' },
    ],
    enrichedAt: new Date(),
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Rodriguez',
    name: 'Michael Rodriguez',
    title: 'CTO',
    company: 'ScaleUp SaaS',
    industry: 'Software',
    companySize: '200-500',
    location: 'San Francisco, CA',
    email: 'mike@scaleup.io',
    score: 88,
    scoreGrade: 'A',
    confidence: 92,
    signals: [
      { type: 'expansion', label: 'Expanding', description: 'New office opening in Austin', timestamp: new Date(), source: 'Apollo', strength: 'high' },
    ],
    enrichedAt: new Date(),
  },
  {
    id: '3',
    firstName: 'Emily',
    lastName: 'Watson',
    name: 'Emily Watson',
    title: 'Head of Sales',
    company: 'GrowthTech',
    industry: 'Enterprise Software',
    companySize: '100-200',
    location: 'Boston, MA',
    score: 82,
    scoreGrade: 'B+',
    confidence: 88,
    signals: [
      { type: 'tech_stack', label: 'Modern Stack', description: 'Using your target technologies', timestamp: new Date(), source: 'Apollo', strength: 'medium' },
    ],
    enrichedAt: new Date(),
  },
  {
    id: '4',
    firstName: 'David',
    lastName: 'Kim',
    name: 'David Kim',
    title: 'VP Growth',
    company: 'StartupX',
    industry: 'Technology',
    companySize: '20-50',
    location: 'Seattle, WA',
    score: 91,
    scoreGrade: 'A+',
    confidence: 94,
    signals: [
      { type: 'hiring', label: 'Growth Team', description: 'Hiring 5 new sales reps', timestamp: new Date(), source: 'Apollo', strength: 'high' },
    ],
    enrichedAt: new Date(),
  },
  {
    id: '5',
    firstName: 'Lisa',
    lastName: 'Thompson',
    name: 'Lisa Thompson',
    title: 'CMO',
    company: 'CloudScale',
    industry: 'SaaS',
    companySize: '500+',
    location: 'Austin, TX',
    score: 86,
    scoreGrade: 'A',
    confidence: 90,
    signals: [],
    enrichedAt: new Date(),
  },
];

export default function ProspectsPage() {
  const { addToThread } = useOutreach();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter prospects by grade and search
  const filteredProspects = mockProspects.filter((p) => {
    if (activeFilter !== 'All' && activeFilter !== 'New') {
      if (p.scoreGrade !== activeFilter) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartOutreach = useCallback(
    (prospect: Prospect) => {
      addToThread({ type: 'action', content: `Started outreach to ${prospect.name}`, data: { prospect } });
    },
    [addToThread]
  );

  const handleViewSignals = useCallback(() => {}, []);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Prospects</h1>
                  <p className="text-slate-500">Browse and manage qualified leads</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search prospects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#de347f]/50 focus:ring-1 focus:ring-[#de347f]/20 w-64"
              />
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2" />

            {filters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setActiveFilter(filter.label)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === filter.label
                    ? 'bg-[#de347f]/10 text-[#de347f]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {filter.label} <span className="text-slate-400 ml-1">({filter.count})</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ProspectStream - swipeable cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-6 mt-6 pb-12"
      >
        <div className="max-w-7xl mx-auto">
          <ProspectStream
            prospects={filteredProspects}
            onStartOutreach={handleStartOutreach}
            onViewSignals={handleViewSignals}
          />
        </div>
      </motion.div>
    </div>
  );
}
