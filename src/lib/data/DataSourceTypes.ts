
// --- Types ---

import { AuditEvent, CursorPage, EvidenceBundle, GatewayStatus } from "./schemas";

export type DataMode = "MOCK" | "SQLITE" | "HTTP" | "WS" | "LIVE";
export interface DashboardStats {
    requests_24h: number;
    auth_success_rate: number;
    denial_reason_counts: Record<string, number>;
    request_volume_series: { time: number; ok: number; deny: number; error: number }[];
    latency_percentiles?: { p50: number; p95: number; p99: number };
}

export interface AuditFilters {
    correlation_id?: string;
    session_id?: string;
    outcome?: "OK" | "DENY" | "ERROR";
    denial_reason?: string;
    from?: number;
    to?: number;
}

export type StreamMessage =
    | { type: "audit_event"; event: AuditEvent }
    | { type: "gateway_status"; status: GatewayStatus }
    | { type: "cursor_gap"; from: string; to: string };

export interface DataSource {
    getStats(range: { from: number; to: number }): Promise<DashboardStats>;
    listAuditEvents(params: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>>;
    getGatewayStatus(): Promise<GatewayStatus>;
    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void;
    exportEvidence?(params: { cursor_range?: { start?: string; end?: string }, filters?: AuditFilters }): Promise<EvidenceBundle>;
}
