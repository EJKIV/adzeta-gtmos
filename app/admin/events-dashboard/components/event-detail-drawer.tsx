'use client';

import { useState } from 'react';
import { X, Copy, Check, ArrowRight, User, FileJson, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { eventTypeColors, AnalyticsEvent } from '@/lib/analytics/mock-events';
import { formatDistanceToNow, format } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EventDetailDrawerProps {
  event: AnalyticsEvent | null;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function EventDetailDrawer({ event, onClose }: EventDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNavigateToEntity = () => {
    if (event.relatedEntity) {
      // Navigate to related entity
      const path = `/${event.relatedEntity.type}s/${event.relatedEntity.id}`;
      window.open(path, '_blank');
    }
  };

  const handleNavigateToUser = () => {
    window.open(`/users/${event.user.id}`, '_blank');
  };

  const typeColors = eventTypeColors[event.type];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Badge className={`${typeColors.bg} ${typeColors.text} border ${typeColors.border}`}>
              {event.type}
            </Badge>
            <span className="text-lg font-semibold">Event Details</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Metadata Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Metadata
              </h3>
              
              <div className="grid gap-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Event ID</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{event.id}</code>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm capitalize">
                    {event.type}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Timestamp</span>
                  <div className="text-right">
                    <div className="text-sm">{format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.timestamp))}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                User
              </h3>
              
              <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={handleNavigateToUser}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{event.user.name}</div>
                  <div className="text-sm text-muted-foreground">{event.user.email}</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Related Entity Section */}
            {event.relatedEntity && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Related Entity
                </h3>
                
                <div 
                  className="flex items-center gap-4 p-3 rounded-lg border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={handleNavigateToEntity}
                >
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <FileJson className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{event.relatedEntity.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{event.relatedEntity.type}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Summary Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Summary
              </h3>
              
              <p className="text-sm leading-relaxed">{event.summary}</p>
            </div>

            {/* JSON Details Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Details (JSON)
                </h3>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyJson}
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                <code>{JSON.stringify(event.details, null, 2)}</code>
              </pre>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          <Button onClick={handleCopyJson}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

export default EventDetailDrawer;