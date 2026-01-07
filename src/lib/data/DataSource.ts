import {
    AuditEvent,
    GatewayStatus,
    CursorPage
} from "./schemas";
import { MOCK_EVENTS } from "./mock/events";
import { MOCK_GATEWAY_STATUS } from "./mock/status";

// Import Refactored Types & Base Class
import { 
    DataSource, 
    DataMode, 
    DashboardStats, 
    AuditFilters, 
    StreamMessage 
} from "./DataSourceTypes";
import { HttpDataSource } from "./HttpDataSource";
import { WsDataSource } from "./WsDataSource"; // Safe static import
import { deriveCursor, decodeCursor } from "../integrity/cursor";

// Re-export for compatibility
export * from "./DataSourceTypes";
export * from "./HttpDataSource";
// export * from "./WsDataSource"; // Optional, but usually good practice

// --- Helpers ---

// Wrapper for backwards compatibility with old API shape
function decodeCursorCompat(cursor: string): { timestamp: number; eventId: string } | null {
    try {
        const result = decodeCursor(cursor);
        return { timestamp: result.timestamp, eventId: result.event_id };
    } catch {
        return null;
    }
}

// --- v3.2 Cursor Comparators (Frozen) ---

type CursorKey = { timestamp: number; eventId: string };

/**
 * Extract cursor key from an event.
 * Per v3.2: cursor_key(event) = (event.timestamp, event.event_id)
 */
export function cursorKey(event: { timestamp: number; event_id: string }): CursorKey {
    return { timestamp: event.timestamp, eventId: event.event_id };
}

/**
 * Compare cursor keys for ordering.
 * Per v3.2: older_or_equal(a, b) = a.timestamp < b.timestamp OR 
 *           (a.timestamp == b.timestamp AND a.event_id <= b.event_id)
 */
export function olderOrEqual(a: CursorKey, b: CursorKey): boolean {
    if (a.timestamp < b.timestamp) return true;
    if (a.timestamp === b.timestamp && a.eventId <= b.eventId) return true;
    return false;
}

// --- Mock Implementation ---

class MockDataSource implements DataSource {
    private readonly events = [...MOCK_EVENTS].sort((a, b) => b.timestamp - a.timestamp); // DESC

    async getGatewayStatus(): Promise<GatewayStatus> {
        return MOCK_GATEWAY_STATUS;
    }

    async getStats(range: { from: number; to: number }): Promise<DashboardStats> {
        const inRange = this.events.filter(e => e.timestamp >= range.from && e.timestamp <= range.to);

        // Compute Counts
        const total = inRange.length;
        const ok = inRange.filter(e => e.outcome === "OK").length;

        const denial_counts: Record<string, number> = {};
        inRange.filter(e => e.outcome === "DENY").forEach(e => {
            const reason = e.denial_reason || "UNKNOWN";
            denial_counts[reason] = (denial_counts[reason] || 0) + 1;
        });

        // Mock Series (Hourly buckets)
        const seriesMap = new Map<number, { ok: number, deny: number, error: number }>();
        inRange.forEach(e => {
            const bucket = Math.floor(e.timestamp / 3600) * 3600;
            if (!seriesMap.has(bucket)) seriesMap.set(bucket, { ok: 0, deny: 0, error: 0 });
            const entry = seriesMap.get(bucket)!;
            if (e.outcome === "OK") entry.ok++;
            else if (e.outcome === "DENY") entry.deny++;
            else entry.error++;
        });

        return {
            requests_24h: total,
            auth_success_rate: total > 0 ? ok / total : 1,
            denial_reason_counts: denial_counts,
            request_volume_series: Array.from(seriesMap.entries())
                .map(([time, data]) => ({ time, ...data }))
                .sort((a, b) => a.time - b.time),
            latency_percentiles: { p50: 5, p95: 12, p99: 45 }, // Mocked
        };
    }

    async listAuditEvents({ limit, cursor, filters }: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>> {
        let subset = this.events;

        // Apply Filters
        if (filters) {
            if (filters.outcome) subset = subset.filter(e => e.outcome === filters.outcome);
            if (filters.session_id) subset = subset.filter(e => e.session_id === filters.session_id);
            if (filters.correlation_id) subset = subset.filter(e => e.correlation_id === filters.correlation_id);
            if (filters.denial_reason) subset = subset.filter(e => e.denial_reason === filters.denial_reason);
        }

        // Apply Cursor (Pagination)
        if (cursor) {
            const decoded = decodeCursorCompat(cursor);
            if (decoded) {
                // Find split point: Older than timestamp (DESC)
                // Or same timestamp but smaller ID
                subset = subset.filter(e => {
                    if (e.timestamp < decoded.timestamp) return true;
                    if (e.timestamp === decoded.timestamp && e.event_id < decoded.eventId) return true;
                    return false;
                });
            }
        }

        const items = subset.slice(0, limit);
        const lastItem = items.at(-1);

        return {
            items,
            next_cursor: lastItem ? deriveCursor(lastItem.timestamp, lastItem.event_id) : undefined,
            has_more: subset.length > limit,
        };
    }

    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void {
        // Mock live stream: emit a random event every 5 seconds
        const interval = setInterval(() => {
            const randomEvent = this.events[Math.floor(Math.random() * this.events.length)];

            // Apply Filters
            if (filters) {
                if (filters.session_id && randomEvent.session_id !== filters.session_id) return;
                if (filters.outcome && randomEvent.outcome !== filters.outcome) return;
                if (filters.correlation_id && randomEvent.correlation_id !== filters.correlation_id) return;
            }

            // Clone and bump timestamp to make it "new"
            const newEvent: AuditEvent = {
                ...randomEvent,
                event_id: `evt_live_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000),
                cursor: deriveCursor(Math.floor(Date.now() / 1000), `evt_live_${Date.now()}`)
            };
            cb({ type: "audit_event", event: newEvent });
        }, 5000);
        return () => clearInterval(interval);
    }
}

// --- SQLite Implementation (DEV ONLY) ---

export class SqliteDataSource implements DataSource {
    constructor() {
        if (process.env.NODE_ENV !== "development") {
            throw new Error("SECURITY: SqliteDataSource is unrestricted and allowed in DEVELOPMENT MODE ONLY.");
        }
        console.warn("⚠️  Using SqliteDataSource (Fixture Playback Mode)");
    }

    async getGatewayStatus(): Promise<GatewayStatus> {
        return MOCK_GATEWAY_STATUS;
    }

    async getStats(range: { from: number; to: number }): Promise<DashboardStats> {
        return new MockDataSource().getStats(range); // Fallback to mock for now
    }

    async listAuditEvents(params: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>> {
        return new MockDataSource().listAuditEvents(params); // Fallback
    }

    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void {
        return new MockDataSource().subscribe(cb, filters);
    }
}

// --- Factory ---

const mode = (process.env.NEXT_PUBLIC_TALOS_DATA_MODE || "MOCK") as DataMode;

function createDataSource(mode: DataMode): DataSource {
    switch (mode) {
        case "WS": {
            return new WsDataSource();
        }
        case "HTTP":
        case "LIVE": return new HttpDataSource();
        case "SQLITE": return new SqliteDataSource();
        default: return new MockDataSource();
    }
}

export const dataSource: DataSource = createDataSource(mode);

if (mode === "SQLITE" && process.env.NODE_ENV !== "development") {
    console.error("CRITICAL: Attempted to load SQLite adapter in non-dev environment. Falling back to Mock.");
    // Force mock? The constructor throws.
}
