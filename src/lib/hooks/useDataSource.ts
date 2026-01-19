"use client";

import { dataSource, DashboardStats, StreamMessage } from "@/lib/data/DataSource";
import { AuditEvent, GatewayStatus } from "@/lib/data/schemas";
import { useEffect, useState, useCallback } from "react";

export function useDataSource() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(true);

    const handleMessage = useCallback((msg: StreamMessage) => {
        if (msg.type === "audit_event") {
            setEvents(prev => {
                const isDuplicate = prev.some(e => e.event_id === msg.event.event_id);
                return isDuplicate ? prev : [msg.event, ...prev];
            });
            // Update stats logic (simplified)
            setStats(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    requests_24h: prev.requests_24h + 1,
                };
            });
        } else if (msg.type === "gateway_status") {
            setGatewayStatus(msg.status);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        async function init() {
            try {
                const now = Math.floor(Date.now() / 1000);
                
                // Fetch stats and events in parallel, but handle failures gracefully
                const [statsData, eventsPage, statusData] = await Promise.allSettled([
                    dataSource.getStats({ from: now - 86400, to: now }),
                    dataSource.listAuditEvents({ limit: 20 }),
                    dataSource.getGatewayStatus()
                ]);

                // Process stats
                if (statsData.status === 'fulfilled') {
                    setStats(statsData.value);
                } else {
                    console.warn('Failed to fetch stats:', statsData.reason);
                    // Set empty stats to prevent loading spinner
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
                } else {
                    console.warn('Failed to fetch events:', eventsPage.reason);
                }

                // Process gateway status
                if (statusData.status === 'fulfilled') {
                    setGatewayStatus(statusData.value);
                } else {
                    console.warn('Failed to fetch gateway status:', statusData.reason);
                }
            } catch (err) {
                console.error("Failed to load initial data", err);
            } finally {
                setLoading(false);
            }
        }
        init();

        // Subscribe to Live Stream
        const unsubscribe = dataSource.subscribe(handleMessage);

        return () => unsubscribe();
    }, [handleMessage]);

    const loadMore = useCallback(async () => {
        if (!cursor || loadingMore) return;
        setLoadingMore(true);
        try {
            const page = await dataSource.listAuditEvents({ limit: 20, cursor });
            setEvents(prev => [...prev, ...page.items]);
            setCursor(page.next_cursor);
            setHasMore(page.has_more);
        } catch (err) {
            console.error("Failed to load more events", err);
        } finally {
            setLoadingMore(false);
        }
    }, [cursor, loadingMore]);

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
