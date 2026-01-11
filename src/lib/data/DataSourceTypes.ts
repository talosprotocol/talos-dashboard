
// --- Types ---

import { AuditEvent, CursorPage, EvidenceBundle, GatewayStatus } from "./schemas";

export type DataMode = "MOCK" | "SQLITE" | "HTTP" | "WS" | "LIVE";
export interface DashboardStats {
    requests_24h: number;
    tokens_24h?: number;
    cost_24h?: number;
    auth_success_rate: number;
    denial_reason_counts: Record<string, number>;
    request_volume_series: { time: number; ok: number; deny: number; error: number }[];
    latency_percentiles?: { p50: number; p95: number; p99: number };
    latency_avg?: number;
}

export interface UserProfile {
    id: string;
    email?: string;
    roles: string[];
    permissions: string[];
}

export interface Upstream {
    id: string;
    provider: string;
    endpoint: string;
    credentials_ref: string;
    tags: Record<string, string>;
    enabled: boolean;
    version: number;
}

export interface ModelGroup {
    id: string;
    name: string;
    deployments: Record<string, unknown>[];
    fallback_groups: string[];
    routing_policy_id: string;
    enabled: boolean;
    version: number;
}

export interface McpServer {
    id: string;
    name: string;
    endpoint: string;
    enabled: boolean;
    version: number;
}

export interface McpPolicy {
    id: string;
    team_id: string;
    allowed_servers: string[];
    allowed_tools: string[];
}

export interface Secret {
    name: string;
    created_at?: string;
    updated_at?: string;
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
    getMe(): Promise<UserProfile>;
    
    // LLM Management
    listUpstreams(): Promise<Upstream[]>;
    createUpstream(data: Partial<Upstream>): Promise<Upstream>;
    updateUpstream(id: string, data: Partial<Upstream>, expectedVersion: number): Promise<Upstream>;
    deleteUpstream(id: string): Promise<void>;
    
    listModelGroups(): Promise<ModelGroup[]>;
    createModelGroup(data: Partial<ModelGroup>): Promise<ModelGroup>;
    updateModelGroup(id: string, data: Partial<ModelGroup>, expectedVersion: number): Promise<ModelGroup>;
    deleteModelGroup(id: string): Promise<void>;

    // MCP Management
    listMcpServers(): Promise<McpServer[]>;
    createMcpServer(data: Partial<McpServer>): Promise<McpServer>;
    updateMcpServer(id: string, data: Partial<McpServer>, expectedVersion: number): Promise<McpServer>;
    deleteMcpServer(id: string): Promise<void>;
    
    listMcpPolicies(teamId?: string): Promise<McpPolicy[]>;
    upsertMcpPolicy(data: Partial<McpPolicy>): Promise<McpPolicy>;
    deleteMcpPolicy(id: string): Promise<void>;

    // Secrets Management
    listSecrets(): Promise<Secret[]>;
    createSecret(name: string, value: string): Promise<void>;
    deleteSecret(name: string): Promise<void>;

    listAuditEvents(params: {
        limit: number;
        cursor?: string;
        filters?: AuditFilters
    }): Promise<CursorPage<AuditEvent>>;
    getGatewayStatus(): Promise<GatewayStatus>;
    subscribe(cb: (msg: StreamMessage) => void, filters?: AuditFilters): () => void;
    exportEvidence?(params: { cursor_range?: { start?: string; end?: string }, filters?: AuditFilters }): Promise<EvidenceBundle>;

    // Chat / Playground
    chatCompletion(apiKey: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
}
