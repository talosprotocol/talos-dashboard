"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { DashboardStats } from "@/lib/data/DataSource";
import { Activity, ShieldCheck, ShieldAlert, Zap, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface KPIGridProps {
    stats: DashboardStats;
}

export function KPIGrid({ stats }: KPIGridProps) {
    const denialRate = stats.requests_24h > 0
        ? (1 - stats.auth_success_rate) * 100
        : 0;

    // Calculate System Threat Level
    const threatLevel = denialRate > 15 ? "CRITICAL" : denialRate > 5 ? "ELEVATED" : "SECURE";
    const threatColor = threatLevel === "CRITICAL" ? "text-rose-500" : threatLevel === "ELEVATED" ? "text-amber-500" : "text-emerald-500";
    const threatIcon = threatLevel === "CRITICAL" ? <ShieldAlert className="text-rose-400" /> : threatLevel === "ELEVATED" ? <ShieldAlert className="text-amber-400" /> : <ShieldCheck className="text-emerald-400" />;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6"
        >
            <KPI
                variants={item}
                label="System Status"
                value={threatLevel}
                icon={threatIcon}
                trend={threatLevel === "SECURE" ? "Protected" : "Active Threats"}
                trendUp={threatLevel === "SECURE"}
            />
            <KPI
                variants={item}
                label="Total Requests"
                value={stats.requests_24h.toLocaleString()}
                icon={<Activity className="text-indigo-400" />}
                href="/audit"
                trend="+12%"
                trendUp={true}
            />
            <KPI
                variants={item}
                label="Tokens (24h)"
                value={stats.tokens_24h ? stats.tokens_24h.toLocaleString() : "0"}
                icon={<Zap className="text-amber-400" />}
            />
            <KPI
                variants={item}
                label="Est. Cost"
                value={stats.cost_24h ? `$${stats.cost_24h.toFixed(4)}` : "$0.00"}
                icon={<Activity className="text-blue-400" />}
            />
            <KPI
                variants={item}
                label="Auth Success"
                value={`${(stats.auth_success_rate * 100).toFixed(1)}%`}
                icon={<ShieldCheck className="text-emerald-400" />}
                href="/audit?outcome=OK"
                trend="99.9%"
                trendUp={true}
            />
            <KPI
                variants={item}
                label="Denial Rate"
                value={`${denialRate.toFixed(1)}%`}
                icon={<ShieldAlert className="text-rose-400" />}
                href="/audit?outcome=DENY"
                trend="-2%"
                trendUp={true}
            />
            <KPI
                variants={item}
                label="Latency (avg)"
                value={stats.latency_avg ? `${stats.latency_avg.toFixed(0)}ms` : (stats.latency_percentiles ? `${stats.latency_percentiles.p95}ms` : "N/A")}
                icon={<Zap className="text-sky-400" />}
            />
        </motion.div>
    );
}

function KPI({ label, value, icon, trend, trendUp, href, variants }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    href?: string;
    variants?: import("framer-motion").Variants;
}) {
    const content = (
        <motion.div variants={variants} className="h-full">
            <GlassPanel variant="hoverable" className="p-5 flex flex-col gap-1 h-full">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{label}</span>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                        {icon}
                    </div>
                </div>
                <div className="text-2xl font-bold font-sans tracking-tight text-white">{value}</div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${trendUp ? 'text-emerald-400' : 'text-rose-400'} mt-2 p-1 px-2 rounded-full bg-white/[0.02] w-fit border border-white/[0.03]`}>
                        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trend}
                    </div>
                )}
            </GlassPanel>
        </motion.div>
    );

    if (href) {
        return <Link href={href} className="block no-underline h-full">{content}</Link>;
    }

    return content;
}
