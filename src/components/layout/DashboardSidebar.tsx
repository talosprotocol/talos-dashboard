'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, BarChart3, Settings, FileText, Activity, Terminal, LayoutDashboard, Database, Lock, Play, Zap, Bot, Wallet, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_REGISTRY, NavItem, isActiveRoute } from '@/lib/navRegistry';

const ICON_MAP: Record<string, LucideIcon> = {
  "📊": LayoutDashboard,
  "🔌": Activity,
  "☁️": Database,
  "🧠": Zap,
  "🎮": Play,
  "🛠️": Terminal,
  "🛡️": Shield,
  "📜": FileText,
  "⚙️": Settings,
  "🔐": Lock,
  "🧪": Terminal,
  "💬": Activity,
  "📈": BarChart3,
  "🚀": Zap,
  "🤖": Bot,
  "💰": Wallet,
};

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function NavLink({ href, item, pathname, onClose }: { href: string; item: NavItem; pathname: string; onClose?: () => void }) {
  const Icon = ICON_MAP[item.icon] || Terminal;
  const active = isActiveRoute(pathname, href);

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (href === pathname) e.preventDefault();
        onClose?.();
      }}
      aria-label={item.ariaLabel}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden',
        active
          ? 'text-white bg-indigo-500/10 shadow-[0_0_20px_rgba(79,70,229,0.15)] border border-indigo-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      )}
    >
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
      <span>{item.label}</span>
    </Link>
  );
}

export function DashboardSidebar({ isOpen = true, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  const coreItems = Object.entries(NAV_REGISTRY).filter(([, item]) => item.parent === null && item.group === "core");
  const adminItems = Object.entries(NAV_REGISTRY).filter(([, item]) => item.parent === null && item.group === "admin");
  const demoItems = Object.entries(NAV_REGISTRY).filter(([, item]) => item.parent === null && item.group === "demos");

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
          "fixed top-16 bottom-12 left-0 z-40 w-64 border-r border-white/5 bg-background/60 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex-1 overflow-y-auto p-4">
          {/* Core Nav */}
          <div className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">
            Platform
          </div>
          <div className="space-y-0.5 mb-4">
            {coreItems.map(([href, item]) => (
              <NavLink key={href} href={href} item={item} pathname={pathname} onClose={onClose} />
            ))}
          </div>

          {/* Admin Nav */}
          {adminItems.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 mt-2 border-t border-white/5 pt-4">
                Administration
              </div>
              <div className="space-y-0.5">
                {adminItems.map(([href, item]) => (
                  <NavLink key={href} href={href} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </div>
            </>
          )}

          {demoItems.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1 mt-2 border-t border-white/5 pt-4">
                Examples
              </div>
              <div className="space-y-0.5">
                {demoItems.map(([href, item]) => (
                  <NavLink key={href} href={href} item={item} pathname={pathname} onClose={onClose} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom telemetry strip — read from <head> meta, not a full hook */}
        <div className="border-t border-white/5 px-5 py-3 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">Gateway Connected</span>
        </div>
      </aside>
      
      {/* Sidebar Spacer for Desktop */}
      <div className="hidden lg:block w-64 shrink-0" />
    </>
  );
}
