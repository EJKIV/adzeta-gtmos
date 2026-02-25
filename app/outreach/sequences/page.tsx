'use client';

/**
 * Sequences Page
 * Uses SequenceVisualizer component from @/components
 */

import { motion } from 'framer-motion';
import { GitBranch, Plus } from 'lucide-react';
import { SequenceVisualizer } from '@/components';
import type { Sequence } from '@/types';

const sequences: Sequence[] = [
  {
    id: '1',
    name: 'Series B SaaS Outreach',
    status: 'active',
    touches: [
      {
        id: 't1',
        day: 1,
        type: 'email',
        order: 1,
        variantA: {
          subject: 'Congrats on the Series B, {{company}}',
          body: 'Hi {{firstName}}, I noticed your recent funding round...',
          personalizedFields: ['firstName', 'company'],
        },
        variantB: {
          subject: 'Quick question about {{company}} growth',
          body: 'Hi {{firstName}}, your company has been growing fast...',
          personalizedFields: ['firstName', 'company'],
        },
        autoSend: true,
        condition: 'always',
      },
      {
        id: 't2',
        day: 3,
        type: 'email',
        order: 2,
        variantA: {
          subject: 'Re: Congrats on the Series B',
          body: 'Just following up on my previous note...',
          personalizedFields: ['firstName'],
        },
        autoSend: false,
        condition: 'not_opened',
      },
      {
        id: 't3',
        day: 7,
        type: 'linkedin',
        order: 3,
        autoSend: false,
        condition: 'not_opened',
      },
      {
        id: 't4',
        day: 10,
        type: 'email',
        order: 4,
        variantA: {
          subject: 'One more thing — {{company}}',
          body: 'Hi {{firstName}}, I wanted to share a case study...',
          personalizedFields: ['firstName', 'company'],
        },
        autoSend: false,
        condition: 'not_opened',
      },
      {
        id: 't5',
        day: 14,
        type: 'call',
        order: 5,
        autoSend: false,
        condition: 'not_opened',
      },
    ],
    variants: [
      {
        id: 'a',
        name: 'A',
        split: 50,
        isWinning: true,
        metrics: { sent: 150, opened: 120, clicked: 35, replied: 22, booked: 6, openRate: 80, replyRate: 15 },
      },
      {
        id: 'b',
        name: 'B',
        split: 50,
        isWinning: false,
        metrics: { sent: 150, opened: 105, clicked: 25, replied: 15, booked: 3, openRate: 70, replyRate: 10 },
      },
    ],
    prospects: ['1', '2', '3'],
    metrics: { sent: 300, opened: 225, clicked: 60, replied: 37, booked: 9, unsubscribed: 4, openRate: 75, replyRate: 12, bookRate: 3 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'CMO Value Prop',
    status: 'active',
    touches: [
      {
        id: 't1',
        day: 1,
        type: 'email',
        order: 1,
        variantA: {
          subject: 'Marketing leaders like you are switching to...',
          body: 'Hi {{firstName}}, other CMOs at {{industry}} companies...',
          personalizedFields: ['firstName', 'industry'],
        },
        variantB: {
          subject: 'How {{company}} could 3x pipeline',
          body: 'Hi {{firstName}}, companies similar to {{company}}...',
          personalizedFields: ['firstName', 'company'],
        },
        autoSend: true,
        condition: 'always',
      },
      {
        id: 't2',
        day: 4,
        type: 'email',
        order: 2,
        autoSend: false,
        condition: 'not_opened',
      },
      {
        id: 't3',
        day: 8,
        type: 'email',
        order: 3,
        autoSend: false,
        condition: 'not_opened',
      },
    ],
    variants: [
      {
        id: 'a',
        name: 'A',
        split: 70,
        isWinning: true,
        metrics: { sent: 70, opened: 60, clicked: 20, replied: 12, booked: 4, openRate: 86, replyRate: 17 },
      },
      {
        id: 'b',
        name: 'B',
        split: 30,
        isWinning: false,
        metrics: { sent: 30, opened: 22, clicked: 5, replied: 3, booked: 0, openRate: 73, replyRate: 10 },
      },
    ],
    prospects: ['4', '5'],
    metrics: { sent: 100, opened: 82, clicked: 25, replied: 15, booked: 4, unsubscribed: 1, openRate: 82, replyRate: 15, bookRate: 4 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function SequencesPage() {
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[#8f76f5]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Sequences</h1>
                <p className="text-slate-500">Build multi-touch sequences with A/B testing</p>
              </div>
            </div>

            <button className="px-4 py-2 bg-gradient-to-r from-[#de347f] to-[#8f76f5] hover:shadow-glow-magenta text-white rounded-lg font-medium transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Sequence
            </button>
          </div>
        </div>
      </motion.div>

      {/* Sequences List - using SequenceVisualizer component */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-6 mt-6 pb-12"
      >
        <div className="max-w-7xl mx-auto space-y-4">
          {sequences.map((sequence) => (
            <SequenceVisualizer key={sequence.id} sequence={sequence} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
