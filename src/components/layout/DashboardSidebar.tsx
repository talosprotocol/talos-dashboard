'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, BarChart3, Settings, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: BarChart3,
  },
  {
    title: 'Audit Explorer',
    href: '/audit',
    icon: Shield,
  },
  {
    title: 'System Status',
    href: '/status',
    icon: Activity,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Configuration',
    href: '/configuration',
    icon: Settings, // Reusing Settings for now, or import Sliders
  },
  {
    title: 'Docs',
    href: '/docs',
    icon: FileText,
  },
];

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ isOpen = true, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 bottom-12 left-0 z-40 w-64 border-r border-white/5 bg-background/60 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-full overflow-y-auto p-4 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2 opacity-70">
              Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                   if (item.href === pathname) e.preventDefault();
                   onClose?.();
                }}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden',
                  isActive
                    ? 'text-white bg-indigo-500/10 shadow-[0_0_20px_rgba(79,70,229,0.15)] border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      </aside>
      
      {/* Sidebar Spacer for Desktop */}
      <div className="hidden lg:block w-64 shrink-0" />
    </>
  );
}
