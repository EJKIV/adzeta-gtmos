'use client';

import { useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2, Edit3, Shield, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/hooks/use-toast';
import { useApprovalStatus, type ApprovalStatus as RemoteStatus } from '@/hooks/use-approval-status';

export type ApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approving' | 'rejecting' | 'modifying' | 'approved' | 'rejected' | 'modified' | 'error' | 'completed';

export interface ApprovalCardData {
  taskId: string;
  title: string;
  description?: string;
  confidence: number; // 0-1
  riskLevel: ApprovalRiskLevel;
  metadata?: Record<string, unknown>;
}

interface ApprovalCardProps {
  data: ApprovalCardData;
  onApproved?: (taskId: string) => void;
  onRejected?: (taskId: string) => void;
  onModify?: (taskId: string) => void;
  /** If true, auto-dismiss after showing success state for a brief period */
  autoDismiss?: boolean;
  /** Delay in ms before calling onDismiss callback after completion */
  dismissDelay?: number;
  className?: string;
}

interface ApprovalResponse {
  status: 'approved' | 'rejected' | 'modified';
  taskId: string;
}

/**
 * ApprovalCard - Inline approval card with real-time status polling
 * 
 * Displays task details with confidence score and risk level,
 * allowing users to approve, reject, or modify tasks inline.
 * 
 * Features:
 * - Real-time status polling via useApprovalStatus hook
 * - Updates UI within <2 seconds of status change
 * - Shows success state briefly before auto-dismissing
 * - Memory-safe cleanup on unmount
 * - SSE fallback if polling fails
 * 
 * @example
 * ```tsx
 * <ApprovalCard
 *   data={{
 *     taskId: 'task-123',
 *     title: 'Create new campaign sequence',
 *     confidence: 0.85,
 *     riskLevel: 'medium',
 *   }}
 *   onApproved={(id) => console.log('Approved:', id)}
 *   autoDismiss
 * />
 * ```
 */
export function ApprovalCard({
  data,
  onApproved,
  onRejected,
  onModify,
  autoDismiss = true,
  dismissDelay = 2000,
  className,
}: ApprovalCardProps) {
  const { taskId, title, description, confidence, riskLevel, metadata } = data;
  const { toast } = useToast();
  
  // Local UI state for immediate feedback during action
  const [localStatus, setLocalStatus] = useState<ApprovalStatus>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dismissTimer, setDismissTimer] = useState<NodeJS.Timeout | null>(null);

  // Real-time status polling via custom hook
  const { 
    status: remoteStatus, 
    isLoading: isPolling, 
    error: pollError,
    timeSinceUpdate,
  } = useApprovalStatus(taskId, {
    pollInterval: 2000, // 2s polling for <2s detection target
    enableSseFallback: true,
    stopOnComplete: true,
  });

  const confidencePercent = Math.round(confidence * 100);

  // Color configurations for risk levels
  const riskConfig = {
    low: {
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      label: 'Low Risk',
    },
    medium: {
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200',
      label: 'Medium Risk',
    },
    high: {
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      label: 'High Risk',
    },
    critical: {
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      label: 'Critical Risk',
    },
  };

  // Confidence badge configuration
  const getConfidenceConfig = (conf: number) => {
    if (conf >= 0.8) return { color: 'bg-green-100 text-green-800 border-green-200', label: 'High Confidence' };
    if (conf >= 0.5) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium Confidence' };
    return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Low Confidence' };
  };

  const risk = riskConfig[riskLevel];
  const confidenceBadge = getConfidenceConfig(confidence);

  // ──────────────────────────────────────────────────────────────────────────
  // Handle remote status changes
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Only process meaningful status changes
    if (remoteStatus === 'loading' || remoteStatus === 'pending') return;

    // Remote status changed to a completed state
    if (['approved', 'rejected', 'modified'].includes(remoteStatus)) {
      // Update local status to match
      setLocalStatus(remoteStatus as ApprovalStatus);
      
      // Show success state
      setShowSuccess(true);

      // Call appropriate callback
      const callbacks: Record<string, ((id: string) => void) | undefined> = {
        approved: onApproved,
        rejected: onRejected,
        modified: onModify,
      };
      
      callbacks[remoteStatus]?.(taskId);

      // Show toast notification
      const actionLabels: Record<string, string> = {
        approved: 'approved',
        rejected: 'rejected',
        modified: 'modified',
      };
      
      toast({
        title: `Task ${actionLabels[remoteStatus] || remoteStatus}`,
        description: `"${title}" has been ${actionLabels[remoteStatus] || remoteStatus}.`,
        variant: remoteStatus === 'rejected' ? 'destructive' : 'default',
      });

      // Auto-dismiss after delay
      if (autoDismiss) {
        const timer = setTimeout(() => {
          setShowSuccess(false);
        }, dismissDelay);
        setDismissTimer(timer);
      }
    }

    // Handle remote errors
    if (remoteStatus === 'error' && pollError) {
      setErrorMessage(pollError);
      toast({
        title: 'Status Update Failed',
        description: pollError,
        variant: 'destructive',
      });
    }
  }, [remoteStatus, pollError, taskId, title, onApproved, onRejected, onModify, toast, autoDismiss, dismissDelay]);

  // Cleanup dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
      }
    };
  }, [dismissTimer]);

  // ──────────────────────────────────────────────────────────────────────────
  // API call handlers
  // ──────────────────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async () => {
    setLocalStatus('approving');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/work-queue/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        // Fallback to PATCH if dedicated endpoint doesn't exist
        const fallbackResponse = await fetch(`/api/work-queue/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'ready',
            metadata: { 
              ...metadata, 
              approval_status: 'approved',
              approved_at: new Date().toISOString(),
            } 
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Failed to approve: ${fallbackResponse.statusText}`);
        }
      }

      const result: ApprovalResponse = await response.json().catch(() => ({ 
        status: 'approved', 
        taskId 
      }));

      // Status will be updated via polling hook - no need to set here
      // The useEffect above will handle the transition

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve task';
      setLocalStatus('error');
      setErrorMessage(message);
      toast({
        title: 'Approval Failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [taskId, title, metadata, toast]);

  const handleReject = useCallback(async () => {
    setLocalStatus('rejecting');
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/work-queue/${taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        // Fallback to PATCH if dedicated endpoint doesn't exist
        const fallbackResponse = await fetch(`/api/work-queue/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'blocked',
            blocked_reason: 'User rejected',
            metadata: { 
              ...metadata, 
              approval_status: 'rejected',
              rejected_at: new Date().toISOString(),
            } 
          }),
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Failed to reject: ${fallbackResponse.statusText}`);
        }
      }

      const result: ApprovalResponse = await response.json().catch(() => ({ 
        status: 'rejected', 
        taskId 
      }));

      // Status will be updated via polling hook

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject task';
      setLocalStatus('error');
      setErrorMessage(message);
      toast({
        title: 'Rejection Failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [taskId, title, metadata, toast]);

  const handleModify = useCallback(async () => {
    setLocalStatus('modifying');
    setErrorMessage(null);

    try {
      // Call modify endpoint to track the intent
      await fetch(`/api/work-queue/${taskId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      }).catch(() => {
        // Silently fail - modify is usually just for tracking
        return { status: 'modified', taskId };
      });

      // Status will be updated via polling hook
      onModify?.(taskId);
    } catch (err) {
      // Modification typically opens a dialog, so errors are less critical
      onModify?.(taskId);
    }
  }, [taskId, metadata, onModify]);

  // Determine current display status
  // Priority: remote status if complete > local status
  const isProcessing = localStatus === 'approving' || localStatus === 'rejecting' || localStatus === 'modifying';
  const isCompleted = showSuccess || remoteStatus === 'approved' || remoteStatus === 'rejected' || remoteStatus === 'modified';
  const isPollingActive = isPolling && !isCompleted && remoteStatus === 'pending';

  // ──────────────────────────────────────────────────────────────────────────
  // Render success state after action
  // ──────────────────────────────────────────────────────────────────────────
  if (showSuccess) {
    const isApproved = remoteStatus === 'approved' || localStatus === 'approved';
    const isRejected = remoteStatus === 'rejected' || localStatus === 'rejected';
    const isModified = remoteStatus === 'modified' || localStatus === 'modified';

    return (
      <Card 
        className={cn(
          "border-l-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
          isApproved && "border-l-green-500 bg-green-50/50",
          isRejected && "border-l-red-500 bg-red-50/50",
          isModified && "border-l-blue-500 bg-blue-50/50",
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isApproved && <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />}
            {isRejected && <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />}
            {isModified && <Edit3 className="h-5 w-5 text-blue-500" aria-hidden="true" />}
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium",
                isApproved && "text-green-700",
                isRejected && "text-red-700",
                isModified && "text-blue-700"
              )}>
                {isApproved && 'Task Approved'}
                {isRejected && 'Task Rejected'}
                {isModified && 'Modification Started'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{title}</p>
              {timeSinceUpdate < 60 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Updated {timeSinceUpdate}s ago
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "border-l-4 overflow-hidden transition-all duration-200",
        "w-full max-w-full sm:max-w-lg",
        "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500",
        isPollingActive && "ring-1 ring-brand-200",
        className
      )}
      style={{ borderLeftColor: riskLevel === 'low' ? '#22c55e' : riskLevel === 'medium' ? '#eab308' : riskLevel === 'high' ? '#f97316' : '#ef4444' }}
      role="article"
      aria-label={`Approval required: ${title}`}
    >
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full shrink-0", risk.bgColor)}>
            <Shield className={cn("h-5 w-5", risk.textColor)} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium leading-tight flex items-center gap-2">
              {title}
              {isPollingActive && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Polling for status updates" />
              )}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1 text-sm line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={cn("shrink-0 text-xs", risk.textColor, risk.bgColor, risk.borderColor)}
          >
            {risk.label}
          </Badge>
        </div>

        {/* Confidence & Risk Metrics */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs", confidenceBadge.color)}
          >
            <Percent className="h-3 w-3 mr-1" aria-hidden="true" />
            {confidencePercent}% Confidence
          </Badge>
          
          {/* Visual confidence bar */}
          <div className="flex items-center gap-2 flex-1 min-w-[100px]">
            <div className="h-1.5 flex-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  confidence >= 0.8 ? "bg-green-500" : 
                  confidence >= 0.5 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${confidencePercent}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Polling status indicator */}
        {isPollingActive && (
          <div 
            className="mb-3 p-2 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden="true" />
            <span>Listening for approval updates...</span>
          </div>
        )}

        {/* Error message */}
        {(localStatus === 'error' || pollError) && (errorMessage || pollError) && (
          <div 
            className="mb-3 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{errorMessage || pollError}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Primary: Accept */}
          <Button
            onClick={handleApprove}
            disabled={isProcessing}
            className="flex-1 order-2 sm:order-1"
            size="sm"
            aria-label={`Approve task: ${title}`}
          >
            {localStatus === 'approving' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Accept
              </>
            )}
          </Button>

          {/* Secondary: Reject */}
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 order-3 sm:order-2"
            size="sm"
            aria-label={`Reject task: ${title}`}
          >
            {localStatus === 'rejecting' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Reject
              </>
            )}
          </Button>

          {/* Tertiary: Modify */}
          <Button
            variant="ghost"
            onClick={handleModify}
            disabled={isProcessing}
            className="order-1 sm:order-3"
            size="sm"
            aria-label={`Modify task: ${title}`}
          >
            {localStatus === 'modifying' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Edit3 className="h-4 w-4 mr-2" aria-hidden="true" />
                Modify
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for inline embedding
interface CompactApprovalCardProps {
  data: ApprovalCardData;
  onApproved?: (taskId: string) => void;
  onRejected?: (taskId: string) => void;
  onModify?: (taskId: string) => void;
  autoDismiss?: boolean;
  className?: string;
}

export function CompactApprovalCard({
  data,
  onApproved,
  onRejected,
  onModify,
  autoDismiss = true,
  className,
}: CompactApprovalCardProps) {
  return (
    <div className={cn("p-3 rounded-lg border bg-card", className)}>
      <ApprovalCard 
        data={data} 
        onApproved={onApproved}
        onRejected={onRejected}
        onModify={onModify}
        autoDismiss={autoDismiss}
      />
    </div>
  );
}

export default ApprovalCard;
