"use client";

import { useEffect, useState, useMemo } from "react";
import { dataSource } from "@/lib/data/DataSource";
import type { AuditEvent } from "@/lib/data/schemas";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Terminal, Shield, CheckCircle2, AlertTriangle, Search, Activity, Cpu, Hash } from "lucide-react";

// Tool-call event detection — based on event_type and tool field
function isToolCallEvent(e: AuditEvent): boolean {
    // Events with a tool name populated are MCP tool-guard calls
    return Boolean(e.tool && e.tool.trim() !== "");
}

export default function AIOpsContent() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        // Load recent audit events and filter for tool calls
        const load = async () => {
            try {
                const page = await dataSource.listAuditEvents({ limit: 200 });
                setEvents(page.items.filter(isToolCallEvent));
            } catch (err) {
                console.error("Failed to load AIOps events", err);
            } finally {
                setLoading(false);
            }
        };
        load();

        // Live stream — add tool events as they arrive
        const unsub = dataSource.subscribe((msg) => {
            if (msg.type === "audit_event" && isToolCallEvent(msg.event)) {
                setEvents(prev => [msg.event, ...prev].slice(0, 500));
            }
        });

        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        if (!search.trim()) return events;
        const q = search.toLowerCase();
        return events.filter(e =>
            e.tool?.toLowerCase().includes(q) ||
            e.session_id?.toLowerCase().includes(q) ||
            e.agent_id?.toLowerCase().includes(q) ||
            e.event_type?.toLowerCase().includes(q) ||
            Object.values(e.metadata || {}).some(v => String(v).toLowerCase().includes(q))
        );
    }, [events, search]);

    const stats = useMemo(() => ({
        total: events.length,
        allowed: events.filter(e => e.outcome === "OK").length,
        denied: events.filter(e => e.outcome === "DENY").length,
        errors: events.filter(e => e.outcome === "ERROR").length,
    }), [events]);

    return (
        <div className="space-y-6 pb-12">
            {/* Page Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <Terminal className="text-emerald-400" size={22} />
                        AIOps Mission Control
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Real-time monitoring of agent tool calls, MCP guardrail decisions, and enforcement outcomes.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wide">Live Stream</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Tool Calls", value: stats.total, colorBorder: "border-l-blue-500", colorBg: "bg-blue-500/10", colorText: "text-blue-400" },
                    { label: "Allowed", value: stats.allowed, colorBorder: "border-l-emerald-500", colorBg: "bg-emerald-500/10", colorText: "text-emerald-400" },
                    { label: "Denied", value: stats.denied, colorBorder: "border-l-rose-500", colorBg: "bg-rose-500/10", colorText: "text-rose-400" },
                    { label: "Errors", value: stats.errors, colorBorder: "border-l-amber-500", colorBg: "bg-amber-500/10", colorText: "text-amber-400" },
                ].map(s => (
                    <GlassPanel key={s.label} className={`p-4 border-l-4 ${s.colorBorder}`}>
                        <div className={`inline-flex p-2 rounded-lg mb-2 ${s.colorBg}`}>
                            <Activity className={s.colorText} size={16} />
                        </div>
                        <div className="text-[10px] font-black uppercase text-slate-500">{s.label}</div>
                        <div className={`text-2xl font-mono font-bold ${s.colorText}`}>{s.value}</div>
                    </GlassPanel>
                ))}
            </div>

            {/* Event Stream */}
            <GlassPanel className="overflow-hidden flex flex-col" style={{ height: 560 }}>
                {/* Toolbar */}
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 max-w-xs">
                        <Search size={14} className="text-slate-500 shrink-0" />
                        <input
                            placeholder="Filter by tool, agent, or session..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm flex-1 outline-none text-slate-200 placeholder:text-slate-600"
                        />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 ml-auto">
                        {filtered.length} / {events.length} events
                    </span>
                </div>

                {/* Event List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-slate-500 text-xs uppercase tracking-widest font-black">Connecting to telemetry stream...</p>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex items-center justify-center h-full border border-dashed border-white/5 rounded-xl">
                            <div className="text-center py-12">
                                <Cpu size={32} className="text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-600 text-xs uppercase tracking-widest font-black">No tool calls matched</p>
                                <p className="text-slate-700 text-xs mt-1">Agent tool events appear here in real-time</p>
                            </div>
                        </div>
                    ) : filtered.map(e => (
                        <EventRow key={e.event_id} event={e} />
                    ))}
                </div>
            </GlassPanel>
        </div>
    );
}

function EventRow({ event: e }: { event: AuditEvent }) {
    const isAllowed = e.outcome === "OK";
    const isDenied = e.outcome === "DENY";
    const toolName = e.tool || "unknown";
    const metadataEntries = Object.entries(e.metadata || {});

    return (
        <div className={`p-3 rounded-xl border transition-all ${
            isDenied ? "border-rose-500/20 bg-rose-500/5" : "border-white/5 bg-white/[0.02]"
        } hover:bg-white/[0.04]`}>
            <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                        isAllowed ? "bg-emerald-500/10 text-emerald-500"
                        : isDenied ? "bg-rose-500/10 text-rose-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                        {isAllowed ? <CheckCircle2 size={13} /> : isDenied ? <Shield size={13} /> : <AlertTriangle size={13} />}
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-100 font-mono">{toolName}</span>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                            {e.event_type} &bull; {e.agent_id || e.session_id?.slice(0, 12)} &bull; {new Date(e.timestamp * 1000).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                    isAllowed ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : isDenied ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                    {e.outcome}
                </span>
            </div>

            {isDenied && e.denial_reason && (
                <div className="mb-2 px-2.5 py-1.5 bg-rose-500/[0.08] border border-rose-500/10 rounded-lg flex items-center gap-2">
                    <AlertTriangle size={11} className="text-rose-400 shrink-0" />
                    <span className="text-[11px] font-bold text-rose-300 font-mono">{e.denial_reason}</span>
                </div>
            )}

            {metadataEntries.length > 0 && (
                <details className="mt-1.5 group">
                    <summary className="text-[9px] font-black text-slate-600 uppercase cursor-pointer hover:text-slate-400 flex items-center gap-1">
                        <Hash size={9} /> Metadata
                    </summary>
                    <pre className="mt-1.5 text-[10px] p-2 bg-black/20 rounded border border-white/5 text-slate-400 overflow-x-auto max-h-20 font-mono">
                        {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                </details>
            )}

            {e.hashes?.request_hash && (
                <div className="mt-1 text-[9px] text-slate-700 font-mono">
                    REQ: {e.hashes.request_hash.slice(0, 24)}…
                </div>
            )}
        </div>
    );
}
