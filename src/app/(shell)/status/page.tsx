"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

/**
 * Status Page - MCP Infrastructure Health Dashboard
 * 
 * Fetches status from same-origin API routes:
 * - /api/status/aggregate → Core Talos services
 * - /api/mcp/resources → MCP downstream resources
 * 
 * This page does NOT call downstream services directly.
 */

// Type aliases for repeated unions
type ServiceStatus = "online" | "offline" | "unknown";

interface CoreService {
    name: string;
    status: ServiceStatus;
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
        // Schedule initial fetch to avoid synchronous setState in effect
        queueMicrotask(() => fetchStatus());
        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const onlineCount = data.coreServices.filter(s => s.status === "online").length;
    const totalCore = data.coreServices.length;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Infrastructure <span className="text-indigo-400">Health</span>
                    </h1>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded-md text-indigo-400">
                            <span className="w-1 h-1 rounded-full bg-indigo-500" />
                            {totalCore > 0 ? `${onlineCount}/${totalCore} CORE ACTIVE` : "SYNCHRONIZING..."}
                        </div>
                        {data.lastUpdated && (
                            <span className="opacity-60">Synchronized {new Date(data.lastUpdated).toLocaleTimeString([], { hour12: false })}</span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStatus}
                        disabled={data.loading}
                        className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 disabled:opacity-30 flex items-center gap-2 group"
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${data.loading ? 'bg-amber-500 animate-spin' : 'bg-slate-500 group-hover:bg-indigo-500'}`} />
                        {data.loading ? "Synchronizing..." : "Manual Refresh"}
                    </button>
                    
                    <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 ${
                        data.aggregateStatus === 'healthy' 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                    }`}>
                        <span className="text-[10px] font-black uppercase tracking-widest">Aggregate: {data.aggregateStatus || 'CALCULATING'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Core Services */}
                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Protocol Core Services</h2>
                    <GlassPanel className="p-8 space-y-4 bg-slate-900/30 border-white/5 shadow-2xl">
                        <div className="grid grid-cols-1 gap-3">
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
                                <div className="text-center py-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-50">
                                    No services detected in current cluster
                                </div>
                            )}
                        </div>
                    </GlassPanel>
                </div>

                {/* MCP Resources */}
                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Downstream MCP Connectors</h2>
                    <GlassPanel className="p-8 space-y-4 bg-slate-900/30 border-white/5 shadow-2xl">
                        <div className="grid grid-cols-1 gap-3">
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
                                <div className="text-center py-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-50">
                                    No external connectors initialized
                                </div>
                            )}
                        </div>
                    </GlassPanel>
                </div>
            </div>
            
            <div className="pb-8 opacity-20 hover:opacity-100 transition-opacity duration-500 text-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">TALOS PROTOCOL INFRASTRUCTURE MONITOR • V1.0.0-GOLD</span>
            </div>
        </motion.div>
    );
}

function ServiceCard({ name, status, latency, errorCode }: Readonly<{
    name: string;
    status: ServiceStatus;
    latency?: number;
    errorCode?: string;
}>) {
    return (
        <div className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
                <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide group-hover:text-white transition-colors">{name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{status}</span>
                        {latency !== undefined && (
                            <span className="text-[9px] font-bold text-emerald-500/80 tracking-tight">{latency}ms</span>
                        )}
                    </div>
                </div>
            </div>
            {errorCode && (
                <div className="px-3 py-1 bg-rose-500/5 border border-rose-500/10 rounded-lg">
                    <span className="text-[9px] font-mono font-black text-rose-400 uppercase">{errorCode}</span>
                </div>
            )}
        </div>
    );
}

function ResourceCard({ name, type, status, description }: Readonly<{
    name: string;
    type: string;
    status: string;
    description?: string;
}>) {
    const isOnline = status.toLowerCase() === 'online' || status.toLowerCase() === 'configured';
    
    return (
        <div className="flex items-center justify-between p-4 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300 group">
            <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isOnline ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-500/5 border-slate-500/20'}`}>
                    <Shield className={`w-4 h-4 ${isOnline ? 'text-indigo-400' : 'text-slate-500'}`} />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide group-hover:text-white transition-colors">{name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{type}</span>
                        {description && (
                            <span className="text-[9px] font-bold text-slate-600 truncate max-w-[150px]">— {description}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className={`px-2.5 py-1 rounded-md border text-[8px] font-black uppercase tracking-[0.15em] ${isOnline ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                {status}
            </div>
        </div>
    );
}


