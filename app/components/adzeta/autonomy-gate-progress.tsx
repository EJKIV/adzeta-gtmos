'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAutonomyGates } from '@/app/hooks/use-adzeta';

const STATUS_STYLES: Record<string, string> = {
  unlocked: 'border-emerald-400 bg-emerald-50/50',
  locked: 'border-muted',
  active: 'border-brand-400 bg-brand-50/50',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  unlocked: { label: 'Unlocked', className: 'bg-emerald-100 text-emerald-800' },
  locked: { label: 'Locked', className: 'bg-slate-100 text-slate-800' },
  active: { label: 'Active', className: 'bg-blue-100 text-blue-800' },
};

export function AutonomyGateProgress() {
  const { data: gates, isLoading, toggleGate } = useAutonomyGates();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Autonomy Gates</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autonomy Gates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gates.map((gate) => {
            const status = gate.current_status ?? 'locked';
            const badge = STATUS_BADGES[status] ?? STATUS_BADGES.locked;
            return (
              <Card
                key={gate.gate_id}
                className={`border-2 ${STATUS_STYLES[status] ?? STATUS_STYLES.locked}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{gate.gate_name}</h3>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Runs</span>
                        <span>{gate.runs_count} / {gate.min_historical_runs}</span>
                      </div>
                      <Progress value={gate.progress.runs_progress * 100} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Success Rate</span>
                        <span>
                          {(gate.progress.success_rate * 100).toFixed(0)}% / {(gate.min_success_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, (gate.progress.success_rate / gate.min_success_rate) * 100)}
                        className="h-2"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Confidence</span>
                        <span>
                          {gate.avg_confidence != null ? (gate.avg_confidence * 100).toFixed(0) : '—'}% / {(gate.min_confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={gate.progress.confidence_progress * 100} className="h-2" />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={status === 'unlocked' ? 'destructive' : 'default'}
                    className="w-full"
                    onClick={() =>
                      toggleGate(gate.gate_id, status === 'unlocked' ? 'lock' : 'unlock')
                    }
                  >
                    {status === 'unlocked' ? 'Lock' : 'Unlock'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
