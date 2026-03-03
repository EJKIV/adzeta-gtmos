'use client';

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ErrorBlock as ErrorBlockType } from '@/types/ai-agent';

interface ErrorBlockProps extends ErrorBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => void;
}

export function ErrorBlock({
  message,
  code,
  details,
  suggestions,
  retryable,
  retrySkillId,
  retryParams,
  onSkillInvoke,
}: ErrorBlockProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="rounded-lg border-l-4 p-4 space-y-3"
      style={{
        borderLeftColor: 'var(--color-error)',
        backgroundColor: 'var(--color-error-bg)',
      }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-error)' }} />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
            {message}
          </p>
          {code && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Error code: {code}
            </p>
          )}
        </div>
      </div>

      {details && (
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {showDetails && (
            <pre className="mt-2 text-xs p-2 rounded overflow-auto" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
              {details}
            </pre>
          )}
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Suggestions:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {retryable && retrySkillId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSkillInvoke(retrySkillId, retryParams || {})}
          className="gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          Try Again
        </Button>
      )}
    </div>
  );
}
