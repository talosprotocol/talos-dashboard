import Link from 'next/link';
import { Shield, User } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center px-6 w-full">
        <div className="mr-6 flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none">Talos Protocol</span>
            <span className="text-xs text-muted-foreground">Security Console</span>
          </div>
        </div>
        
        <nav className="flex flex-1 items-center justify-end space-x-6 text-sm font-medium">
          <Link
            href="/status"
            className="transition-colors hover:text-primary text-muted-foreground"
          >
            System Status
          </Link>
          <Link
            href="https://docs.talosprotocol.com"
            target="_blank"
            className="transition-colors hover:text-primary text-muted-foreground"
          >
            Documentation
          </Link>
          
          {/* User Profile Button */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
