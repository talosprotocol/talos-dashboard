"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useState, useEffect, useCallback } from "react";

/**
 * Status Page - MCP Infrastructure Health Dashboard
 * 
 * Fetches status from same-origin API routes:
 * - /api/status/aggregate → Core Talos services
 * - /api/mcp/resources → MCP downstream resources
 * 
 * This page does NOT call downstream services directly.
 */

interface CoreService {
    name: string;
    status: "online" | "offline" | "unknown";
    latency_ms?: number;
    error_code?: string;
}

interface MCPResource {
    name: string;
    type: string;
    status: string;
    description?: string;
}

interface StatusData {
    coreServices: CoreService[];
    mcpResources: MCPResource[];
    aggregateStatus: "healthy" | "degraded" | "unknown";
    lastUpdated: number | null;
    loading: boolean;
}

export default function StatusPage() {
    const [data, setData] = useState<StatusData>({
        coreServices: [],
        mcpResources: [],
        aggregateStatus: "unknown",
        lastUpdated: null,
        loading: true,
    });

    const fetchStatus = useCallback(async () => {
        try {
            const [aggregateRes, resourcesRes] = await Promise.all([
                fetch("/api/status/aggregate"),
                fetch("/api/mcp/resources"),
            ]);

            const aggregate = aggregateRes.ok ? await aggregateRes.json() : { services: [], aggregateStatus: "unknown" };
            const resources = resourcesRes.ok ? await resourcesRes.json() : { resources: [] };

            setData({
                coreServices: aggregate.services ?? [],
                mcpResources: resources.resources ?? [],
                aggregateStatus: aggregate.aggregateStatus ?? "unknown",
                lastUpdated: Date.now(),
                loading: false,
            });
        } catch {
            setData(prev => ({ ...prev, loading: false }));
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const onlineCount = data.coreServices.filter(s => s.status === "online").length;
    const totalCore = data.coreServices.length;

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--text-muted)]">
                    {totalCore > 0 ? `${onlineCount}/${totalCore} core services online` : "Loading..."}
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={data.loading}
                    className="px-3 py-1.5 text-xs font-semibold border border-[var(--accent)] text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50"
                >
                    {data.loading ? "Checking..." : "Refresh"}
                </button>
            </div>

            {/* Core Services */}
            <GlassPanel className="p-5">
                <h2 className="text-lg font-bold mb-4">Core Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.coreServices.map(service => (
                        <ServiceCard
                            key={service.name}
                            name={service.name}
                            status={service.status}
                            latency={service.latency_ms}
                            errorCode={service.error_code}
                        />
                    ))}
                    {data.coreServices.length === 0 && !data.loading && (
                        <p className="text-sm text-[var(--text-muted)]">No services configured</p>
                    )}
                </div>
            </GlassPanel>

            {/* MCP Resources */}
            <GlassPanel className="p-5">
                <h2 className="text-lg font-bold mb-4">MCP Resources</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.mcpResources.map(resource => (
                        <ResourceCard
                            key={resource.name}
                            name={resource.name}
                            type={resource.type}
                            status={resource.status}
                            description={resource.description}
                        />
                    ))}
                    {data.mcpResources.length === 0 && !data.loading && (
                        <p className="text-sm text-[var(--text-muted)]">No resources configured</p>
                    )}
                </div>
            </GlassPanel>

            {/* Footer */}
            <div className="text-center text-xs text-[var(--text-muted)]">
                {data.lastUpdated && (
                    <span>Last refreshed: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
                )}
            </div>
        </div>
    );
}

function ServiceCard({ name, status, latency, errorCode }: Readonly<{
    name: string;
    status: "online" | "offline" | "unknown";
    latency?: number;
    errorCode?: string;
}>) {
    return (
        <div className="p-4 bg-[var(--panel)] rounded-lg border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold capitalize">{name}</h3>
                <StatusBadge status={status} />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                {latency !== undefined && (
                    <span className="text-emerald-500">{latency}ms</span>
                )}
                {errorCode && (
                    <span className="font-mono text-red-400">{errorCode}</span>
                )}
            </div>
        </div>
    );
}

function ResourceCard({ name, type, status, description }: Readonly<{
    name: string;
    type: string;
    status: string;
    description?: string;
}>) {
    return (
        <div className="p-4 bg-[var(--panel)] rounded-lg border border-[var(--glass-border)]">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold capitalize">{name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === "online" ? "bg-emerald-500/10 text-emerald-500" :
                        status === "configured" ? "bg-blue-500/10 text-blue-500" :
                            status === "offline" ? "bg-red-500/10 text-red-500" :
                                "bg-gray-500/10 text-gray-500"
                    }`}>
                    {status.toUpperCase()}
                </span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
                <span className="font-mono">{type}</span>
                {description && <span className="ml-2">• {description}</span>}
            </div>
        </div>
    );
}

function StatusBadge({ status }: Readonly<{ status: "online" | "offline" | "unknown" }>) {
    const config = {
        online: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500", label: "ONLINE" },
        offline: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500", label: "OFFLINE" },
        unknown: { bg: "bg-gray-500/10", text: "text-gray-500", dot: "bg-gray-500", label: "UNKNOWN" },
    };
    const c = config[status];
    return (
        <span className={`flex items-center gap-1.5 px-2 py-1 ${c.bg} ${c.text} text-[10px] font-bold rounded-full`}>
            <span className={`w-1.5 h-1.5 ${c.dot} rounded-full ${status === "online" ? "animate-pulse" : ""}`} />
            {c.label}
        </span>
    );
}
