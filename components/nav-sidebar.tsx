'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  Users,
  Megaphone,
  GitBranch,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/outreach',
    label: 'Research',
    icon: <Search className="w-5 h-5" />,
  },
  {
    href: '/outreach/prospects',
    label: 'Prospects',
    icon: <Users className="w-5 h-5" />,
    badge: 24,
  },
  {
    href: '/outreach/campaigns',
    label: 'Campaigns',
    icon: <Megaphone className="w-5 h-5" />,
  },
  {
    href: '/outreach/sequences',
    label: 'Sequences',
    icon: <GitBranch className="w-5 h-5" />,
  },
];

interface NavSidebarProps {
  children: React.ReactNode;
}

export default function NavSidebar({ children }: NavSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
        className={`fixed top-0 left-0 h-screen bg-[#0a0a0a] border-r border-[#3a3a3e] z-50 ${
          isMobile ? 'w-[280px]' : sidebarWidth
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-[#3a3a3e] flex items-center justify-between px-4">
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
        <nav className="p-3 space-y-1">
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
                {item.badge && (!isCollapsed || isMobile) && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-2 py-0.5 text-xs font-medium bg-[#de347f]/20 text-[#e958a1] rounded-full"
                  >
                    {item.badge}
                  </motion.span>
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

        {/* Footer */}
        {(!isCollapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#3a3a3e]"
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
