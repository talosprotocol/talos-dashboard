"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { DashboardStats } from "@/lib/data/DataSource";
import { Activity, ShieldCheck, ShieldAlert, Zap } from "lucide-react";
import Link from "next/link";

interface KPIGridProps {
    stats: DashboardStats;
}

export function KPIGrid({ stats }: KPIGridProps) {
    const denialRate = stats.requests_24h > 0
        ? (1 - stats.auth_success_rate) * 100
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <KPI
                label="Total Requests"
                value={stats.requests_24h.toLocaleString()}
                icon={<Activity className="text-[var(--text-muted)]" />}
                href="/audit"
            />
            <KPI
                label="Tokens (24h)"
                value={stats.tokens_24h ? stats.tokens_24h.toLocaleString() : "0"}
                icon={<Zap className="text-purple-500" />}
            />
            <KPI
                label="Est. Cost"
                value={stats.cost_24h ? `$${stats.cost_24h.toFixed(4)}` : "$0.00"}
                icon={<Activity className="text-blue-500" />}
            />
            <KPI
                label="Auth Success"
                value={`${(stats.auth_success_rate * 100).toFixed(1)}%`}
                icon={<ShieldCheck className="text-emerald-500" />}
                href="/audit?outcome=OK"
            />
            <KPI
                label="Denial Rate"
                value={`${denialRate.toFixed(1)}%`}
                icon={<ShieldAlert className="text-amber-500" />}
                href="/audit?outcome=DENY"
            />
            <KPI
                label="Latency (avg)"
                value={stats.latency_avg ? `${stats.latency_avg.toFixed(0)}ms` : (stats.latency_percentiles ? `${stats.latency_percentiles.p95}ms` : "N/A")}
                icon={<Zap className="text-blue-500" />}
            />
        </div>
    );
}

function KPI({ label, value, icon, trend, trendUp, href }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    href?: string;
}) {
    const content = (
        <GlassPanel className={`p-5 flex flex-col gap-1 h-full ${href ? 'cursor-pointer hover:border-[var(--accent)]/50 hover:bg-[var(--panel-hover)]/30 transition-all' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold">{label}</span>
                {icon}
            </div>
            <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">{value}</div>
            {trend && (
                <div className={`text-xs ${trendUp ? 'text-emerald-500' : 'text-rose-500'} mt-1`}>
                    {trend} vs last 24h
                </div>
            )}
        </GlassPanel>
    );

    if (href) {
        return <Link href={href} className="block no-underline h-full">{content}</Link>;
    }

    return content;
}
