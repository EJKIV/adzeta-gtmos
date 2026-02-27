'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, X, MessageSquare, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionContext } from '@/app/components/session-provider';

interface SidebarSessionListProps {
  isCollapsed: boolean;
  isMobile: boolean;
  onMobileClose?: () => void;
}

export function SidebarSessionList({ isCollapsed, isMobile, onMobileClose }: SidebarSessionListProps) {
  const {
    sessions,
    activeSessionId,
    switchSession,
    clearSession,
    archiveSession,
  } = useSessionContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const handleSwitch = (sessionId: string) => {
    switchSession(sessionId);
    if (isMobile) onMobileClose?.();
  };

  const handleNewChat = () => {
    clearSession();
    if (isMobile) onMobileClose?.();
  };

  // Collapsed sidebar — just show icons
  if (isCollapsed && !isMobile) {
    return (
      <div className="flex flex-col items-center py-3 gap-2">
        <button
          onClick={handleNewChat}
          className="group relative p-2 rounded-lg text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[#1a1a1c] transition-colors"
          aria-label="New chat"
        >
          <Plus className="w-5 h-5" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1c] text-[#f5f5f7] text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-[#3a3a3e]">
            New chat
          </div>
        </button>
        <button
          className="group relative p-2 rounded-lg text-[#5a5a5d] hover:text-[#a1a1a6] hover:bg-[#1a1a1c] transition-colors"
          aria-label="Conversations"
        >
          <MessageSquare className="w-5 h-5" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1c] text-[#f5f5f7] text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-[#3a3a3e]">
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border-t border-[#3a3a3e] ${isExpanded ? 'flex-1 min-h-0' : 'flex-shrink-0'}`}>
      {/* Header — click to expand/collapse */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-center justify-between px-3 py-2.5 w-full text-left hover:bg-[#1a1a1c]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-[#5a5a5d]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5a5a5d]">
            Conversations
          </span>
          {sessions.length > 0 && (
            <span className="text-[10px] font-medium text-[#5a5a5d] bg-[#1a1a1c] px-1.5 py-0.5 rounded-full">
              {sessions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleNewChat();
            }}
            className="p-1 rounded-md text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[#1a1a1c] transition-colors"
            role="button"
            aria-label="New chat"
            title="New chat (Cmd+N)"
          >
            <Plus className="w-3.5 h-3.5" />
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-[#5a5a5d]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.span>
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex flex-col flex-1 min-h-0 overflow-hidden"
          >
            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5a5a5d]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1a1a1c] border border-[#3a3a3e] rounded-lg text-[#f5f5f7] placeholder-[#5a5a5d] focus:outline-none focus:border-[#de347f]/40 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5a5a5d] hover:text-[#a1a1a6]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 no-scrollbar">
              {filteredSessions.length === 0 && (
                <p className="px-2 py-3 text-xs text-[#5a5a5d] italic text-center">
                  {searchQuery ? 'No matches' : 'No conversations yet'}
                </p>
              )}
              {filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group relative"
                  >
                    <button
                      onClick={() => handleSwitch(session.id)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-all duration-150
                        ${isActive
                          ? 'bg-[#de347f]/10 text-[#de347f] border border-[#de347f]/20'
                          : 'text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[#1a1a1c] border border-transparent'
                        }
                      `}
                      title={session.title}
                    >
                      <span className="block truncate pr-5">{session.title}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveSession(session.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#5a5a5d] hover:text-[#f5f5f7] hover:bg-[#3a3a3e] opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Archive ${session.title}`}
                      title="Archive conversation"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
