'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BlockerPanelProps {
  blockedReason: string | null;
  unblockConditions: string | null;
  requiresTools: string[];
  missingTools: string[];
}

export function BlockerPanel({ blockedReason, unblockConditions, requiresTools, missingTools }: BlockerPanelProps) {
  const hasBlockers = blockedReason || missingTools.length > 0;

  if (!hasBlockers) return null;

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-sm font-semibold">Blocked</span>
          {blockedReason && (
            <span className="text-sm text-muted-foreground">— {blockedReason}</span>
          )}
        </div>

        {requiresTools.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              Required Tools
            </p>
            <div className="space-y-1">
              {requiresTools.map((tool) => {
                const isMissing = missingTools.includes(tool);
                return (
                  <div key={tool} className="flex items-center gap-2 text-sm">
                    <span>{isMissing ? '\u26D4' : '\u2705'}</span>
                    <span className={isMissing ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                      {tool}
                    </span>
                    {isMissing && (
                      <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                        Not provided
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {unblockConditions && (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              What I need
            </p>
            <p className="text-sm whitespace-pre-line">{unblockConditions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
