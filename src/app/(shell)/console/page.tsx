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
 * Console Page - Main Security Dashboard
 * 
 * Displays:
 * - KPI summary grid
 * - Live activity feed
 * - Denial taxonomy chart
 * - Request volume chart
 */
export default function ConsolePage() {
    const { stats, events, loading, hasMore, loadMore, loadingMore } =
        useDataSource();

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
                            <ActivityFeed
                                events={events}
                                hasMore={hasMore}
                                onLoadMore={loadMore}
                                isLoading={loadingMore}
                            />
                        </div>

                        {/* Sidebar Charts */}
                        <div className="space-y-6">
                            <DenialTaxonomyChart data={stats.denial_reason_counts} />
                            <RequestVolumeChart data={stats.request_volume_series} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
