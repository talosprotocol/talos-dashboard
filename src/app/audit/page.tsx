"use client";

import { useState, useCallback, useEffect, Suspense, useMemo } from "react";
import { AuditTable } from "@/components/dashboard/AuditTable";
import { dataSource, AuditFilters, StreamMessage } from "@/lib/data/DataSource";
import { AuditEvent } from "@/lib/data/schemas";
import { ListFilter } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ExportDialog } from "@/components/dashboard/ExportDialog";
import { AuditFiltersPanel } from "@/components/dashboard/AuditFiltersPanel";
import { GapBanner } from "@/components/dashboard/GapBanner";
import { CursorMismatchBanner, CursorValidationError } from "@/components/dashboard/CursorMismatchBanner";
import { downloadBulkEvidenceBundle } from "@/lib/utils/export";
import { RedactionLevel, checkCursorContinuity, CursorGap, assertCursorInvariant } from "@talosprotocol/contracts";
import { useSearchParams, useRouter } from "next/navigation";

function AuditPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Filters State (Synced with URL)
    const [filters, setFilters] = useState<AuditFilters>({});
    const [showFilters, setShowFilters] = useState(false);

    // Data State
    const [data, setData] = useState<AuditEvent[]>([]);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Export State
    const [showExport, setShowExport] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Gap Detection State
    const [cursorGaps, setCursorGaps] = useState<CursorGap[]>([]);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [backfillProgress, setBackfillProgress] = useState(0);
    const [gapDismissed, setGapDismissed] = useState(false);

    // Cursor Mismatch State
    const [cursorErrors, setCursorErrors] = useState<CursorValidationError[]>([]);
    const [mismatchDismissed, setMismatchDismissed] = useState(false);

    // Compute outcome counts for export preview
    const outcomeCounts = useMemo(() => {
        const eventsToCount = selectedIds.size > 0 
            ? data.filter(e => selectedIds.has(e.event_id))
            : data;
        return eventsToCount.reduce((acc, e) => {
            const outcome = (e.outcome as "OK" | "DENY" | "ERROR") || "OK";
            acc[outcome] = (acc[outcome] || 0) + 1;
            return acc;
        }, { OK: 0, DENY: 0, ERROR: 0 });
    }, [data, selectedIds]);

    // 1. Initialize Filters from URL
    useEffect(() => {
        const newFilters: AuditFilters = {};
        if (searchParams.get("session_id")) newFilters.session_id = searchParams.get("session_id")!;
        if (searchParams.get("correlation_id")) newFilters.correlation_id = searchParams.get("correlation_id")!;
        const outcome = searchParams.get("outcome");
        if (outcome === "OK" || outcome === "DENY" || outcome === "ERROR") {
            newFilters.outcome = outcome;
        }
        if (searchParams.get("denial_reason")) newFilters.denial_reason = searchParams.get("denial_reason")!;
        
        // Only set if different to avoid loops
        setFilters(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newFilters)) {
                return newFilters;
            }
            return prev;
        });
    }, [searchParams]);

    // 2. Sync Filters to URL
    const handleFilterChange = (newFilters: AuditFilters) => {
        setFilters(newFilters);
        const params = new URLSearchParams();
        if (newFilters.session_id) params.set("session_id", newFilters.session_id);
        if (newFilters.correlation_id) params.set("correlation_id", newFilters.correlation_id);
        if (newFilters.outcome) params.set("outcome", newFilters.outcome);
        if (newFilters.denial_reason) params.set("denial_reason", newFilters.denial_reason);
        router.replace(`/audit?${params.toString()}`);
    };

    // 3. Reset Data on Filter Change
    useEffect(() => {
        setData([]);
        setCursor(undefined);
        setHasMore(true);
        setSelectedIds(new Set()); // Clear selection on filter change
        // We need to trigger a fetch, but fetchMore depends on state.
        // We'll let the effect below trigger it if we reset cursor to undefined.
        // Actually, we validly want to re-fetch immediately.
        // But let's rely on a separate effect or just call fetch directly if we weren't in render.
        // Better: Reset logic triggers a flag or we just call fetchMore with explicit reset?
        // Limitation: react effects run after render.
    }, [filters]);

    // 4. Fetch Logic
    const fetchMore = useCallback(async (reset = false) => {
        if (!reset && (loading || !hasMore)) return;
        setLoading(true);
        try {
            const page = await dataSource.listAuditEvents({
                limit: 50,
                cursor: reset ? undefined : cursor,
                filters: filters
            });

            setData(prev => {
                if (reset) return page.items;
                return [...prev, ...page.items];
            });

            setCursor(page.next_cursor);
            setHasMore(page.has_more);
        } catch (err) {
            console.error("Audit load error", err);
        } finally {
            setLoading(false);
        }
    }, [cursor, loading, hasMore, filters]);

    // Initial Load & Filter Change Load
    // We listen to filters changing. To avoid double fetching on mount (URL parse -> filter set -> fetch),
    // we can debounce or just let it happen.
    // However, the Reset effect above clears data. We need to fetch AFTER clear.
    // Initial Load & Filter Change Load
    // Initial Load & Filter Change Load
    const handleLiveEvent = useCallback((msg: StreamMessage) => {
        if (msg.type !== "audit_event") return;
        setData(prev => {
            const isDuplicate = prev.some(e => e.event_id === msg.event.event_id);
            return isDuplicate ? prev : [msg.event, ...prev];
        });
    }, []);

    useEffect(() => {
        fetchMore(true);
        const unsubscribe = dataSource.subscribe(handleLiveEvent, filters);
        return () => unsubscribe();
    }, [filters, fetchMore, handleLiveEvent]); 

    // Gap Detection Effect
    useEffect(() => {
        if (data.length < 2) {
            setCursorGaps([]);
            return;
        }
        // Prepare events for continuity check
        const eventsForCheck = data.map(e => ({
            cursor: e.cursor || "",
            timestamp: new Date(e.timestamp).getTime()
        }));
        const result = checkCursorContinuity(eventsForCheck);
        setCursorGaps(result.gaps);
        setGapDismissed(false); // Reset dismiss on new data
    }, [data]);

    // Cursor Validation Effect
    useEffect(() => {
        const errors: CursorValidationError[] = [];
        for (const event of data) {
            const result = assertCursorInvariant({
                timestamp: Math.floor(new Date(event.timestamp).getTime() / 1000),
                event_id: event.event_id,
                cursor: event.cursor || ""
            });
            if (!result.ok && result.reason) {
                errors.push({
                    eventId: event.event_id,
                    cursor: event.cursor || "",
                    derived: result.derived,
                    reason: result.reason as "CURSOR_MISMATCH" | "INVALID_FRAME"
                });
            }
        }
        setCursorErrors(errors);
        setMismatchDismissed(false);
    }, [data]);

    // Backfill Handler
    const handleBackfill = useCallback(async () => {
        if (cursorGaps.length === 0) return;
        setIsBackfilling(true);
        setBackfillProgress(0);
        
        // For each gap, attempt to fetch events in range
        for (let i = 0; i < cursorGaps.length; i++) {
            const gap = cursorGaps[i];
            try {
                // Fetch events after gap.from_cursor up to gap.to_cursor
                const page = await dataSource.listAuditEvents({
                    limit: 100,
                    cursor: gap.from_cursor,
                    filters
                });
                
                // Insert fetched events into data
                if (page.items.length > 0) {
                    setData(prev => {
                        const newEvents = page.items.filter(
                            item => !prev.some(e => e.event_id === item.event_id)
                        );
                        return [...prev, ...newEvents].sort((a, b) => 
                            (a.cursor || "").localeCompare(b.cursor || ""));
                    });
                }
            } catch (e) {
                console.error("Backfill failed for gap:", gap, e);
            }
            setBackfillProgress(((i + 1) / cursorGaps.length) * 100);
        }
        
        setIsBackfilling(false);
    }, [cursorGaps, filters]);

    // Handle Export
    const handleExport = async ({ redactionLevel }: { redactionLevel: RedactionLevel }) => {
        setIsExporting(true);
        try {
            // If selection exists, export selected. Else export current view (up to limit)
            const eventsToExport = selectedIds.size > 0 
                ? data.filter(e => selectedIds.has(e.event_id))
                : data;
            
            // Compute cursor range from first and last events
            const sortedEvents = [...eventsToExport].sort((a, b) => 
                (a.cursor || "").localeCompare(b.cursor || ""));
            const cursorRange = sortedEvents.length > 0 ? {
                start: sortedEvents[0]?.cursor,
                end: sortedEvents[sortedEvents.length - 1]?.cursor
            } : undefined;

            // Fetch gateway status for snapshot
            let gatewaySnapshot;
            try {
                gatewaySnapshot = await dataSource.getGatewayStatus();
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
    };

    return (
        <main className="h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text-primary)] overflow-hidden relative">
            <header className="flex-shrink-0 h-16 border-b border-[var(--glass-border)] bg-[var(--panel)] backdrop-blur px-6 flex items-center justify-between">
                <h1 className="font-bold text-lg tracking-tight">Audit Explorer</h1>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowExport(true)}
                        className="px-3 py-1.5 flex items-center gap-2 text-xs font-medium bg-[var(--panel)] border border-[var(--glass-border)] text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-md transition-colors"
                    >
                        <ListFilter className="w-3.5 h-3.5 rotate-180" />
                        <span>Export</span>
                    </button>

                    <GlassPanel 
                        variant="hoverable" 
                        className={`px-3 py-1.5 flex items-center gap-2 text-xs cursor-pointer ${showFilters ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <ListFilter className="w-3.5 h-3.5" />
                        <span>Filters</span>
                        {Object.keys(filters).length > 0 && (
                            <span className="ml-1 w-4 h-4 rounded-full bg-[var(--accent)] text-[var(--bg)] flex items-center justify-center text-[9px] font-bold">
                                {Object.keys(filters).length}
                            </span>
                        )}
                    </GlassPanel>
                </div>
            </header>

            {showFilters && (
                <AuditFiltersPanel 
                    filters={filters} 
                    onChange={handleFilterChange} 
                    onClose={() => setShowFilters(false)} 
                />
            )}

            <div className="flex-1 p-6 overflow-hidden">
                {/* Gap Warning Banner */}
                {!gapDismissed && cursorGaps.length > 0 && (
                    <GapBanner
                        gaps={cursorGaps}
                        onBackfill={handleBackfill}
                        isBackfilling={isBackfilling}
                        progress={backfillProgress}
                        onDismiss={() => setGapDismissed(true)}
                    />
                )}

                {/* Cursor Mismatch Banner */}
                {!mismatchDismissed && cursorErrors.length > 0 && (
                    <CursorMismatchBanner
                        errors={cursorErrors}
                        onDismiss={() => setMismatchDismissed(true)}
                    />
                )}

                <AuditTable
                    data={data}
                    onFetchMore={() => fetchMore(false)}
                    isLoading={loading}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            </div>

            <ExportDialog
                mode={selectedIds.size > 0 ? "selected" : "filtered"}
                selectedCount={selectedIds.size}
                filteredCount={data.length} 
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                isExporting={isExporting}
                onExport={handleExport}
                outcomeCounts={outcomeCounts}
            />
        </main>
    );
}

// Next.js 16 requires useSearchParams to be wrapped in Suspense for static generation
export default function AuditPage() {
    return (
        <Suspense fallback={
            <main className="h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text-secondary)]">
                Loading...
            </main>
        }>
            <AuditPageContent />
        </Suspense>
    );
}
