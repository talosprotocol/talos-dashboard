"use client";

import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { StatusBanners } from "@/components/dashboard/StatusBanners";
import { DenialTaxonomyChart } from "@/components/dashboard/DenialTaxonomyChart";
import { RequestVolumeChart } from "@/components/dashboard/RequestVolumeChart";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useDataSource } from "@/lib/hooks/useDataSource";
import Link from "next/link";

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
                <div className="space-y-6 animate-pulse">
                    <GlassPanel className="h-32 w-full bg-[var(--panel)]" />
                    <GlassPanel className="h-96 w-full bg-[var(--panel)]" />
                </div>
            ) : (
                <>
                    <KPIGrid stats={stats} />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Feed */}
                        <div className="lg:col-span-2">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold tracking-tight">Activity Feed</h2>
                                <button 
                                    onClick={() => refreshSection('events')}
                                    className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--panel)] transition-colors text-[var(--text-muted)]"
                                >
                        Refresh Stream
                    </button>
                            </div>
                            <ActivityFeed
                                events={events}
                                hasMore={hasMore}
                                onLoadMore={loadMore}
                                isLoading={loadingMore}
                            />
                        </div>

                        {/* Sidebar Charts */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
                                <button 
                                    onClick={() => refreshSection('stats')}
                                    className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--panel)] transition-colors text-[var(--text-muted)]"
                                >
                        Refresh Metrics
                    </button>
                            </div>
                            <DenialTaxonomyChart data={stats.denial_reason_counts} />
                            <RequestVolumeChart data={stats.request_volume_series} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
