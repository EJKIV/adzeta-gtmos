'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ButtonBlock as ButtonBlockType, Block } from '@/types/ai-agent';
import type { LucideIcon } from 'lucide-react';

interface ButtonBlockProps extends ButtonBlockType {
  onAction: (actionId: string, params: Record<string, unknown>) => Promise<void>;
}

function resolveIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || null;
}

const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'> = {
  default: 'default',
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
  ghost: 'ghost',
};

export function ButtonBlock({ message, buttons, onAction }: ButtonBlockProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  const handleClick = async (btn: ButtonBlockType['buttons'][0]) => {
    const { action } = btn;

    switch (action.type) {
      case 'url':
        if (action.url) window.open(action.url, '_blank', 'noopener,noreferrer');
        return;

      case 'confirm':
        if (action.confirmText && !window.confirm(action.confirmText)) return;
        if (action.skillId) {
          setLoadingId(btn.id);
          try {
            await onAction(btn.id, { skillId: action.skillId, ...action.params });
          } finally {
            setLoadingId(null);
            setDisabledIds((prev) => new Set(prev).add(btn.id));
          }
        }
        return;

      case 'skill':
        setLoadingId(btn.id);
        try {
          await onAction(btn.id, { skillId: action.skillId, ...action.params });
        } finally {
          setLoadingId(null);
          setDisabledIds((prev) => new Set(prev).add(btn.id));
        }
        return;

      case 'modal':
        // Modal handling would be managed by a parent context
        await onAction(btn.id, { type: 'modal', modalContent: action.modalContent });
        return;
    }
  };

  return (
    <div className="space-y-2">
      {message && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {buttons.map((btn) => {
          const Icon = resolveIcon(btn.icon);
          const isLoading = loadingId === btn.id;
          const isDisabled = disabledIds.has(btn.id) || isLoading;

          return (
            <Button
              key={btn.id}
              variant={variantMap[btn.variant || 'default']}
              disabled={isDisabled}
              onClick={() => handleClick(btn)}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                Icon && <Icon className="w-4 h-4" />
              )}
              {btn.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
