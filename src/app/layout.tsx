import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Talos Protocol | Security Console',
  description: 'Audit and security monitoring dashboard for Talos Protocol',
};

/**
 * Root Layout - HTML, providers, theme, metadata only.
 *
 * The AppShell (sidebar, footer) is provided by (shell)/layout.tsx
 * This keeps auth/setup pages outside the shell if needed in the future.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased font-sans bg-background text-foreground"
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
