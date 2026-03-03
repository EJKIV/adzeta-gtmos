'use client';

import { useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './task-card';
import type { WorkQueueItem } from '@/app/hooks/use-work-queue';

interface QueueTableProps {
  items: WorkQueueItem[];
  isLoading: boolean;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (newOrder: string[]) => Promise<void>;
  onViewDetail?: (id: string) => void;
}

export function QueueTable({ items, isLoading, onUpdate, onDelete, onReorder, onViewDetail }: QueueTableProps) {
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverRef.current = index;
  }, []);

  const handleDrop = useCallback(() => {
    if (dragItemRef.current === null || dragOverRef.current === null) return;
    if (dragItemRef.current === dragOverRef.current) return;

    const newItems = [...items];
    const [dragged] = newItems.splice(dragItemRef.current, 1);
    newItems.splice(dragOverRef.current, 0, dragged);

    onReorder(newItems.map(i => i.id));
    dragItemRef.current = null;
    dragOverRef.current = null;
  }, [items, onReorder]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Work Queue</CardTitle></CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const blocked = items.filter(i => i.status === 'blocked');
  const inProgress = items.filter(i => i.status === 'in_progress');
  const ready = items.filter(i => i.status === 'ready' || i.status === 'pending');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Work Queue</CardTitle>
        <div className="flex gap-2">
          {inProgress.length > 0 && (
            <Badge className="bg-blue-100 text-blue-800">{inProgress.length} active</Badge>
          )}
          {blocked.length > 0 && (
            <Badge className="bg-red-100 text-red-800">{blocked.length} blocked</Badge>
          )}
          {ready.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-800">{ready.length} ready</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">Queue is empty</p>
            <p className="text-sm">No tasks in the work queue</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className="cursor-grab active:cursor-grabbing"
            >
              <TaskCard
                item={item}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onViewDetail={onViewDetail}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
