'use client';

import { CheckCircle2, MinusCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface IntentCriterion {
  key: string;
  label: string;
  required: boolean;
  provided: boolean;
  value?: unknown;
}

interface ConfidenceBarProps {
  confidence: number; // 0-1
  criteria: IntentCriterion[];
  showDetails?: boolean;
  className?: string;
}

/**
 * Confidence Bar - Shows progress toward complete intent
 * 
 * Displays:
 * - Visual confidence meter
 * - Filled vs missing criteria
 * - Required vs optional indicators
 * 
 * Usage:
 * <ConfidenceBar
 *   confidence={0.65}
 *   criteria={[
 *     { key: 'icp.titles', label: 'Job Titles', required: true, provided: true, value: ['VP Sales'] },
 *     { key: 'icp.industries', label: 'Industry', required: false, provided: true },
 *     { key: 'campaign.type', label: 'Campaign Type', required: true, provided: false },
 *   ]}
 * />
 */
export function ConfidenceBar({ 
  confidence, 
  criteria, 
  showDetails = true,
  className 
}: ConfidenceBarProps) {
  const percentage = Math.round(confidence * 100);
  const filledRequired = criteria.filter(c => c.required && c.provided).length;
  const totalRequired = criteria.filter(c => c.required).length;
  const filledOptional = criteria.filter(c => !c.required && c.provided).length;
  const totalOptional = criteria.filter(c => !c.required).length;

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return 'Ready';
    if (confidence >= 0.6) return 'Almost there';
    if (confidence >= 0.4) return 'Getting closer';
    return 'Need more info';
  };

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Confidence Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Confidence
            </span>
            <span className={cn(
              "text-xs font-medium",
              confidence >= 0.6 ? "text-green-600" : "text-muted-foreground"
            )}>
              {getConfidenceLabel()} ({percentage}%)
            </span>
          </div>
          
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500 ease-out", getConfidenceColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Criteria Chips */}
        {showDetails && (
          <div className="flex flex-wrap gap-1.5">
            {criteria.map((criterion) => (
              <Tooltip key={criterion.key}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-default",
                      criterion.provided 
                        ? criterion.required
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                        : criterion.required
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                    )}
                  >
                    {criterion.provided ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : criterion.required ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <MinusCircle className="h-3 w-3" />
                    )}
                    {criterion.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{criterion.label}</p>
                    <p className="text-xs opacity-80">
                      {criterion.required ? 'Required' : 'Optional'}
                    </p>
                    {criterion.provided && criterion.value ? (
                      <p className="text-xs opacity-80">
                        {Array.isArray(criterion.value) 
                          ? criterion.value.slice(0, 3).join(', ') + (criterion.value.length > 3 ? '...' : '')
                          : String(criterion.value).slice(0, 50)}
                      </p>
                    ) : criterion.required ? (
                      <p className="text-xs text-red-300">Missing</p>
                    ) : (
                      <p className="text-xs opacity-60">Not provided (optional)</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Summary */}
        {showDetails && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Required: {filledRequired}/{totalRequired}
            </span>
            {totalOptional > 0 && (
              <span>
                Optional: {filledOptional}/{totalOptional}
              </span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact Confidence Indicator
 * Just the bar and percentage
 */
export function CompactConfidenceBar({ confidence, className }: { confidence: number; className?: string }) {
  const percentage = Math.round(confidence * 100);
  
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{percentage}%</span>
    </div>
  );
}

export default ConfidenceBar;
