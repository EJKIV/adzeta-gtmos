/**
 * Outreach Route Group Layout
 * Wraps all outreach pages with consistent structure
 */

import { ReactNode } from 'react';

export default function OutreachLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
