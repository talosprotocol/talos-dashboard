/**
 * App Shell Layout
 *
 * Wraps all authenticated dashboard pages.
 * Provides sidebar navigation, header, and footer.
 */

'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardFooter } from '@/components/layout/DashboardFooter';
import { Menu, X } from 'lucide-react';

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Fixed Header */}
      <DashboardHeader />
      
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-background border shadow-sm"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Main Content Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hidden on mobile unless toggled */}
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-background lg:ml-0">
          <div className="container max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Fixed Footer */}
      <DashboardFooter />
    </div>
  );
}
