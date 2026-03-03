'use client';

import * as LucideIcons from 'lucide-react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CardBlock as CardBlockType } from '@/types/ai-agent';
import type { LucideIcon } from 'lucide-react';

interface CardBlockProps extends CardBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

function resolveIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || null;
}

export function CardBlock({ layout, cards, onSkillInvoke }: CardBlockProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        layout === 'grid' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        layout === 'row' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      {cards.map((card) => {
        const TrendIcon =
          card.trend?.direction === 'up'
            ? TrendingUp
            : card.trend?.direction === 'down'
            ? TrendingDown
            : ArrowRight;

        const trendColor =
          card.trend?.direction === 'up'
            ? 'var(--color-success)'
            : card.trend?.direction === 'down'
            ? 'var(--color-error)'
            : 'var(--color-text-muted)';

        const Icon = resolveIcon(card.icon);

        return (
          <Card
            key={card.id}
            className={cn(
              'transition-shadow hover:shadow-md',
              card.action && 'cursor-pointer',
              card.variant === 'success' && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
              card.variant === 'warning' && 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
              card.variant === 'error' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
              card.variant === 'info' && 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
            )}
            onClick={() =>
              card.action && onSkillInvoke(card.action.skillId, card.action.params)
            }
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {card.title}
              </CardTitle>
              {Icon && (
                <Icon className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {card.value}
              </div>
              {card.subtitle && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {card.subtitle}
                </p>
              )}
              {card.trend && (
                <div className="flex items-center gap-1 mt-2" style={{ color: trendColor }}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="text-xs font-medium">{card.trend.value}</span>
                  {card.trend.period && (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {card.trend.period}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
