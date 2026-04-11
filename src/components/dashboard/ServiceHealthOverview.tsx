"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Activity, Server, Database, MessageSquare, Zap, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ServiceState = "ONLINE" | "OFFLINE" | "DEGRADED" | "UNKNOWN";

interface ServiceStatus {
    name: string;
    state: ServiceState;
    latency_ms?: number;
    error_code?: string;
}

export function ServiceHealthOverview() {
    const [services, setServices] = useState<ServiceStatus[]>([
        { name: "gateway", state: "UNKNOWN" },
        { name: "audit", state: "UNKNOWN" },
        { name: "connector", state: "UNKNOWN" },
        { name: "chat", state: "UNKNOWN" },
    ]);
    const [loading, setLoading] = useState(true);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await fetch("/api/status");
            if (res.ok) {
                const data = await res.json();
                const mapped = Object.entries(data.services).map(([name, status]: [string, any]) => ({
                    name,
                    state: status.state as ServiceState,
                    latency_ms: status.latency_ms,
                    error_code: status.error_code,
                }));
                setServices(mapped);
            }
        } catch (err) {
            console.error("Failed to fetch service health", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000);
        return () => clearInterval(interval);
    }, [fetchHealth]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => (
                <HealthCard key={service.name} service={service} loading={loading} />
            ))}
        </div>
    );
}

function HealthCard({ service, loading }: { service: ServiceStatus; loading: boolean }) {
    const isOnline = service.state === "ONLINE";
    const isDegraded = service.state === "DEGRADED";
    const isOffline = service.state === "OFFLINE";

    const Icon = {
        gateway: Server,
        audit: Database,
        connector: Zap,
        chat: MessageSquare,
    }[service.name] || HelpCircle;

    return (
        <GlassPanel className="p-4 flex flex-col gap-3 relative overflow-hidden">
            {/* Background Glow */}
            <div className={cn(
                "absolute -right-8 -top-8 w-24 h-24 blur-3xl rounded-full opacity-10 pointer-events-none",
                isOnline ? "bg-emerald-500" : isDegraded ? "bg-amber-500" : isOffline ? "bg-rose-500" : "bg-slate-500"
            )} />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg border",
                        isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        isDegraded ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        isOffline ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                        "bg-slate-500/10 border-slate-500/20 text-slate-400"
                    )}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">{service.name}</h3>
                        <p className="text-[10px] font-medium text-slate-500">Talos Protocol Service</p>
                    </div>
                </div>
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    isOnline ? "bg-emerald-500 animate-pulse" :
                    isDegraded ? "bg-amber-500" :
                    isOffline ? "bg-rose-500" :
                    "bg-slate-500"
                )} />
            </div>

            <div className="flex items-end justify-between mt-2">
                <div>
                    <div className={cn(
                        "text-lg font-bold font-mono tracking-tight",
                        isOnline ? "text-emerald-400" :
                        isDegraded ? "text-amber-400" :
                        isOffline ? "text-rose-400" :
                        "text-slate-400"
                    )}>
                        {loading ? "..." : service.state}
                    </div>
                    {service.error_code && (
                        <div className="text-[9px] font-bold text-rose-400/70 mt-0.5 font-mono">{service.error_code}</div>
                    )}
                </div>
                {service.latency_ms !== undefined && (
                    <div className="text-right">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Latency</div>
                        <div className="text-xs font-bold text-slate-300 font-mono">{service.latency_ms}ms</div>
                    </div>
                )}
            </div>

            {/* Status indicator bar at bottom */}
            <div key={`${service.name}-status-bar`} className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
                <div className={cn(
                    "h-full transition-all duration-1000",
                    isOnline ? "bg-emerald-500 w-full" :
                    isDegraded ? "bg-amber-500 w-2/3" :
                    isOffline ? "bg-rose-500 w-1/3" :
                    "bg-slate-500 w-0"
                )} />
            </div>
        </GlassPanel>
    );
}
