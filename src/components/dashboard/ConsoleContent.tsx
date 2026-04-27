"use client";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { StatusBanners } from "@/components/dashboard/StatusBanners";
import { DenialTaxonomyChart } from "@/components/dashboard/DenialTaxonomyChart";
import { RequestVolumeChart } from "@/components/dashboard/RequestVolumeChart";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useDataSource } from "@/lib/hooks/useDataSource";
import Link from "next/link";
import { RotateCw } from "lucide-react";

/**
 * Console Content - Logic separated for client-side rendering
 */
export default function ConsoleContent() {
    const { stats, events, loading, hasMore, loadMore, loadingMore, refreshSection } = useDataSource();

    return (
        <div className="space-y-8">
            {/* Status and Quick Actions */}
            <div className="flex items-center justify-between">
                <div>
                     <h1 className="text-2xl font-bold tracking-tight mb-1">Mission Control</h1>
                     <p className="text-sm text-[var(--text-muted)]">Real-time security analytics and enforcement.</p>
                </div>
                <div className="flex gap-3">
                    <StatusBanners />
                    <Link
                        href="/examples/chat"
                        className="px-4 py-2 border border-[var(--accent)] text-[var(--accent)] rounded-lg text-sm font-semibold hover:bg-[var(--accent)]/10 transition-all shadow-sm shadow-[var(--accent-glow)]"
                    >
                        Secure Chat
                    </Link>
                </div>
            </div>

            {/* Content */}
            {loading || !stats ? (
                <div className="space-y-8 animate-pulse">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                        {[...Array(7)].map((_, i) => (
                            <GlassPanel key={i} className="h-32 w-full bg-[var(--panel)]" />
                        ))}
                    </div>
                    <GlassPanel className="h-[600px] w-full bg-[var(--panel)]" />
                </div>
            ) : (
                <>
                    <KPIGrid stats={stats} />

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Main Feed */}
                        <div className="lg:col-span-3">
                            <ActivityFeed
                                events={events}
                                hasMore={hasMore}
                                onLoadMore={loadMore}
                                isLoading={loadingMore}
                            />
                        </div>

                        {/* Sidebar Charts */}
                        <div className="space-y-8">
                            <div className="flex justify-between items-center px-1">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Security Analytics</h2>
                                <button 
                                    onClick={() => refreshSection('stats')}
                                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                                    title="Refresh Metrics"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="space-y-6">
                                <DenialTaxonomyChart data={stats.denial_reason_counts} />
                                <RequestVolumeChart data={stats.request_volume_series} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
