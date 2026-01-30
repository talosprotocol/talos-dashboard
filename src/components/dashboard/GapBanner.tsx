"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { CursorGap } from "@talosprotocol/contracts";

interface GapBannerProps {
    readonly gaps: CursorGap[];
    readonly onBackfill: () => void;
    readonly isBackfilling: boolean;
    readonly progress?: number;
    readonly onDismiss?: () => void;
}

export function GapBanner({
    gaps,
    onBackfill,
    isBackfilling,
    progress = 0,
    onDismiss
}: GapBannerProps) {
    if (gaps.length === 0) return null;

    return (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-amber-200">
                            Gap in Audit History Detected
                        </h3>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="text-amber-500/70 hover:text-amber-300 text-sm"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-amber-200/70 mt-1">
                        {gaps.length} gap{gaps.length > 1 ? "s" : ""} detected in the event sequence.
                        {" "}Some events may be missing from the current view.
                    </p>

                    {isBackfilling ? (
                        <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-xs text-amber-200/60">
                                <span>Fetching missing events...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-amber-900/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onBackfill}
                            className="mt-3 px-3 py-1.5 flex items-center gap-2 text-xs font-medium bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 rounded-md transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Backfill Missing Events</span>
                        </button>
                    )}

                    {/* Gap Details (collapsed by default for brevity) */}
                    {gaps.length > 0 && (
                        <details className="mt-3 text-xs text-amber-200/50">
                            <summary className="cursor-pointer hover:text-amber-200/70">
                                View gap details ({gaps.length})
                            </summary>
                            <ul className="mt-2 space-y-1 pl-4 border-l border-amber-500/20">
                                {gaps.slice(0, 5).map((gap, i) => (
                                    <li key={i} className="font-mono">
                                        {gap.from_cursor.slice(0, 12)}... → {gap.to_cursor.slice(0, 12)}...
                                    </li>
                                ))}
                                {gaps.length > 5 && (
                                    <li className="text-amber-300/50">+{gaps.length - 5} more...</li>
                                )}
                            </ul>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
}
