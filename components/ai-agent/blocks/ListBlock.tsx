'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListBlock as ListBlockType } from '@/types/ai-agent';

interface ListBlockProps extends ListBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

const statusIcons = {
  pending: <Circle className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />,
  in_progress: <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-info)' }} />,
  completed: <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />,
  error: <XCircle className="w-4 h-4" style={{ color: 'var(--color-error)' }} />,
};

export function ListBlock({ style, title, items, onSkillInvoke }: ListBlockProps) {
  const ListTag = style === 'numbered' ? 'ol' : 'ul';

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
      )}
      <ListTag className={cn(style === 'numbered' ? 'list-decimal' : style === 'bullet' ? 'list-disc' : '', 'space-y-2', style !== 'checklist' && 'pl-5')}>
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'text-sm',
              style === 'checklist' && 'flex items-start gap-2 list-none'
            )}
          >
            {style === 'checklist' && item.status && statusIcons[item.status]}
            <div className="flex-1">
              <span style={{ color: 'var(--color-text-primary)' }}>{item.text}</span>
              {item.subtext && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {item.subtext}
                </p>
              )}
            </div>
            {item.action && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-2"
                onClick={() => onSkillInvoke(item.action!.skillId, item.action!.params)}
              >
                {item.action.label}
              </Button>
            )}
          </li>
        ))}
      </ListTag>
    </div>
  );
}
