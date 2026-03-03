'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useProactiveSuggestions } from '@/app/hooks/use-adzeta';
import type { Urgency } from '@/types/adzeta';

const URGENCY_STYLES: Record<Urgency, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-slate-100 text-slate-600',
};

const TRIGGER_LABELS: Record<string, string> = {
  metric_anomaly: 'Metric Anomaly',
  opportunity_detected: 'Opportunity',
  trend_change: 'Trend Change',
  scheduled_check: 'Scheduled',
  idle_prompt: 'Idle Prompt',
};

export function ProactiveSuggestionsPanel() {
  const { data: suggestions, isLoading, acceptSuggestion, dismissSuggestion } = useProactiveSuggestions();
  const [dismissId, setDismissId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Suggestions</CardTitle></CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Suggestions</CardTitle>
        {suggestions.length > 0 && (
          <Badge variant="secondary">{suggestions.length}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
            <Lightbulb className="h-7 w-7 mb-1" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm font-medium text-foreground">No suggestions yet</p>
            <p className="text-xs max-w-[220px]">
              Proactive insights from anomalies, trends, and opportunities will surface here.
            </p>
          </div>
        ) : (
          suggestions.map((s) => (
            <Card key={s.suggestion_id} className="border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={URGENCY_STYLES[s.urgency]}>{s.urgency}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {TRIGGER_LABELS[s.trigger_type] ?? s.trigger_type}
                  </span>
                  {s.confidence != null && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Math.round(s.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm">{s.title}</p>
                {s.description && (
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptSuggestion(s.suggestion_id)}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDismissId(s.suggestion_id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Dialog open={dismissId !== null} onOpenChange={() => setDismissId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dismiss Suggestion</DialogTitle>
            </DialogHeader>
            <Textarea
              placeholder="Reason for dismissing (optional)..."
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissId(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (dismissId) dismissSuggestion(dismissId, dismissReason || undefined);
                  setDismissId(null);
                  setDismissReason('');
                }}
              >
                Dismiss
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
