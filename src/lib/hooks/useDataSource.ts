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
    const pendingEvents = useRef<AuditEvent[]>([]);
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
                    const existingBucket = newSeries.find(s => s.time === bucketTime);
                    if (existingBucket) {
                        if (evt.outcome === "OK") existingBucket.ok++;
                        else if (evt.outcome === "DENY") existingBucket.deny++;
                        else existingBucket.error++;
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

    // Initial Load
    useEffect(() => {
        async function init() {
            setLoading(true);
            try {
                const now = Math.floor(Date.now() / 1000);
                
                // Fetch stats and events in parallel
                const [statsData, eventsPage, statusData] = await Promise.allSettled([
                    ds.getStats({ from: now - 86400, to: now }),
                    ds.listAuditEvents({ limit: 20 }),
                    ds.getGatewayStatus()
                ]);

                // Process stats
                if (statsData.status === 'fulfilled') {
                    setStats(statsData.value);
                } else {
                    setStats({
                        requests_24h: 0,
                        auth_success_rate: 0,
                        denial_reason_counts: {},
                        request_volume_series: []
                    });
                }

                // Process events
                if (eventsPage.status === 'fulfilled') {
                    setEvents(eventsPage.value.items);
                    setCursor(eventsPage.value.next_cursor);
                    setHasMore(eventsPage.value.has_more);
                }

                // Process gateway status
                if (statusData.status === 'fulfilled') {
                    setGatewayStatus(statusData.value);
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
            } finally {
                setLoading(false);
            }
        }
        init();

        // Subscribe to Live Stream
        const unsubscribe = ds.subscribe(handleMessage);

        return () => unsubscribe();
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
        loadMore
    };
}
