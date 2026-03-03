'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FormBlock } from './FormBlock';
import type { DecisionBlock as DecisionBlockType } from '@/types/ai-agent';

interface DecisionBlockProps extends DecisionBlockType {
  onSkillInvoke: (skillId: string, params: Record<string, unknown>) => Promise<void>;
}

export function DecisionBlock({
  title,
  description,
  impact,
  options,
  onSkillInvoke,
}: DecisionBlockProps) {
  const [state, setState] = useState<'pending' | 'approved' | 'rejected' | 'postponed' | 'showFeedback'>('pending');
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onSkillInvoke(options.approve.skillId, options.approve.params);
      setState('approved');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    if (options.reject.feedbackForm) {
      setState('showFeedback');
    } else {
      setState('rejected');
    }
  };

  const handlePostpone = () => {
    setState('postponed');
  };

  if (state === 'approved') {
    return (
      <Card className="border-green-200 dark:border-green-900">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
            Approved: {title}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state === 'rejected') {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
            Rejected: {title}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state === 'showFeedback' && options.reject.feedbackForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Why are you rejecting this?</CardTitle>
        </CardHeader>
        <CardContent>
          <FormBlock {...options.reject.feedbackForm} onSkillInvoke={onSkillInvoke} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[var(--color-warning)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
          <CardTitle className="text-base" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </CardTitle>
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Impact summary */}
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Impact: {impact.summary}
          </p>

          {impact.details && impact.details.length > 0 && (
            <ul className="list-disc list-inside space-y-1">
              {impact.details.map((detail, i) => (
                <li key={i} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Affected resources */}
        {impact.affectedResources && impact.affectedResources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              Affected Resources
            </p>
            {impact.affectedResources.map((resource, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {resource.name}
                </span>
                <span style={{ color: 'var(--color-text-muted)' }}>({resource.type})</span>
                <span style={{ color: 'var(--color-error)' }}>{resource.currentValue}</span>
                <ArrowRight className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ color: 'var(--color-success)' }}>{resource.newValue}</span>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Processing...' : options.approve.label}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
          >
            {options.reject.label}
          </Button>
          {options.postpone && (
            <Button
              variant="outline"
              onClick={handlePostpone}
            >
              {options.postpone.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
