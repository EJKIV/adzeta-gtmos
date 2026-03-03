'use client';

import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SelectorBlock as SelectorBlockType } from '@/types/ai-agent';
import type { LucideIcon } from 'lucide-react';

interface SelectorBlockProps extends SelectorBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

function resolveIcon(iconName?: string): LucideIcon | null {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || null;
}

export function SelectorBlock({
  title,
  description,
  options,
  layout,
  selectSkillId,
  onSkillInvoke,
}: SelectorBlockProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (optionId: string) => {
    setSelected(optionId);
    const option = options.find((o) => o.id === optionId);
    onSkillInvoke(selectSkillId, {
      selectedId: optionId,
      metadata: option?.metadata,
    });
  };

  if (layout === 'dropdown') {
    return (
      <div className="space-y-2">
        {title && <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h4>}
        {description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>}
        <Select value={selected || ''} onValueChange={handleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
                {option.description && (
                  <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>
                    — {option.description}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (layout === 'cards') {
    return (
      <div className="space-y-3">
        {title && <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h4>}
        {description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((option) => {
            const Icon = resolveIcon(option.icon);
            const isSelected = selected === option.id;
            return (
              <Card
                key={option.id}
                className={cn(
                  'cursor-pointer transition-all',
                  isSelected
                    ? 'ring-2 ring-[var(--color-brand-500)] border-[var(--color-brand-500)]'
                    : 'hover:border-[var(--color-border-strong)]'
                )}
                onClick={() => handleSelect(option.id)}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {Icon && <Icon className="w-5 h-5 mt-0.5" style={{ color: 'var(--color-brand-500)' }} />}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                        {option.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // layout === 'list'
  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h4>}
      {description && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>}
      <RadioGroup value={selected || ''} onValueChange={handleSelect}>
        {options.map((option) => (
          <div key={option.id} className="flex items-start space-x-3 py-2">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="cursor-pointer">
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                  {option.description}
                </p>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
