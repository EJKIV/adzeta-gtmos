'use client';

/**
 * Outreach Research Page
 * Uses OutreachContext from layout for CommandBar + ThreadPanel
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Users,
  TrendingUp,
  Target,
} from 'lucide-react';

import {
  ResearchCards,
  ProspectStream,
  Suggestions,
} from '@/components';

import { useOutreach } from './layout';

import type {
  Prospect,
  ResearchJob,
  Suggestion as SuggestionType,
} from '@/types';

// Mock data for initial render
const MOCK_PROSPECTS: Prospect[] = [
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
];

const MOCK_SUGGESTIONS: SuggestionType[] = [
  {
    id: '1',
    type: 'prospect',
    title: 'New prospects matching your ICP',
    description: 'Found 12 new contacts at Series B+ fintech companies',
    context: 'Auto-discovered',
    actionLabel: 'View Prospects',
    actionType: 'view_prospects',
    priority: 'high',
  },
  {
    id: '2',
    type: 'optimization',
    title: 'Sequence A is outperforming',
    description: 'Variant A has 35% better reply rates — consider applying to all prospects',
    actionLabel: 'Apply Winner',
    actionType: 'apply_winner',
    priority: 'medium',
  },
];

const quickActions = [
  { icon: Search, label: 'Find Prospects', description: 'Search by company, role, or signal', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { icon: Users, label: 'Browse Leads', description: 'View your qualified prospects', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { icon: TrendingUp, label: 'Monitor Campaigns', description: 'Track performance metrics', color: 'bg-purple-50 text-purple-600 border-purple-200' },
  { icon: Target, label: 'Optimize Sequences', description: 'A/B test and improve', color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

export default function OutreachPage() {
  const { addToThread } = useOutreach();
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [prospects] = useState<Prospect[]>(MOCK_PROSPECTS);
  const [suggestions] = useState<SuggestionType[]>(MOCK_SUGGESTIONS);

  const handleSuggestionAction = useCallback((suggestion: SuggestionType) => {
    addToThread({ type: 'action', content: `Accepted: ${suggestion.title}`, data: { suggestion } });
  }, [addToThread]);

  const handleStartOutreach = useCallback((prospect: Prospect) => {
    addToThread({ type: 'action', content: `Started outreach to ${prospect.name}`, data: { prospect } });
  }, [addToThread]);

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
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-[#de347f]" />
            <h1 className="text-2xl font-bold text-slate-900">Research</h1>
          </div>
          <p className="text-slate-500">
            Find prospects, analyze signals, and research your target market.
          </p>
        </div>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-6 mt-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`p-4 rounded-xl border-2 ${action.color} hover:scale-[1.02] transition-all text-left group`}
              >
                <action.icon className="w-6 h-6 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm mb-1">{action.label}</h3>
                <p className="text-xs opacity-70">{action.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Suggestions Carousel */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="px-6 mt-6"
      >
        <div className="max-w-7xl mx-auto">
          <Suggestions
            suggestions={suggestions}
            onAction={handleSuggestionAction}
            onDismiss={() => {}}
          />
        </div>
      </motion.section>

      {/* Active Research */}
      <AnimatePresence>
        {jobs.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6 mt-6"
          >
            <div className="max-w-7xl mx-auto">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Active Research
              </h2>
              <ResearchCards
                jobs={jobs}
                onJobClick={(job) => console.log('Clicked job', job.id)}
                onDismissJob={(jobId) => setJobs((prev) => prev.filter((j) => j.id !== jobId))}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Research Cards empty-state prompt */}
      {jobs.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-6 mt-6"
        >
          <div className="max-w-7xl mx-auto">
            <div className="p-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Use the command bar above to start a research query
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Try: "Find me CMOs at fintechs Series B+"
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Recent Prospects */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-6 mt-6 pb-12"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Recent Prospects
            </h2>
            <button className="text-sm text-[#de347f] hover:text-[#e958a1] transition-colors">
              View All →
            </button>
          </div>

          <ProspectStream
            prospects={prospects}
            onStartOutreach={handleStartOutreach}
            onViewSignals={handleViewSignals}
          />
        </div>
      </motion.section>
    </div>
  );
}
