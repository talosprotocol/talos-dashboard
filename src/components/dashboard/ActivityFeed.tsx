"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { AuditEvent } from "@/lib/data/schemas";
import { cn } from "@/lib/cn";
import { AlertCircle, ArrowRightLeft, CheckCircle, ShieldAlert, Terminal } from "lucide-react";
import { useState } from "react";
import { ProofDrawer, computeProofBadge } from "./ProofDrawer";

import { motion, AnimatePresence } from "framer-motion";

interface ActivityFeedProps {
    events: AuditEvent[];
    hasMore: boolean;
    onLoadMore: () => void;
    isLoading: boolean;
}

export function ActivityFeed({ events, hasMore, onLoadMore, isLoading }: ActivityFeedProps) {
    const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

    return (
        <>
            <div className="w-full space-y-4">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Activity Stream</h3>
                    <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[10px] font-bold text-emerald-500 uppercase">Live</span>
                    </div>
                </div>

                {events.length === 0 && !isLoading && (
                    <GlassPanel className="text-center py-10 text-slate-500 text-sm italic bg-white/[0.01] border-white/5">No activity recorded</GlassPanel>
                )}

                <div className="space-y-3 pb-4">
                    <AnimatePresence initial={false}>
                        {events && events.map((event, index) => (
                            <motion.div
                                key={`${event.timestamp}-${event.event_id}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                            >
                                <ActivityItem
                                    event={event}
                                    onClick={() => setSelectedEvent(event)}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {hasMore && (
                    <button
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all duration-300"
                    >
                        {isLoading ? "Synchronizing..." : "Load History"}
                    </button>
                )}
            </div>

            {/* Drawer Overlay */}
            {selectedEvent && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedEvent(null)} />
                    <ProofDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
                </>
            )}
        </>
    );
}

function ActivityItem({ event, onClick }: { event: AuditEvent, onClick: () => void }) {
    const isError = event.outcome === "ERROR";
    const isDeny = event.outcome === "DENY";

    return (
        <GlassPanel
            variant="hoverable"
            onClick={onClick}
            className="flex items-center gap-4 p-3 group border-white/5"
        >
            {/* Icon Status */}
            <div className={cn(
                "p-2 rounded-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                isError ? "bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" :
                    isDeny ? "bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]" :
                        "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            )}>
                {isError ? <AlertCircle className="w-4 h-4" /> :
                    isDeny ? <ShieldAlert className="w-4 h-4" /> :
                        <CheckCircle className="w-4 h-4" />}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center">

                {/* Time & Method */}
                <div className="col-span-1 md:col-span-4 flex items-center justify-between md:justify-start gap-3 w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm tracking-tight truncate">{event.method}</span>
                        <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold bg-white/5 text-slate-400 rounded border border-white/5">{event.event_type}</span>
                    </div>
                    {/* Time visible on right for mobile, inline for desktop */}
                    <div className="text-[10px] text-slate-500 font-mono font-bold md:hidden">
                        {new Date(event.timestamp * 1000).toLocaleTimeString()}
                    </div>
                </div>

                {/* Desktop Timestamp (Hidden on mobile to avoid dupe) */}
                <div className="hidden md:block md:col-span-4 text-[10px] text-slate-500 font-mono font-bold">
                    {new Date(event.timestamp * 1000).toLocaleTimeString([], { hour12: false })}
                </div>

                {/* Identity & Hash - Stacked on mobile */}
                <div className="col-span-1 md:col-span-4 flex items-center justify-between md:justify-end gap-2 w-full">
                    {/* Identity */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <Terminal className="w-3 h-3 opacity-50" />
                        <span className="truncate max-w-[120px]" title={event.peer_id || event.agent_id}>
                            {event.peer_id ? `Peer: ${event.peer_id.slice(0, 8)}` : (event.agent_id ? `Agent: ${event.agent_id.slice(0, 8)}` : 'Unknown')}
                        </span>
                    </div>

                    {/* Integrity Indicators */}
                    {(() => {
                        const badge = computeProofBadge(event.integrity);
                        const isMismatch = event.integrity.failure_reason === "CURSOR_MISMATCH";

                        // Critical Mismatch
                        if (isMismatch) {
                            return (
                                <div className="flex items-center gap-1 text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse border border-red-500/20">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>TAMPERED</span>
                                </div>
                            )
                        }

                        // Other Failures
                        if (badge === "FAILED") {
                            return (
                                <div className="flex items-center gap-1 text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>FAILED</span>
                                </div>
                            )
                        }

                        // Missing/Unverified (Optional: only show if relevant, maybe generic shield?)
                        if (badge === "MISSING_INPUTS") {
                            return (
                                <span title="Missing Inputs">
                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                </span>
                            )
                        }

                        return null;
                    })()}

                    {/* Denial Reason / Hash */}
                    <div className="text-right">
                        {isDeny ? (
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded uppercase border border-amber-500/10">
                                {event.denial_reason}
                            </span>
                        ) : (
                            <div className="flex items-center justify-end gap-1.5 text-[10px] text-indigo-400 font-mono font-bold">
                                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                {event.hashes.request_hash?.slice(0, 8)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ArrowRightLeft className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
        </GlassPanel>
    )
}
