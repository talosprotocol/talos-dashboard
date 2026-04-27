"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface DataPoint {
    time: number;
    ok: number;
    deny: number;
    error: number;
}

interface RequestVolumeChartProps {
    data: DataPoint[];
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RequestVolumeChart({ data }: RequestVolumeChartProps) {
    if (!data || data.length === 0) {
        return (
            <GlassPanel className="p-4 h-64">
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">Request Volume (24h)</h3>
                <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
                    No data available
                </div>
            </GlassPanel>
        );
    }

    // Sort by time ascending for chart
    const sortedData = [...data].sort((a, b) => a.time - b.time);

    // Calculate totals for display
    const totals = sortedData.reduce(
        (acc, point) => ({
            ok: acc.ok + point.ok,
            deny: acc.deny + point.deny,
            error: acc.error + point.error,
        }),
        { ok: 0, deny: 0, error: 0 }
    );
    const grandTotal = totals.ok + totals.deny + totals.error;

    return (
        <GlassPanel className="p-4 h-64 border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Request Volume (24h)</h3>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{grandTotal.toLocaleString()} total</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={sortedData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                        <linearGradient id="gradientOk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradientDeny" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradientError" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="time"
                        tickFormatter={formatTime}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(2, 6, 23, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "12px",
                            backdropFilter: "blur(12px)",
                            fontSize: "12px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                        }}
                        labelStyle={{ color: "#fff", fontWeight: "bold", marginBottom: "4px" }}
                        labelFormatter={(value) => {
                            const timestamp = typeof value === "number" ? value : Number(value ?? 0);
                            return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
                        }}
                        formatter={(value, name) => {
                            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                            const dataKey = typeof name === "string" ? name : String(name ?? "");
                            const label = dataKey === "ok" ? "Success" : dataKey === "deny" ? "Denied" : "Error";
                            const color = dataKey === "ok" ? "#10b981" : dataKey === "deny" ? "#ef4444" : "#f59e0b";
                            return [<span key="val" className="font-bold" style={{ color }}>{numericValue}</span>, <span key="label" className="text-slate-400">{label}</span>];
                        }}
                    />
                    <Area
                        type="step"
                        dataKey="ok"
                        stackId="1"
                        stroke="#10b981"
                        fill="url(#gradientOk)"
                        strokeWidth={2}
                        animationDuration={1500}
                    />
                    <Area
                        type="step"
                        dataKey="deny"
                        stackId="1"
                        stroke="#ef4444"
                        fill="url(#gradientDeny)"
                        strokeWidth={2}
                        animationDuration={1500}
                    />
                    <Area
                        type="step"
                        dataKey="error"
                        stackId="1"
                        stroke="#f59e0b"
                        fill="url(#gradientError)"
                        strokeWidth={2}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </GlassPanel>
    );
}
