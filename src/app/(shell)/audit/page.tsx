"use client";

import { useState, useCallback, Suspense, useMemo } from "react";
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

function AuditPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

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
            alert("Export failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsExporting(false);
        }
    }, [selectedIds, orderedEvents, filters]);

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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Explorer</h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor and analyze security audit events in real-time
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowExport(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <ListFilter className="h-4 w-4 rotate-180" />
                        Export
                    </button>

                    <GlassPanel
                        variant="hoverable"
                        className={`px-4 py-2 flex items-center gap-2 text-sm cursor-pointer ${showFilters ? 'text-primary border-primary' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <ListFilter className="h-4 w-4" />
                        <span>Filters</span>
                        {Object.keys(filters).length > 0 && (
                            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                {Object.keys(filters).length}
                            </span>
                        )}
                    </GlassPanel>
                    
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
                        process.env.NEXT_PUBLIC_TALOS_DATA_MODE === 'MOCK' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                            : 'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>
                        <span className={`h-2 w-2 rounded-full ${
                            process.env.NEXT_PUBLIC_TALOS_DATA_MODE === 'MOCK' ? 'bg-amber-500' : 'bg-green-500'
                        } animate-pulse`} />
                        {process.env.NEXT_PUBLIC_TALOS_DATA_MODE || 'HTTP'} Mode
                    </span>
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
        </div>
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
