import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Talos Protocol | Security Console",
  description:
    "Enterprise security dashboard for MCP protocol audit and monitoring.",
};

import { ThemeProvider } from "../components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <div className="flex-1">{children}</div>
            <footer className="border-t border-[var(--panel-border)] bg-[var(--panel)]/30 py-6 px-8 mt-auto">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-4">
                  <span>© 2026 Talos Protocol</span>
                  <a
                    href="/examples"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    Examples Catalog
                  </a>
                  <a
                    href="https://github.com/talosprotocol/talos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    Documentation
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>Mainnet Canary</span>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
