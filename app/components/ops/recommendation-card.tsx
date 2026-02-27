'use client';

import { getPriorityColor, getConfidenceColor } from './priority-utils';
import { ConfidenceTrend } from './confidence-trend';
import type { Recommendation } from '@/lib/intelligence/recommendation-engine';

export function RecommendationCard({
  recommendation,
  onApprove,
  onReject,
  onDismiss,
}: {
  recommendation: Recommendation;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="rounded-xl border p-4 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(recommendation.priority)}`}
            >
              {recommendation.priority}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceColor(recommendation.confidenceScore)}`}
            >
              {recommendation.confidenceScore}% confidence
            </span>
            <ConfidenceTrend trend={recommendation.confidenceTrend} />
          </div>
          <h4 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {recommendation.title}
          </h4>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {recommendation.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <div style={{ color: 'var(--color-text-tertiary)' }}>
              Trend: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {recommendation.scores.trendImpact > 0 ? '+' : ''}{recommendation.scores.trendImpact}
              </span>
            </div>
            <div style={{ color: 'var(--color-text-tertiary)' }}>
              Preference: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {recommendation.scores.preferenceMatch}%
              </span>
            </div>
            <div style={{ color: 'var(--color-text-tertiary)' }}>
              History: <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {Math.round(recommendation.scores.historicalAccuracy * 100)}%
              </span>
            </div>
          </div>

          {recommendation.suggestedAction && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Suggested: </span>
                {recommendation.suggestedAction.description}
                {recommendation.suggestedAction.estimatedImpact && (
                  <span className="text-emerald-600 ml-1">
                    ({recommendation.suggestedAction.estimatedImpact})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onApprove(recommendation.id)}
            aria-label={`Accept recommendation: ${recommendation.title}`}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-md hover:bg-emerald-100 transition-colors border border-emerald-200"
          >
            Accept
          </button>
          <button
            onClick={() => onReject(recommendation.id)}
            aria-label={`Reject recommendation: ${recommendation.title}`}
            className="px-3 py-1.5 bg-rose-50 text-rose-700 text-sm font-medium rounded-md hover:bg-rose-100 transition-colors border border-rose-200"
          >
            Reject
          </button>
          <button
            onClick={() => onDismiss(recommendation.id)}
            aria-label={`Dismiss recommendation: ${recommendation.title}`}
            className="px-3 py-1.5 text-sm rounded-md transition-colors border"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
