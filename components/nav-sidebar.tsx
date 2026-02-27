'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Megaphone,
  GitBranch,
  ChevronDown,
} from 'lucide-react';
import { SidebarSessionList } from './sidebar-session-list';
import { usePendingCount } from '@/app/hooks/use-pending-count';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const TOOL_ITEMS = [
  { href: '/outreach', label: 'Research', icon: <Search className="w-4 h-4" /> },
  { href: '/outreach/prospects', label: 'Prospects', icon: <Users className="w-4 h-4" /> },
  { href: '/outreach/campaigns', label: 'Campaigns', icon: <Megaphone className="w-4 h-4" /> },
  { href: '/outreach/sequences', label: 'Sequences', icon: <GitBranch className="w-4 h-4" /> },
];

interface NavSidebarProps {
  children: React.ReactNode;
}

export default function NavSidebar({ children }: NavSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const pendingCount = usePendingCount();

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Command Center',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      href: '/ops',
      label: 'Operations',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const contentMargin = isCollapsed ? 'md:ml-16' : 'md:ml-64';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-[#3a3a3e] z-30 flex items-center px-4 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 -ml-2 rounded-lg text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[#1a1a1c] transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="ml-3 font-semibold text-[#f5f5f7]">GTM Command Center</span>
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobile ? (isMobileOpen ? 0 : -280) : 0,
          width: isMobile ? 280 : undefined,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 h-screen bg-[#0a0a0a] border-r border-[#3a3a3e] z-50 flex flex-col ${
          isMobile ? 'w-[280px]' : sidebarWidth
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-[#3a3a3e] flex items-center justify-between px-4 flex-shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-3 ${isCollapsed && !isMobile ? 'justify-center w-full' : ''}`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e958a1] to-[#8f76f5] flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">GTM</span>
            </div>
            {(!isCollapsed || isMobile) && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-semibold text-[#f5f5f7] truncate"
              >
                Command Center
              </motion.span>
            )}
          </Link>

          {/* Collapse Toggle (desktop only) */}
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-md text-[#5a5a5d] hover:text-[#a1a1a6] hover:bg-[#1a1a1c] transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setIsMobileOpen(false)}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group
                  ${isCollapsed && !isMobile ? 'justify-center' : ''}
                  ${
                    isActive
                      ? 'bg-[#de347f]/10 text-[#de347f] border border-[#de347f]/20'
                      : 'text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[#1a1a1c]'
                  }
                `}
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-[#de347f] to-[#8f76f5] rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <span className={`${isActive ? 'text-[#de347f]' : 'text-[#5a5a5d] group-hover:text-[#a1a1a6]'}`}>
                  {item.icon}
                </span>

                {/* Label */}
                {(!isCollapsed || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium text-sm truncate flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Badge */}
                {item.badge != null && item.badge > 0 && (!isCollapsed || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 text-xs font-medium bg-[#de347f]/20 text-[#e958a1] rounded-full"
                  >
                    {item.badge}
                  </motion.span>
                )}

                {/* Collapsed badge dot */}
                {item.badge != null && item.badge > 0 && isCollapsed && !isMobile && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#de347f] rounded-full" />
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && !isMobile && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1c] text-[#f5f5f7] text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-[#3a3a3e]">
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 text-xs text-[#de347f]">({item.badge})</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Tools (outreach pages) */}
        {(!isCollapsed || isMobile) && (
          <div className="px-3 mb-2">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium uppercase tracking-wider text-[#5a5a5d] hover:text-[#a1a1a6] transition-colors rounded-lg"
            >
              Tools
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {toolsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0.5 pt-1">
                    {TOOL_ITEMS.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => isMobile && setIsMobileOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'text-[#de347f] bg-[#de347f]/10'
                              : 'text-[#a1a1a6] hover:text-[#f5f5f7] hover:bg-[#1a1a1c]'
                          }`}
                        >
                          <span className={isActive ? 'text-[#de347f]' : 'text-[#5a5a5d]'}>
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Session list */}
        <SidebarSessionList
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          onMobileClose={() => setIsMobileOpen(false)}
        />

        {/* Footer */}
        {(!isCollapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 mt-auto p-4 border-t border-[#3a3a3e]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1c] flex items-center justify-center shrink-0">
                <span className="text-[#a1a1a6] text-xs font-medium">ME</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f5f5f7] truncate">My Account</p>
                <p className="text-xs text-[#5a5a5d] truncate">Pro Plan</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ease-in-out pt-14 md:pt-0 ${
          isMobile ? '' : contentMargin
        }`}
      >
        {children}
      </main>
    </div>
  );
}
