"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GlassPanel } from "@/components/ui/GlassPanel";

interface DenialTaxonomyChartProps {
    data: Record<string, number>;
}

// Color palette for denial reasons
const COLORS: Record<string, string> = {
    NO_CAPABILITY: "#ef4444",      // rose-500
    EXPIRED: "#f59e0b",            // amber-500  
    REVOKED: "#ea39b8",            // pink-500
    SCOPE_MISMATCH: "#10b981",     // emerald-500
    DELEGATION_INVALID: "#06b6d4", // cyan-500
    UNKNOWN_TOOL: "#3b82f6",       // blue-500
    REPLAY: "#8b5cf6",             // violet-500
    SIGNATURE_INVALID: "#6366f1",  // indigo-500
    INVALID_FRAME: "#475569",      // slate-500
};

const DEFAULT_COLOR = "#334155"; // slate-700

// Human-readable labels
const LABELS: Record<string, string> = {
    NO_CAPABILITY: "No Capability",
    EXPIRED: "Expired",
    REVOKED: "Revoked",
    SCOPE_MISMATCH: "Scope Mismatch",
    DELEGATION_INVALID: "Invalid Delegation",
    UNKNOWN_TOOL: "Unknown Tool",
    REPLAY: "Replay Attack",
    SIGNATURE_INVALID: "Invalid Signature",
    INVALID_FRAME: "Invalid Frame",
};

export function DenialTaxonomyChart({ data }: DenialTaxonomyChartProps) {
    const chartData = Object.entries(data)
        .filter(([, count]) => count > 0)
        .map(([reason, count]) => ({
            name: LABELS[reason] || reason,
            value: count,
            reason,
        }))
        .sort((a, b) => b.value - a.value);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <GlassPanel className="p-4 h-64 border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 px-1">Denial Taxonomy</h3>
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm font-medium italic">
                    No denials recorded
                </div>
            </GlassPanel>
        );
    }

    return (
        <GlassPanel className="p-4 h-64 border-white/5 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Denial Taxonomy</h3>
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="45%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={2}
                        animationBegin={200}
                        animationDuration={1200}
                    >
                        {chartData.map((entry) => (
                            <Cell
                                key={entry.reason}
                                fill={COLORS[entry.reason] || DEFAULT_COLOR}
                                className="transition-all duration-300 hover:scale-105"
                                style={{ outline: 'none' }}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(2, 6, 23, 0.8)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "12px",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                            fontSize: "12px",
                            padding: "8px 12px"
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value, name) => {
                            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                            const label = typeof name === "string" ? name : String(name ?? "");

                            return [
                                <span key="val" className="font-bold text-white">{numericValue} <span key="pct" className="text-[10px] text-slate-400 font-normal">({((numericValue / total) * 100).toFixed(1)}%)</span></span>,
                                <span key="name" className="text-slate-300 mr-2">{label}</span>
                            ];
                        }}
                    />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.025em" }}
                        formatter={(value) => (
                            <span className="text-slate-400 uppercase ml-1 opacity-80">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </GlassPanel>
    );
}
