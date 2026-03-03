'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoginGate } from '@/app/components/login-gate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BlockerPanel } from '@/app/components/work-queue/blocker-panel';
import { PrioritySlider } from '@/app/components/work-queue/priority-slider';
import { useToast } from '@/app/hooks/use-toast';
import type { WorkQueueItem } from '@/app/hooks/use-work-queue';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  blocked: { label: 'Blocked (waiting on user)', className: 'bg-red-100 text-red-800' },
  ready: { label: 'Ready to execute', className: 'bg-emerald-100 text-emerald-800' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
};

function TaskDetail({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [item, setItem] = useState<WorkQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await globalThis.fetch(`/api/work-queue/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setItem(json.item);
      setNotes(json.item?.notes ?? '');
    } catch {
      toast({ title: 'Task not found', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const updateField = useCallback(async (updates: Record<string, unknown>) => {
    try {
      const res = await globalThis.fetch(`/api/work-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchItem();
      toast({ title: 'Updated' });
    } catch (err) {
      toast({ title: 'Update failed', description: (err as Error).message, variant: 'destructive' });
    }
  }, [id, fetchItem, toast]);

  const handleDelete = useCallback(async () => {
    try {
      const res = await globalThis.fetch(`/api/work-queue/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: 'Task removed' });
      router.push('/work-queue');
    } catch (err) {
      toast({ title: 'Delete failed', description: (err as Error).message, variant: 'destructive' });
    }
  }, [id, router, toast]);

  if (isLoading || !item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const meta = item.metadata ?? {};
  const title = (meta.title as string) || item.item_type || 'Untitled Task';
  const description = (meta.description as string) || '';
  const requiresTools = (meta.requires_tools as string[]) ?? [];
  const missingTools = (meta.missing_tools as string[]) ?? [];
  const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Task: {title}</h2>
        <Link
          href="/work-queue"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </Link>
      </div>

      {/* Priority */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Priority</span>
            <PrioritySlider
              value={item.priority}
              onChange={(p) => updateField({ priority: p })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={status.className}>{status.label}</Badge>
          {item.status === 'blocked' && (
            <span className="text-red-500 text-lg">&#x1F534;</span>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {description && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{description}</p>
          </CardContent>
        </Card>
      )}

      {/* Blocker Panel */}
      <BlockerPanel
        blockedReason={item.blocked_reason}
        unblockConditions={item.unblock_conditions}
        requiresTools={requiresTools}
        missingTools={missingTools}
      />

      {/* User Notes */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Your Notes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesChanged(true);
            }}
            placeholder="Add context or notes..."
            rows={3}
          />
          {notesChanged && (
            <Button
              size="sm"
              onClick={() => {
                updateField({ notes });
                setNotesChanged(false);
              }}
            >
              Save Notes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {item.status === 'blocked' && (
          <Button onClick={() => updateField({ status: 'ready', blocked_reason: null })}>
            Mark as Ready
          </Button>
        )}
        {(item.status === 'ready' || item.status === 'pending') && (
          <Button onClick={() => updateField({ status: 'in_progress' })}>
            Start Now
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => updateField({ priority: 1 })}
        >
          Move to #1 Priority
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Cancel Task
        </Button>
      </div>
    </div>
  );
}

export default function WorkQueueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  if (!id) return null;

  return (
    <LoginGate>
      <div className="min-h-screen bg-background">
        <header className="border-b px-6 py-4">
          <Link href="/work-queue" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Queue
          </Link>
        </header>
        <TaskDetail id={id} />
      </div>
    </LoginGate>
  );
}
