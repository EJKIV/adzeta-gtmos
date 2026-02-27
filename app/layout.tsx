import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './components/theme-provider';
import { AnnouncementProvider } from './components/accessibility';
import { SkipLink } from './components/accessibility';
import { AuthWrapper } from './components/auth-wrapper';
import { SessionProvider } from './components/session-provider';
import NavSidebar from '@/components/nav-sidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'GTM Command Center',
  description: 'Your GTM motion, visualized and actionable',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({ 
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <AuthWrapper>
          <ThemeProvider>
            <AnnouncementProvider>
              {/* Skip links for accessibility */}
              <SkipLink href="#main-content">
                Skip to main content
              </SkipLink>
              <SkipLink href="#main-navigation">
                Skip to navigation
              </SkipLink>
              
              <SessionProvider>
                <NavSidebar>{children}</NavSidebar>
              </SessionProvider>
            </AnnouncementProvider>
          </ThemeProvider>
        </AuthWrapper>
      </body>
    </html>
  );
}
