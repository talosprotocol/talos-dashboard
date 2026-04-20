"use client";

import { dataSource, DashboardStats, StreamMessage, DataMode, createDataSource } from "@/lib/data/DataSource";
import { AuditEvent, GatewayStatus } from "@/lib/data/schemas";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

export function useDataSource(modeOverride?: DataMode) {
    // Memoize data source if mode is overridden
    const ds = useMemo(() => {
        return modeOverride ? createDataSource(modeOverride) : dataSource;
    }, [modeOverride]);

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);

    // Batching refs to prevent jitter
    const pendingStatsUpdate = useRef<{ 
        requests: number, 
        denials: Record<string, number>,
        newEvents: AuditEvent[] 
    }>({ 
        requests: 0, 
        denials: {},
        newEvents: []
    });

    const handleMessage = useCallback((msg: StreamMessage) => {
        if (msg.type === "audit_event") {
            pendingStatsUpdate.current.requests++;
            pendingStatsUpdate.current.newEvents.push(msg.event);
            if (msg.event.outcome === "DENY" && msg.event.denial_reason) {
                const reason = msg.event.denial_reason;
                pendingStatsUpdate.current.denials[reason] = (pendingStatsUpdate.current.denials[reason] || 0) + 1;
            }
        } else if (msg.type === "gateway_status") {
            setGatewayStatus(msg.status);
        }
    }, []);

    // Flush pending updates every 1000ms
    useEffect(() => {
        const interval = setInterval(() => {
            const { requests, denials, newEvents } = pendingStatsUpdate.current;
            if (requests === 0 && newEvents.length === 0) return;

            // Reset pending
            pendingStatsUpdate.current = { requests: 0, denials: {}, newEvents: [] };

            // Update Events
            if (newEvents.length > 0) {
                setEvents(prev => {
                    const uniqueNew = newEvents.filter(ne => !prev.some(pe => pe.event_id === ne.event_id));
                    if (uniqueNew.length === 0) return prev;
                    return [...uniqueNew, ...prev].slice(0, 100);
                });
            }

            // Update Stats
            setStats(prev => {
                if (!prev) return null;

                const newRequests24h = prev.requests_24h + requests;
                const newDenialCounts = { ...prev.denial_reason_counts };
                Object.entries(denials).forEach(([reason, count]) => {
                    newDenialCounts[reason] = (newDenialCounts[reason] || 0) + count;
                });

                // Recalculate success rate
                const totalDenials = Object.values(newDenialCounts).reduce((a, b) => a + b, 0);
                const newSuccessRate = newRequests24h > 0 ? (newRequests24h - totalDenials) / newRequests24h : 1;

                // Update volume series (last bucket)
                const newSeries = [...prev.request_volume_series];
                newEvents.forEach(evt => {
                    const bucketTime = Math.floor(evt.timestamp / 3600) * 3600;
                    const bucketIndex = newSeries.findIndex(s => s.time === bucketTime);
                    if (bucketIndex !== -1) {
                        const existingBucket = newSeries[bucketIndex];
                        newSeries[bucketIndex] = {
                            ...existingBucket,
                            ok: evt.outcome === "OK" ? existingBucket.ok + 1 : existingBucket.ok,
                            deny: evt.outcome === "DENY" ? existingBucket.deny + 1 : existingBucket.deny,
                            error: evt.outcome === "ERROR" ? existingBucket.error + 1 : existingBucket.error
                        };
                    } else {
                        newSeries.push({
                            time: bucketTime,
                            ok: evt.outcome === "OK" ? 1 : 0,
                            deny: evt.outcome === "DENY" ? 1 : 0,
                            error: evt.outcome === "ERROR" ? 1 : 0
                        });
                        newSeries.sort((a, b) => a.time - b.time);
                    }
                });

                return {
                    ...prev,
                    requests_24h: newRequests24h,
                    denial_reason_counts: newDenialCounts,
                    auth_success_rate: newSuccessRate,
                    request_volume_series: newSeries
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Worker Reference
    const workerRef = useRef<Worker | null>(null);

    // Update exposed API to allow forced refresh
    const refreshSection = useCallback((target: 'stats' | 'events' | 'gateway_status' | 'all') => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'REFRESH', target });
        }
    }, []);

    // Initial Load
    useEffect(() => {
        setLoading(true);

        // Instantiate Worker safely ensuring client environment
        if (typeof window !== "undefined" && !workerRef.current) {
            workerRef.current = new Worker(new URL('../data/prefetch.worker.ts', import.meta.url));
            
            workerRef.current.onmessage = (e: MessageEvent) => {
                const { type, payload } = e.data;
                
                if (type === 'DATA_STATS') {
                    setStats(prev => ({
                        ...prev,
                        ...payload
                    }));
                } else if (type === 'DATA_EVENTS') {
                    setEvents(payload.items);
                    setCursor(payload.next_cursor);
                    setHasMore(payload.has_more);
                } else if (type === 'DATA_GATEWAY_STATUS') {
                    setGatewayStatus(payload);
                }

                // If any core metric completes, we can kill the primary loading state
                setLoading(false);
            };

            workerRef.current.onerror = (e) => {
                console.error("Data Prefetch Worker Error:", e);
                setLoading(false);
            };

            // Kick off prefetch immediately
            workerRef.current.postMessage({ type: 'PREFETCH_INIT' });
        }

        // Subscribe to Live Stream
        const unsubscribe = ds.subscribe(handleMessage);

        return () => {
            unsubscribe();
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
        };
    }, [ds, handleMessage]);

    const loadMore = useCallback(async () => {
        if (!cursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await ds.listAuditEvents({ limit: 20, cursor });
            setEvents(prev => [...prev, ...page.items]);
            setCursor(page.next_cursor);
            setHasMore(page.has_more);
        } catch (err) {
            console.error("Failed to load more events", err);
        } finally {
            setLoadingMore(false);
        }
    }, [ds, cursor, loadingMore]);

    return {
        stats,
        events,
        gatewayStatus,
        loading,
        loadingMore,
        hasMore,
        loadMore,
        refreshSection
    };
}
