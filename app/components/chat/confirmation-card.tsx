'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, XCircle, Eye, ArrowRight, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GateAlternative {
  id: string;
  label: string;
  description: string;
  action: string;
}

export interface ApprovalActions {
  approve: { label: string; command: string };
  reject: { label: string; command: string };
}

interface ConfirmationCardProps {
  action: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  message: string;
  progress?: number;
  approvalActions?: ApprovalActions;
  gateAlternatives?: GateAlternative[];
  gateStatus?: {
    gateId: string;
    gateName: string;
    locked: boolean;
    requiredRuns: number;
    currentRuns: number;
    requiredSuccessRate: number;
    currentSuccessRate: number;
  };
  onAction?: (action: string, command?: string) => void;
  className?: string;
}

/**
 * Confirmation Card with Gate Alternatives
 * 
 * Shows:
 * - Standard approval/reject buttons
 * - Gate alternatives when gate locked (queue, preview, reduce scope)
 * - Progress indicator
 * 
 * Usage:
 * <ConfirmationCard
 *   action="create_sequence"
 *   status="pending"
 *   message="Gate 3 is locked - approval required"
 *   approvalActions={{ approve: {...}, reject: {...} }}
 *   gateAlternatives={[...]}
 *   onAction={(action) => handleAlternative(action)}
 * />
 */
export function ConfirmationCard({
  action,
  status,
  message,
  progress,
  approvalActions,
  gateAlternatives,
  gateStatus,
  onAction,
  className,
}: ConfirmationCardProps) {
  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    executing: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  };

  const StatusIcon = statusConfig[status].icon;

  const handleApprove = () => {
    onAction?.('approve', approvalActions?.approve.command);
  };

  const handleReject = () => {
    onAction?.('reject', approvalActions?.reject.command);
  };

  const handleAlternative = (alt: GateAlternative) => {
    onAction?.(alt.action, alt.action);
  };

  return (
    <Card className={cn("border-l-4", className)} style={{ borderLeftColor: status === 'pending' ? '#fbbf24' : status === 'completed' ? '#22c55e' : '#3b82f6' }}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", statusConfig[status].bg)}>
            <StatusIcon className={cn("h-5 w-5", statusConfig[status].color)} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-medium">
              {status === 'pending' && gateStatus?.locked && '⚠️ Action Requires Approval'}
              {status === 'pending' && !gateStatus?.locked && '⏳ Awaiting Confirmation'}
              {status === 'executing' && '🔄 Executing...'}
              {status === 'completed' && '✅ Completed'}
              {status === 'failed' && '❌ Failed'}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {message}
            </CardDescription>
          </div>
          <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
            {status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress bar for executing */}
        {status === 'executing' && progress !== undefined && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
          </div>
        )}

        {/* Gate status info */}
        {gateStatus && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{gateStatus.gateName}</span>
              <Badge variant={gateStatus.locked ? 'destructive' : 'default'}>
                {gateStatus.locked ? '🔒 Locked' : '🔓 Unlocked'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                Runs: {gateStatus.currentRuns} / {gateStatus.requiredRuns}
              </div>
              <div>
                Success rate: {(gateStatus.currentSuccessRate * 100).toFixed(0)}% / {(gateStatus.requiredSuccessRate * 100).toFixed(0)}%
              </div>
            </div>
            
            {gateStatus.locked && (
              <p className="text-xs text-muted-foreground">
                Need {gateStatus.requiredRuns - gateStatus.currentRuns} more successful runs to unlock
              </p>
            )}
          </div>
        )}

        {/* Gate alternatives - NEW */}
        {gateAlternatives && gateAlternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Alternatives:</p>
            <div className="grid gap-2">
              {gateAlternatives.map((alt) => (
                <Button
                  key={alt.id}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left"
                  onClick={() => handleAlternative(alt)}
                >
                  <div className="flex items-start gap-3">
                    {alt.action === 'preview_action' && <Eye className="h-4 w-4 mt-0.5 text-blue-500" />}
                    {alt.action === 'reduce_scope' && <Scissors className="h-4 w-4 mt-0.5 text-orange-500" />}
                    {alt.action === 'send_test_batch' && <ArrowRight className="h-4 w-4 mt-0.5 text-green-500" />}
                    {(alt.action === 'queue_for_approval' || alt.action === 'request_gate_unlock') && <Clock className="h-4 w-4 mt-0.5 text-yellow-500" />}
                    
                    <div className="flex-1">
                      <span className="font-medium block">{alt.label}</span>
                      <span className="text-xs text-muted-foreground">{alt.description}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Standard approval buttons */}
        {approvalActions && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={handleApprove}
              className="flex-1"
              disabled={status === 'executing'}
            >
              {approvalActions.approve.label}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReject}
              disabled={status === 'executing'}
            >
              {approvalActions.reject.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConfirmationCard;
