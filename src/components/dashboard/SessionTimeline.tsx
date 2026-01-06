import { AuditEvent } from "@/lib/data/schemas";
import { cn } from "@/lib/cn";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ProofDrawer, computeProofBadge } from "./ProofDrawer"; 
import { GlassPanel } from "@/components/ui/GlassPanel";

interface SessionTimelineProps {
    sessionId?: string; // Made optional or remove if unused. Let's remove if truly unused. But interface might need it for future.
    events: AuditEvent[];
    onLoadMore?: () => void;
    hasMore?: boolean;
}

export function SessionTimeline({ events, hasMore, onLoadMore }: SessionTimelineProps) {
    const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

    return (
        <div className="relative pl-6 space-y-6">
            {/* Vertical Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--glass-border)] z-0" />

            {events.map((event) => {
                const isError = event.outcome === "ERROR";
                const isDeny = event.outcome === "DENY";
                // isLast removed

                return (
                    <div key={event.event_id} className="relative z-10 group">
                        {/* Dot */}
                        <div className={cn(
                            "absolute left-[-24px] top-3 w-3 h-3 rounded-full border-2 border-[var(--bg)] shadow-sm transition-colors duration-200",
                            isError ? "bg-red-500 box-shadow-red" :
                                isDeny ? "bg-amber-500 box-shadow-amber" :
                                    "bg-emerald-500 box-shadow-emerald"
                        )} />

                        {/* Card */}
                        <GlassPanel 
                            variant="hoverable"
                            onClick={() => setSelectedEvent(event)}
                            className="p-3 ml-2 cursor-pointer transition-all hover:translate-x-1"
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-xs font-bold px-1.5 py-0.5 rounded uppercase",
                                        isError ? "bg-red-500/10 text-red-500" :
                                            isDeny ? "bg-amber-500/10 text-amber-500" :
                                                "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        {event.outcome}
                                    </span>
                                    <span className="text-sm font-semibold">{event.method}</span>
                                </div>
                                <span className="text-xs text-[var(--text-muted)] font-mono">
                                    {new Date(event.timestamp * 1000).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="text-xs text-[var(--text-secondary)] font-mono truncate mb-2">
                                {event.event_id}
                            </div>

                            {/* Metadata / Indicators */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--glass-border)] px-1.5 py-0.5 rounded">
                                    {event.event_type}
                                </span>
                                
                                {isDeny && (
                                    <span className="text-[10px] text-amber-500 font-bold">
                                        {event.denial_reason}
                                    </span>
                                )}

                                {/* Integrity Badge (Mini) */}
                                {(() => {
                                     const badge = computeProofBadge(event.integrity);
                                     if (badge === "FAILED" || event.integrity.failure_reason === "CURSOR_MISMATCH") {
                                         return (
                                             <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold ml-auto">
                                                 <ShieldAlert className="w-3 h-3" />
                                                 Invalid
                                             </span>
                                         );
                                     }
                                     return null;
                                })()}
                            </div>
                        </GlassPanel>
                    </div>
                );
            })}

            {hasMore && (
                 <div className="relative z-10 pt-4">
                     <div className="absolute left-[-23px] top-6 w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-50" />
                     <button
                         onClick={onLoadMore}
                         className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline ml-2"
                     >
                         Load older events...
                     </button>
                 </div>
            )}

            {/* Drawer Overlay */}
            {selectedEvent && (
                <>
                    <div 
                        role="button"
                        tabIndex={0}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 outline-none" 
                        onClick={() => setSelectedEvent(null)} 
                        onKeyDown={(e) => e.key === 'Escape' && setSelectedEvent(null)}
                    />
                    <ProofDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                </>
            )}
        </div>
    );
}
