'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ClarificationAction {
  id: string;
  type: 'button' | 'choice' | 'confirm' | 'text';
  label: string;
  description?: string;
  command?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: unknown; description?: string }>;
  provides?: {
    key: string;
    value?: unknown;
  };
  confidenceDelta?: number;
}

interface ActionButtonsProps {
  actions: ClarificationAction[];
  onAction: (action: ClarificationAction, textInput?: string) => void;
  className?: string;
}

/**
 * Dynamic Action Buttons for Clarification
 * 
 * NOT a form - just buttons, choices, or single text input per interaction.
 * Keeps probing until confidence threshold reached.
 * 
 * Usage:
 * <ActionButtons 
 *   actions={blocks.find(b => b.type === 'action')?.actions || []}
 *   onAction={(action, text) => continueClarification(action.provides)}
 * />
 */
export function ActionButtons({ actions, onAction, className }: ActionButtonsProps) {
  const [textValue, setTextValue] = useState('');
  const [activeTextAction, setActiveTextAction] = useState<string | null>(null);

  // Separate actions by type
  const buttonActions = actions.filter(a => a.type === 'button' || a.type === 'confirm');
  const choiceActions = actions.filter(a => a.type === 'choice' && a.options);
  const textActions = actions.filter(a => a.type === 'text');

  const handleButtonClick = (action: ClarificationAction) => {
    onAction(action);
  };

  const handleChoiceSelect = (action: ClarificationAction, option: { label: string; value: unknown }) => {
    onAction({
      ...action,
      provides: { key: action.provides?.key || '', value: option.value },
    });
  };

  const handleTextSubmit = (action: ClarificationAction) => {
    if (textValue.trim()) {
      onAction({
        ...action,
        provides: { key: action.provides?.key || '', value: textValue.trim() },
      });
      setTextValue('');
      setActiveTextAction(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Primary Button Actions */}
      {buttonActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {buttonActions.map((action) => (
            <Button
              key={action.id}
              onClick={() => handleButtonClick(action)}
              variant={action.type === 'confirm' ? 'default' : 'outline'}
              size="sm"
              className="h-auto py-2 px-4 text-left justify-start"
              title={action.description}
            >
              <span className="font-medium">{action.label}</span>
              {action.description && (
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {action.description}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Choice Options (as quick-select chips) */}
      {choiceActions.map((action) => (
        <div key={action.id} className="space-y-2">
          {action.label !== 'Options' && (
            <p className="text-sm text-muted-foreground">{action.label}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {action.options?.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => handleChoiceSelect(action, option)}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm
                  bg-secondary hover:bg-secondary/80 transition-colors
                  border border-transparent hover:border-border
                  text-secondary-foreground"
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Input Actions */}
      {textActions.length > 0 && (
        <div className="space-y-3">
          {textActions.map((action) => (
            <div key={action.id} className="space-y-2">
              {!activeTextAction || activeTextAction === action.id ? (
                <>
                  {action.label !== 'Other' && action.label !== 'Text' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTextAction(action.id)}
                      className="text-muted-foreground"
                    >
                      {action.label}
                    </Button>
                  )}
                  {activeTextAction === action.id && (
                    <div className="flex gap-2">
                      <Input
                        placeholder={action.placeholder || 'Type here...'}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTextSubmit(action);
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleTextSubmit(action)}
                        disabled={!textValue.trim()}
                      >
                        Submit
                      </Button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Inline Action Button Row
 * Compact version for inline use within messages
 */
export function InlineActionButtons({ 
  actions, 
  onAction,
  className 
}: ActionButtonsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 mt-3", className)}>
      {actions.map((action) => (
        <Button
          key={action.id}
          onClick={() => onAction(action)}
          variant="secondary"
          size="sm"
          className="text-xs h-7"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export default ActionButtons;
