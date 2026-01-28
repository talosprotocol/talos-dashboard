"use client";

import { useDataSource } from "@/lib/hooks/useDataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SessionTimeline } from "@/components/dashboard/SessionTimeline";
import { useMemo, useState } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { computeSuspiciousScore } from "@/lib/analysis/scoring";
import { downloadBulkEvidenceBundle } from "@/lib/utils/export";

export default function SessionDetailPage({ params }: { params: { id: string } }) {
    const { events } = useDataSource();
    const sessionId = params.id;
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const sessionEvents = useMemo(() => {
        // Desc order by default in mock
        return events.filter(e => e.session_id === sessionId);
    }, [events, sessionId]);

    const scoreData = useMemo(() => {
        const scores = computeSuspiciousScore(sessionEvents);
        return scores.get(sessionId);
    }, [sessionEvents, sessionId]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await downloadBulkEvidenceBundle({
                events: sessionEvents,
                redactionLevel: "safe_default", // Default for session export
                dashboardVersion: "1.0.0",
                filters: { session_id: sessionId }
            });
        } catch (e) {
            console.error("Session export failed", e);
            toast({
                title: "Evidence Extraction Failure",
                description: `Failed to export session data: ${e instanceof Error ? e.message : String(e)}`,
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[var(--bg)] p-8 font-sans text-[var(--text-primary)]">
            <div className="flex items-center justify-between mb-6">
                <Link href="/sessions" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm w-fit">
                    <ArrowLeft className="w-4 h-4" /> Back to Sessions
                </Link>
                <div className="flex items-center gap-2">
                     <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-3 py-1.5 flex items-center gap-2 text-xs font-medium bg-[var(--panel)] border border-[var(--glass-border)] text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-md transition-colors disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isExporting ? "Exporting..." : "Export Evidence"}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats & Meta */}
                <div className="space-y-6">
                    <GlassPanel className="p-6">
                        <div className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider mb-1">Session ID</div>
                        <div className="text-lg font-mono font-bold break-all">{sessionId}</div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-xs text-[var(--text-muted)] uppercase font-bold tracking-wider">Risk Score</div>
                            <div className={`text-3xl font-mono font-bold ${scoreData && scoreData.score > 10 ? "text-rose-500" : "text-emerald-500"}`}>
                                {scoreData?.score ?? 0}
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">Event Breakdown</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Total Events</span>
                                <span className="font-mono">{sessionEvents.length}</span>
                            </div>
                            {scoreData?.breakdown.replays ? (
                                <div className="flex justify-between text-rose-400">
                                    <span>Replays</span>
                                    <span className="font-mono">{scoreData.breakdown.replays}</span>
                                </div>
                            ) : null}
                            {scoreData?.breakdown.unknownTools ? (
                                <div className="flex justify-between text-amber-400">
                                    <span>Unknown Tools</span>
                                    <span className="font-mono">{scoreData.breakdown.unknownTools}</span>
                                </div>
                            ) : null}
                             <div className="pt-2 border-t border-[var(--glass-border)] mt-2">
                                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                    <span>Start Time</span>
                                    <span className="font-mono">{sessionEvents[sessionEvents.length - 1] ? new Date(sessionEvents[sessionEvents.length - 1].timestamp * 1000).toLocaleTimeString() : "-"}</span>
                                </div>
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                    <span>Last Activity</span>
                                    <span className="font-mono">{sessionEvents[0] ? new Date(sessionEvents[0].timestamp * 1000).toLocaleTimeString() : "-"}</span>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                {/* Right Column: Timeline */}
                <div className="lg:col-span-2">
                    <h2 className="text-lg font-bold mb-4">Session Timeline</h2>
                    {sessionEvents.length > 0 ? (
                        <SessionTimeline
                            events={sessionEvents}
                            hasMore={false}
                            onLoadMore={() => { }}
                        />
                    ) : (
                        <div className="text-[var(--text-muted)] text-sm italic">No events found for this session.</div>
                    )}
                </div>
            </div>
        </main>
    );
}
