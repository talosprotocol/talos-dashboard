"use client";

import { ServiceHealthOverview } from "@/components/dashboard/ServiceHealthOverview";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DenialTaxonomyChart } from "@/components/dashboard/DenialTaxonomyChart";
import { RequestVolumeChart } from "@/components/dashboard/RequestVolumeChart";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useDataSource } from "@/lib/hooks/useDataSource";
import { Settings, Shield, Zap, LayoutDashboard, Database, Activity, Lock, Terminal, Wallet } from "lucide-react";
import Link from "next/link";

/**
 * Management Hub - Complete Monitoring & Management Dashboard
 */
export default function ManagementContent() {
    const { stats, events, loading, hasMore, loadMore, loadingMore } = useDataSource();

    return (
        <div className="space-y-8 pb-12">
            {/* Header with Breadcrumbs & Status */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                        Management <span className="text-indigo-400">Hub</span>
                    </h1>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded-md text-indigo-400">
                            <span className="w-1 h-1 rounded-full bg-indigo-500" />
                            Cluster Admin Access
                        </div>
                        <span className="opacity-60">System Version v1.1.6-Stable</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/rbac"
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-2 group"
                    >
                        <Shield className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                        Manage RBAC
                    </Link>
                    <Link
                        href="/admin/secrets"
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-2 group"
                    >
                        <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                        Manage Secrets
                    </Link>
                    <Link
                        href="/admin/aiops"
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-2 group"
                    >
                        <Terminal className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                        AIOps Monitoring
                    </Link>
                    <Link
                        href="/admin/governance"
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-2 group"
                    >
                        <Shield className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                        Governance Agent
                    </Link>
                    <Link
                        href="/admin/budgets"
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-slate-400 hover:text-white rounded-xl transition-all duration-300 flex items-center gap-2 group"
                    >
                        <Wallet className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                        Budgets & Keys
                    </Link>
                    <Link
                        href="/configuration"
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/50 text-white rounded-xl transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Configure Protocol
                    </Link>
                </div>
            </div>

            {/* Section 1: Service Health Overview */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Infrastructure Health</h2>
                </div>
                <ServiceHealthOverview />
            </section>

            {/* Section 2: Security & Traffic KPIs */}
            {stats && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Performance Indices (24H)</h2>
                    </div>
                    <KPIGrid stats={stats} />
                </section>
            )}

            {/* Section 3: Monitoring Detail Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Live Activity Feed */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Security Event Stream</h2>
                    </div>
                    {loading ? (
                        <GlassPanel className="h-96 w-full bg-slate-900/30 border-white/5 animate-pulse" />
                    ) : (
                        <ActivityFeed
                            events={events}
                            hasMore={hasMore}
                            onLoadMore={loadMore}
                            isLoading={loadingMore}
                        />
                    )}
                </div>

                {/* Right: Diagnostic Analytics */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Denial Taxonomy */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Shield className="w-4 h-4 text-rose-400" />
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enforcement Analysis</h2>
                        </div>
                        {stats ? (
                            <DenialTaxonomyChart data={stats.denial_reason_counts} />
                        ) : (
                            <GlassPanel className="h-48 w-full bg-slate-900/30 border-white/5 animate-pulse" />
                        )}
                    </div>

                    {/* Request Volume */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Database className="w-4 h-4 text-blue-400" />
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Throughput Metrics</h2>
                        </div>
                        {stats ? (
                            <RequestVolumeChart data={stats.request_volume_series} />
                        ) : (
                            <GlassPanel className="h-48 w-full bg-slate-900/30 border-white/5 animate-pulse" />
                        )}
                    </div>

                    <GlassPanel className="p-6 bg-indigo-500/5 border-indigo-500/10">
                        <h3 className="text-xs font-bold text-slate-200 mb-2 uppercase tracking-wide">Infrastructure Maintenance</h3>
                        <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                            Operational controls for identity rotation, audit cleanup, and connector reconfiguration.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <Link
                                href="/admin/secrets"
                                className="px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 rounded-lg transition-colors border border-amber-500/20 text-center"
                            >
                                🔑 Rotate Keys
                            </Link>
                            <Link
                                href="/audit"
                                className="px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors border border-white/5 text-center"
                            >
                                📜 View Audit
                            </Link>
                        </div>
                    </GlassPanel>
                </div>
            </div>

            <div className="pt-4 text-center">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">
                    TALOS MANAGEMENT CONSOLE • AUTHORIZED ACCESS ONLY • SESSION ENCRYPTED
                </span>
            </div>
        </div>
    );
}
