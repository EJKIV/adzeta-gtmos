'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RecommendationBlock as RecommendationBlockType } from '@/types/ai-agent';

interface RecommendationBlockProps extends RecommendationBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
  onDismiss: (actionId: string, params: Record<string, unknown>) => void;
}

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-900' },
  high: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-900' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-900' },
  low: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900' },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: ArrowRight,
};

export function RecommendationBlock({
  title,
  description,
  recommendations,
  onSkillInvoke,
  onDismiss,
}: RecommendationBlockProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleRecs = recommendations.filter((r) => !dismissed.has(r.id));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    onDismiss('dismiss_recommendation', { recommendationId: id });
  };

  if (visibleRecs.length === 0) return null;

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h4>}
      {description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>}

      <div className="space-y-3">
        {visibleRecs.map((rec) => {
          const colors = priorityColors[rec.priority] || priorityColors.low;

          return (
            <Card key={rec.id} className={cn('relative', colors.border)}>
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {rec.title}
                      </h5>
                      <Badge variant="secondary" className={cn('text-xs', colors.text, colors.bg)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {rec.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {rec.confidenceScore}% confidence
                    </Badge>
                    {rec.dismissable && (
                      <button
                        onClick={() => handleDismiss(rec.id)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Evidence */}
                {rec.evidence && rec.evidence.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {rec.evidence.map((ev, i) => {
                      const TrendIcon = ev.trend ? trendIcons[ev.trend] : null;
                      return (
                        <div key={i} className="text-xs">
                          <span style={{ color: 'var(--color-text-muted)' }}>{ev.label}: </span>
                          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {ev.value}
                          </span>
                          {TrendIcon && (
                            <TrendIcon className="w-3 h-3 inline ml-1" style={{
                              color: ev.trend === 'up' ? 'var(--color-success)' : ev.trend === 'down' ? 'var(--color-error)' : 'var(--color-text-muted)',
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action */}
                <Button
                  size="sm"
                  onClick={() => onSkillInvoke(rec.action.skillId, rec.action.params)}
                >
                  {rec.action.label}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
