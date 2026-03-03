'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginGate } from '@/app/components/login-gate';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { QueueTable } from '@/app/components/work-queue/queue-table';
import { useWorkQueue } from '@/app/hooks/use-work-queue';

export default function WorkQueuePage() {
  return (
    <LoginGate>
      <WorkQueueContent />
    </LoginGate>
  );
}

function WorkQueueContent() {
  const router = useRouter();
  const { items, isLoading, refetch, updateItem, reorderItems, deleteItem, createItem } = useWorkQueue();
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createItem({
      title: newTitle,
      description: newDescription || undefined,
      item_type: 'task',
      priority: newPriority === 'urgent' ? 1 : newPriority === 'high' ? 3 : undefined,
    });
    setAddOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('normal');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Work Queue</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            + Add Task
          </Button>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Chat
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <QueueTable
          items={items}
          isLoading={isLoading}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onReorder={reorderItems}
          onViewDetail={(id) => router.push(`/work-queue/${id}`)}
        />
      </main>

      {/* Add Task Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task to Queue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-background"
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="What needs to be done..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-2 mt-1">
                {(['normal', 'high', 'urgent'] as const).map(p => (
                  <Button
                    key={p}
                    size="sm"
                    variant={newPriority === p ? 'default' : 'outline'}
                    onClick={() => setNewPriority(p)}
                    className={
                      newPriority === p
                        ? p === 'urgent' ? 'bg-red-600 hover:bg-red-700' : p === 'high' ? 'bg-orange-500 hover:bg-orange-600' : ''
                        : ''
                    }
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newTitle.trim()}>Add to Queue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
