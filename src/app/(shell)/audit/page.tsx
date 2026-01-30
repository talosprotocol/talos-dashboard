"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { AuditTable } from "@/components/dashboard/AuditTable";
import { AuditFilters } from "@/lib/data/DataSourceTypes";
import { ListFilter } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ExportDialog } from "@/components/dashboard/ExportDialog";
import { AuditFiltersPanel } from "@/components/dashboard/AuditFiltersPanel";
import { CursorMismatchBanner } from "@/components/dashboard/CursorMismatchBanner";
import { downloadBulkEvidenceBundle } from "@/lib/utils/export";
import { RedactionLevel } from "@talosprotocol/contracts";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuditState, selectOrderedEvents, selectInvalidEvents, selectCanFetchMore } from "@/lib/hooks/useAuditState";
import { useAuditSSE } from "@/lib/hooks/useAuditSSE";
import { motion } from "framer-motion";

function AuditPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    // Parse filters from URL
    const filters: AuditFilters = useMemo(() => {
        const newFilters: AuditFilters = {};
        if (searchParams.get("session_id")) newFilters.session_id = searchParams.get("session_id")!;
        if (searchParams.get("correlation_id")) newFilters.correlation_id = searchParams.get("correlation_id")!;
        const outcome = searchParams.get("outcome");
        if (outcome === "OK" || outcome === "DENY" || outcome === "ERROR") {
            newFilters.outcome = outcome;
        }
        if (searchParams.get("denial_reason")) newFilters.denial_reason = searchParams.get("denial_reason")!;
        return newFilters;
    }, [searchParams]);

    // State machine
    const { state, dispatch, fetchMore } = useAuditState(filters);

    // SSE connection
    useAuditSSE({ filters, dispatch });

    // UI State
    const [showFilters, setShowFilters] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [mismatchDismissed, setMismatchDismissed] = useState(false);

    // Derived data
    const orderedEvents = selectOrderedEvents(state);
    const invalidEvents = selectInvalidEvents(state);
    const canFetchMore = selectCanFetchMore(state);

    // Filter change handler
    const handleFilterChange = useCallback((newFilters: AuditFilters) => {
        const params = new URLSearchParams();
        if (newFilters.session_id) params.set("session_id", newFilters.session_id);
        if (newFilters.correlation_id) params.set("correlation_id", newFilters.correlation_id);
        if (newFilters.outcome) params.set("outcome", newFilters.outcome);
        if (newFilters.denial_reason) params.set("denial_reason", newFilters.denial_reason);
        router.replace(`/audit?${params.toString()}`);
    }, [router]);

    // Export handler
    const handleExport = useCallback(async ({ redactionLevel }: { redactionLevel: RedactionLevel }) => {
        setIsExporting(true);
        try {
            const eventsToExport = selectedIds.size > 0
                ? orderedEvents.filter(e => selectedIds.has(e.event_id))
                : orderedEvents;

            const sortedEvents = [...eventsToExport].sort((a, b) =>
                (a.cursor || "").localeCompare(b.cursor || ""));
            const cursorRange = sortedEvents.length > 0 ? {
                start: sortedEvents[0]?.cursor,
                end: sortedEvents[sortedEvents.length - 1]?.cursor
            } : undefined;

            let gatewaySnapshot;
            try {
                const res = await fetch('/api/gateway/status');
                if (res.ok) {
                    gatewaySnapshot = await res.json();
                }
            } catch (e) {
                console.warn("Could not fetch gateway status for export:", e);
            }

            await downloadBulkEvidenceBundle({
                events: eventsToExport,
                redactionLevel,
                dashboardVersion: "1.0.0",
                filters: filters,
                cursorRange,
                gatewaySnapshot,
            });
            setShowExport(false);
            setSelectedIds(new Set());
        } catch (e) {
            console.error("Export failed", e);
            toast({
                title: "Export Failure",
                description: `Operation aborted: ${e instanceof Error ? e.message : String(e)}`,
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    }, [selectedIds, orderedEvents, filters, toast]);

    // Compute outcome counts for export
    const outcomeCounts = useMemo(() => {
        const eventsToCount = selectedIds.size > 0
            ? orderedEvents.filter(e => selectedIds.has(e.event_id))
            : orderedEvents;
        return eventsToCount.reduce((acc, e) => {
            const outcome = (e.outcome as "OK" | "DENY" | "ERROR") || "OK";
            acc[outcome] = (acc[outcome] || 0) + 1;
            return acc;
        }, { OK: 0, DENY: 0, ERROR: 0 });
    }, [orderedEvents, selectedIds]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Audit <span className="text-indigo-400">Explorer</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium max-w-2xl">
                        Monitor and analyze security audit events across the protocol in real-time.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowExport(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all duration-300"
                    >
                        <ListFilter className="h-3.5 w-3.5 rotate-180" />
                        Export
                    </button>

                    <GlassPanel
                        variant="hoverable"
                        className={`px-4 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all duration-300 ${showFilters ? 'text-indigo-400 border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'text-slate-400 border-white/5'}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <ListFilter className="h-3.5 w-3.5" />
                        <span>Filters</span>
                        {Object.keys(filters).length > 0 && (
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                                {Object.keys(filters).length}
                            </span>
                        )}
                    </GlassPanel>
                    
                    <GlassPanel className={`px-4 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border-white/5 shadow-2xl ${
                        process.env.NEXT_PUBLIC_TALOS_DATA_MODE === 'MOCK' 
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                            process.env.NEXT_PUBLIC_TALOS_DATA_MODE === 'MOCK' ? 'bg-amber-500' : 'bg-emerald-500'
                        } animate-pulse`} />
                        {process.env.NEXT_PUBLIC_TALOS_DATA_MODE || 'HTTP'} Mode
                    </GlassPanel>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <AuditFiltersPanel
                    filters={filters}
                    onChange={handleFilterChange}
                    onClose={() => setShowFilters(false)}
                />
            )}

            {/* Status Messages */}
            {state.connectionState === 'reconnecting' && (
                <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-500">
                    Reconnecting to audit stream...
                </div>
            )}

            {!mismatchDismissed && invalidEvents.length > 0 && (
                <CursorMismatchBanner
                    errors={invalidEvents.map(e => ({
                        eventId: e.event_id,
                        cursor: e.cursor || '',
                        derived: '',
                        reason: 'CURSOR_MISMATCH'
                    }))}
                    onDismiss={() => setMismatchDismissed(true)}
                />
            )}

            {state.phase === 'error' && state.error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                    {state.error.message}
                </div>
            )}

            {/* Audit Table */}
            <AuditTable
                data={orderedEvents}
                onFetchMore={canFetchMore ? fetchMore : undefined}
                isLoading={state.phase === 'loading_more' || state.phase === 'loading_initial'}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
            />

            {/* Export Dialog */}
            <ExportDialog
                mode={selectedIds.size > 0 ? "selected" : "filtered"}
                selectedCount={selectedIds.size}
                filteredCount={orderedEvents.length}
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                isExporting={isExporting}
                onExport={handleExport}
                outcomeCounts={outcomeCounts}
            />
        </motion.div>
    );
}

// Next.js requires useSearchParams to be wrapped in Suspense
export default function AuditPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-96 text-muted-foreground">
                Loading...
            </div>
        }>
            <AuditPageContent />
        </Suspense>
    );
}
