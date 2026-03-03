'use client';

import { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronUp, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CodeBlock as CodeBlockType } from '@/types/ai-agent';

const MAX_LINES = 20;

export function CodeBlock({ language, code, filename, output, exitCode, actions }: CodeBlockType) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lines = code.split('\n');
  const isLong = lines.length > MAX_LINES;
  const displayCode = isLong && !expanded ? lines.slice(0, MAX_LINES).join('\n') : code;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = (action: 'copy' | 'download' | 'execute') => {
    if (action === 'copy') {
      handleCopy();
    } else if (action === 'download') {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `code.${language}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const actionIcons = {
    copy: copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />,
    download: <Download className="w-3 h-3" />,
    execute: <Play className="w-3 h-3" />,
  };

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 text-xs"
        style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
      >
        <span>{filename || language}</span>
        <div className="flex items-center gap-1">
          {actions ? (
            actions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => handleAction(action.action)}
              >
                {actionIcons[action.action]}
                {action.label}
              </Button>
            ))
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
        </div>
      </div>

      {/* Code */}
      <pre className="p-3 text-sm overflow-x-auto" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <code>{displayCode}</code>
      </pre>

      {/* Expand/Collapse */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}

      {/* Output */}
      {output && (
        <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
            Output {exitCode !== undefined && (
              <span className={cn(exitCode === 0 ? 'text-green-600' : 'text-red-600')}>
                (exit {exitCode})
              </span>
            )}
          </div>
          <pre className="p-3 text-xs overflow-x-auto font-mono" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)' }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
