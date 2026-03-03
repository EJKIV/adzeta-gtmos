'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Command, Search, X,
  BarChart3, Users, Settings, MessageSquare,
  Target, Send, Compass, ListChecks, Trash2,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  section: string;
  icon: typeof Search;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  onCommand?: (command: string) => void;
  onClearChat?: () => void;
  className?: string;
}

export function CommandPalette({ onCommand, onClearChat, className }: CommandPaletteProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  const commands = useMemo<CommandItem[]>(() => {
    const nav = (path: string) => () => { router.push(path); close(); };
    const chat = (text: string) => () => { onCommand?.(text); close(); };

    return [
      // Navigation
      { id: 'nav-home', title: 'Go to Home', section: 'Navigation', icon: MessageSquare, action: nav('/') },
      { id: 'nav-outreach', title: 'Go to Outreach', section: 'Navigation', icon: Send, action: nav('/outreach') },
      { id: 'nav-prospects', title: 'Go to Prospects', section: 'Navigation', icon: Users, action: nav('/outreach/prospects') },
      { id: 'nav-sequences', title: 'Go to Sequences', section: 'Navigation', icon: Target, action: nav('/outreach/sequences') },
      { id: 'nav-campaigns', title: 'Go to Campaigns', section: 'Navigation', icon: Target, action: nav('/outreach/campaigns') },
      { id: 'nav-relationships', title: 'Go to Relationships', section: 'Navigation', icon: Users, action: nav('/relationships') },
      { id: 'nav-autonomy', title: 'Go to Autonomy Dashboard', section: 'Navigation', icon: Compass, action: nav('/autonomy') },
      { id: 'nav-workqueue', title: 'Go to Work Queue', section: 'Navigation', icon: ListChecks, action: nav('/work-queue') },
      { id: 'nav-settings', title: 'Go to Settings', section: 'Navigation', icon: Settings, action: nav('/settings') },

      // Quick commands
      { id: 'cmd-pipeline', title: 'Show pipeline health', section: 'Commands', icon: BarChart3, action: chat('show pipeline health') },
      { id: 'cmd-focus', title: 'What should I focus on?', section: 'Commands', icon: Compass, action: chat('what should I focus on?') },
      { id: 'cmd-kpis', title: 'Show my KPIs', section: 'Commands', icon: BarChart3, action: chat('show my KPIs') },
      { id: 'cmd-prospects', title: 'Find new prospects', section: 'Commands', icon: Users, action: chat('find new prospects') },

      // Actions
      ...(onClearChat ? [{ id: 'act-clear', title: 'Clear chat', section: 'Actions', icon: Trash2, action: () => { onClearChat(); close(); } }] : []),
    ];
  }, [router, onCommand, onClearChat, close]);

  const filtered = useMemo(() => {
    if (!searchQuery) return commands;
    const q = searchQuery.toLowerCase();
    return commands.filter(c =>
      c.title.toLowerCase().includes(q) || c.section.toLowerCase().includes(q)
    );
  }, [commands, searchQuery]);

  // Group by section for display
  const sections = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.section) ?? [];
      list.push(cmd);
      map.set(cmd.section, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    setSearchQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleOpen();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter' && filtered[selectedIndex]) {
          e.preventDefault();
          filtered[selectedIndex].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, toggleOpen, close]);

  // Reset selection when search changes
  useEffect(() => { setSelectedIndex(0); }, [searchQuery]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'hidden sm:inline-flex items-center gap-2 px-3 py-1.5',
          'text-xs rounded-lg transition-all duration-200 border',
          className
        )}
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border)',
        }}
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd
          className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Command className="h-3 w-3" />K
        </kbd>
      </button>
    );
  }

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
      />
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-elevated)' }}
      >
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Search className="h-5 w-5" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 text-lg bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
            autoFocus
          />
          <button onClick={close} className="p-1" style={{ color: 'var(--color-text-muted)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No commands found</p>
            </div>
          ) : (
            sections.map(([section, items]) => (
              <div key={section}>
                <div
                  className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {section}
                </div>
                {items.map((command) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  const Icon = command.icon;
                  return (
                    <button
                      key={command.id}
                      onClick={() => command.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 transition-colors duration-100',
                      )}
                      style={{
                        backgroundColor: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className="h-4 w-4"
                          style={{ color: isSelected ? 'var(--color-brand-500)' : 'var(--color-text-muted)' }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {command.title}
                        </span>
                      </div>
                      {command.shortcut && (
                        <kbd
                          className="px-2 py-1 text-xs rounded border"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-muted)',
                            borderColor: 'var(--color-border)',
                          }}
                        >
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 py-2.5 border-t text-xs"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
          }}
        >
          <div className="flex items-center gap-4">
            <span>↑↓ Select</span>
            <span>↵ Run</span>
            <span>Esc Close</span>
          </div>
          <span>{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}
