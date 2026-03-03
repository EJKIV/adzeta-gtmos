import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events Dashboard | Admin',
  description: 'Real-time event monitoring and analytics for administrators',
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function EventsDashboardLayout({ children }: LayoutProps) {
  // In production, add admin authentication check here
  // Redirect to login if not authenticated as admin
  
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}