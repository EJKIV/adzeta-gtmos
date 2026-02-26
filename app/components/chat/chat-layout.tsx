'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

const SIDEBAR_KEY = 'gtm-sidebar-collapsed';

interface ChatLayoutProps {
  sessionBar: ReactNode;
  thread: ReactNode;
  input: ReactNode;
  sidebar: ReactNode;
  emptyState?: ReactNode;
  hasMessages: boolean;
  transitioning?: boolean;
}

export function ChatLayout({ sessionBar, thread, input, sidebar, emptyState, hasMessages, transitioning }: ChatLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Restore sidebar state from localStorage + responsive breakpoint
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === 'true') setSidebarCollapsed(true);

    // Use matchMedia for efficient breakpoint detection (fires once per crossing)
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => {
        const next = !v;
        localStorage.setItem(SIDEBAR_KEY, String(next));
        return next;
      });
    }
  }, [isMobile]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileSidebarOpen]);

  const showDesktopSidebar = !isMobile && !sidebarCollapsed;

  return (
    <div
      className="light-content flex h-screen overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Session bar */}
        <div
          className="flex-shrink-0 border-b flex items-center gap-2 px-4 h-12"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex-1 min-w-0 overflow-x-auto">
            {sessionBar}
          </div>
          <button
            onClick={toggleSidebar}
            className="icon-btn-hover flex-shrink-0 p-1.5 rounded-lg"
            style={{ color: 'var(--color-text-tertiary)' }}
            aria-label={sidebarCollapsed || isMobile ? 'Show sidebar' : 'Hide sidebar'}
            title={sidebarCollapsed || isMobile ? 'Show sidebar' : 'Hide sidebar'}
          >
            {showDesktopSidebar ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Content area — either empty state or thread+input */}
        {!hasMessages && emptyState ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {emptyState}
          </div>
        ) : (
          <>
            {/* Thread (scrollable) */}
            <div className="flex-1 min-h-0">
              {thread}
            </div>

            {/* Input (pinned bottom) */}
            <div className={`flex-shrink-0 ${transitioning ? 'animate-input-settle' : ''}`}>
              {input}
            </div>
          </>
        )}
      </div>

      {/* Desktop sidebar */}
      {showDesktopSidebar && (
        <div
          className="flex-shrink-0 w-80 border-l overflow-y-auto animate-slide-in-right"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          {sidebar}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 overflow-y-auto animate-slide-in-right"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              boxShadow: 'var(--shadow-2xl)',
            }}
          >
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
}
