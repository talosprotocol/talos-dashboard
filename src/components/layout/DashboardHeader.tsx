import Link from 'next/link';
import { Shield } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 w-full">
        <div className="mr-6 flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none tracking-tight">Talos Protocol</span>
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mt-0.5">Security Console</span>
          </div>
        </div>
        
        <nav className="flex flex-1 items-center justify-end space-x-6 text-sm font-medium">
          <Link
            href="/status"
            className="transition-colors hover:text-white text-slate-400 text-xs uppercase tracking-wider font-semibold"
          >
            System Status
          </Link>
          <Link
            href="/management"
            className="transition-colors hover:text-white text-slate-400 text-xs uppercase tracking-wider font-semibold"
          >
            Management
          </Link>
          <Link
            href="https://docs.talosprotocol.com"
            target="_blank"
            className="transition-colors hover:text-white text-slate-400 text-xs uppercase tracking-wider font-semibold"
          >
            Documentation
          </Link>
          
          {/* User Profile Button */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                A
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-slate-300 group-hover:text-white">Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
