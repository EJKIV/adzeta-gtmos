'use client';

/**
 * Outreach Layout
 * Orchestration layout with CommandBar at top, ThreadPanel on right,
 * and shared state via OutreachContext.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import CommandBar from '@/components/command-bar';
import ThreadPanel from '@/components/thread-panel';
import type { CommandIntent, ThreadItem } from '@/types';

interface OutreachContextValue {
  threadItems: ThreadItem[];
  addToThread: (item: Omit<ThreadItem, 'id' | 'timestamp'>) => void;
  handleCommand: (intent: CommandIntent) => void;
  isProcessing: boolean;
  isThreadOpen: boolean;
  setIsThreadOpen: (open: boolean) => void;
}

const OutreachContext = createContext<OutreachContextValue | null>(null);

export function useOutreach() {
  const ctx = useContext(OutreachContext);
  if (!ctx) throw new Error('useOutreach must be used within OutreachLayout');
  return ctx;
}

export default function OutreachLayout({ children }: { children: ReactNode }) {
  const [threadItems, setThreadItems] = useState<ThreadItem[]>([]);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToThread = useCallback((item: Omit<ThreadItem, 'id' | 'timestamp'>) => {
    const newItem: ThreadItem = {
      ...item,
      id: `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setThreadItems((prev) => [...prev, newItem]);
  }, []);

  const handleCommand = useCallback(
    async (intent: CommandIntent) => {
      setIsProcessing(true);
      addToThread({ type: 'command', content: intent.rawInput, data: { intent } });

      // Simulate research job
      await new Promise((r) => setTimeout(r, 1500));

      addToThread({ type: 'result', content: `Found results for: ${intent.rawInput}`, data: {} });
      setIsProcessing(false);
    },
    [addToThread]
  );

  return (
    <OutreachContext.Provider
      value={{ threadItems, addToThread, handleCommand, isProcessing, isThreadOpen, setIsThreadOpen }}
    >
      <div className="light-content flex flex-col min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        {/* Sticky CommandBar */}
        <div className="sticky top-0 z-30 px-6 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200">
          <CommandBar onCommand={handleCommand} isProcessing={isProcessing} />
        </div>

        {/* Content area - shifts when thread panel opens */}
        <div
          className="flex-1 transition-all duration-300"
          style={{ marginRight: isThreadOpen ? 380 : 0 }}
        >
          {children}
        </div>

        {/* Thread Panel */}
        <ThreadPanel
          items={threadItems}
          isOpen={isThreadOpen}
          onToggle={() => setIsThreadOpen(!isThreadOpen)}
          onBranch={() => {}}
          onModify={() => {}}
          onReference={() => {}}
        />
      </div>
    </OutreachContext.Provider>
  );
}
