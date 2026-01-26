export function DashboardFooter() {
  const year = new Date().getFullYear();
  const dataMode = process.env.NEXT_PUBLIC_TALOS_DATA_MODE || 'HTTP';
  const isMockMode = dataMode === 'MOCK';
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-12 border-t border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 z-30">
      <div className="h-full flex items-center justify-end px-6 w-full text-xs text-muted-foreground">
        {/* Right Corner: Copyright, License, Version, Mode */}
        <div className="flex items-center gap-4">
          <p>© {year} Talos Protocol</p>
          <span className="text-muted-foreground/40">•</span>
          <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            Apache 2.0 License
          </a>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground/60">v0.1.0</span>
          {isMockMode && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                DEV Mode
              </span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
