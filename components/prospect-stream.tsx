'use client';

/**
 * Prospect Stream
 * Card-based infinite scroll (not tables)
 * Swipeable on mobile
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Prospect, ProspectSignal } from '@/types';

interface ProspectStreamProps {
  prospects: Prospect[];
  onStartOutreach: (prospect: Prospect) => void;
  onViewSignals: (prospect: Prospect) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

interface ProspectCardProps {
  prospect: Prospect;
  onStartOutreach: () => void;
  onViewSignals: () => void;
}

const SIGNAL_ICONS: Record<ProspectSignal['type'], string> = {
  hiring: '📈',
  funding: '💰',
  growth: '📈',
  expansion: '🚀',
  tech_stack: '⚡',
  intent: '🎯',
  engagement: '👋',
  news: '📰',
};

const SIGNAL_COLORS: Record<ProspectSignal['strength'], string> = {
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};

const SIGNAL_COLOR_BG: Record<ProspectSignal['type'], string> = {
  hiring: 'bg-amber-50 text-amber-700 border-amber-200',
  funding: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  growth: 'bg-amber-50 text-amber-700 border-amber-200',
  expansion: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  tech_stack: 'bg-blue-50 text-blue-700 border-blue-200',
  intent: 'bg-purple-50 text-purple-700 border-purple-200',
  engagement: 'bg-pink-50 text-pink-700 border-pink-200',
  news: 'bg-slate-100 text-slate-600 border-slate-200',
};

function ProspectCard({ prospect, onStartOutreach, onViewSignals }: ProspectCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const background = useTransform(
    x,
    [-200, 0, 200],
    ['rgba(239, 68, 68, 0.05)', 'rgba(0, 0, 0, 0)', 'rgba(34, 197, 94, 0.05)']
  );

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      onStartOutreach();
    }
  };

  const gradeColor = {
    'A+': 'bg-emerald-500 text-white',
    'A': 'bg-emerald-400 text-white',
    'B+': 'bg-blue-500 text-white',
    'B': 'bg-blue-400 text-white',
    'C': 'bg-slate-400 text-white',
    'D': 'bg-slate-500 text-white',
  }[prospect.scoreGrade];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <motion.div
      style={{ x, opacity, background }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative cursor-grab active:cursor-grabbing"
    >
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500">
              {prospect.photoUrl ? (
                <img
                  src={prospect.photoUrl}
                  alt={prospect.name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                getInitials(prospect.name)
              )}
            </div>
            <div className={`
              absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white
              ${gradeColor}
            `}>
              {prospect.scoreGrade}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {prospect.name}
                </h3>
                <p className="text-slate-500 text-sm">
                  {prospect.title}
                </p>
                <p className="text-[#de347f] text-sm font-medium">
                  @ {prospect.company}
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">
                  {prospect.score}
                </div>
                <div className="text-xs text-slate-400">
                  {prospect.confidence}% match
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
              {prospect.location && (
                <span className="flex items-center gap-1">
                  📍 {prospect.location}
                </span>
              )}
              {prospect.companySize && (
                <span className="flex items-center gap-1">
                  👥 {prospect.companySize}
                </span>
              )}
              {prospect.industry && (
                <span className="flex items-center gap-1">
                  🏢 {prospect.industry}
                </span>
              )}
            </div>
          </div>
        </div>

        {prospect.signals.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-400 mb-2">Buying Signals</div>
            <div className="flex flex-wrap gap-2">
              {prospect.signals.map((signal) => (
                <motion.button
                  key={signal.type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onViewSignals}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer
                    ${SIGNAL_COLORS[signal.strength]}
                  `}
                >
                  <span>{SIGNAL_ICONS[signal.type]}</span>
                  <span>{signal.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartOutreach}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            <span>🎯</span>
            <span>Start Outreach</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewSignals}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            📊 Details
          </motion.button>
        </div>

        <div className="sm:hidden mt-3 flex justify-between text-xs text-slate-400">
          <span>👈 Skip</span>
          <span>Swipe</span>
          <span>Outreach 👉</span>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <span className="text-4xl">🔍</span>
      </div>
      <h3 className="text-lg font-medium text-slate-700">No prospects yet</h3>
      <p className="text-slate-400 mt-1 max-w-sm">
        Try searching with natural language like "Find CMOs at fintechs in NYC"
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-slate-200 bg-white"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-1/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProspectStream({
  prospects,
  onStartOutreach,
  onViewSignals,
  onLoadMore,
  hasMore,
  isLoading,
}: ProspectStreamProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore?.();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    });
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  if (isLoading && prospects.length === 0) {
    return <LoadingSkeleton />;
  }

  if (!isLoading && prospects.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {prospects.map((prospect) => (
          <ProspectCard
            key={prospect.id}
            prospect={prospect}
            onStartOutreach={() => onStartOutreach(prospect)}
            onViewSignals={() => onViewSignals(prospect)}
          />
        ))}
      </AnimatePresence>

      {(hasMore || isLoading) && (
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-[#de347f]/30 border-t-[#de347f] rounded-full animate-spin" />
          ) : (
            <span className="text-sm text-slate-400">Scroll for more</span>
          )}
        </div>
      )}
    </div>
  );
}
