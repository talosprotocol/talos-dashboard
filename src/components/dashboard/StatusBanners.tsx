"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { AlertTriangle, Database, Lock, Radio, FlaskConical, ShieldAlert, RotateCw } from "lucide-react";
import {
    getIntegrityStatus,
    getBackfillStatus,
    getCursorGaps,
    getBackfillRetryInfo,
    retryBackfill,
    IntegrityStatus,
    BackfillStatus
} from "@/lib/data/DataSource";
import { CursorGap } from "@talos-protocol/contracts";
import { useEffect, useState } from "react";

export function StatusBanners() {
    const mode = process.env.NEXT_PUBLIC_TALOS_DATA_MODE || "HTTP";
    const allowSafeMetadata = process.env.NEXT_PUBLIC_TALOS_ALLOW_SAFE_METADATA === "true";

    // Client-side polling for global state
    const [integrity, setIntegrity] = useState<IntegrityStatus>("OK");
    const [backfill, setBackfill] = useState<BackfillStatus>("IDLE");
    const [gaps, setGaps] = useState<CursorGap[]>([]);
    const [retryInfo, setRetryInfo] = useState({ retries: 0, max: 3 });

    useEffect(() => {
        const interval = setInterval(() => {
            setIntegrity(getIntegrityStatus());
            setBackfill(getBackfillStatus());
            setGaps(getCursorGaps());
            setRetryInfo(getBackfillRetryInfo());
        }, 1000); // Check status every second
        return () => clearInterval(interval);
    }, []);



    return (
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest flex-wrap">
            {/* --- CRITICAL INTEGRITY BANNER --- */}
            {integrity === "CURSOR_MISMATCH" && (
                <GlassPanel className="px-3 py-1.5 flex items-center gap-2 text-white bg-red-600 border-red-500 animate-pulse shadow-lg shadow-red-900/50">
                    <ShieldAlert className="w-4 h-4" />
                    <span>INTEGRITY FAILURE: Cursor mismatch detected. Event log may be tampered.</span>
                </GlassPanel>
            )}

            {/* Backfill Status */}
            {backfill === "ACTIVE" && (
                <GlassPanel className="px-3 py-1.5 flex items-center gap-2 text-cyan-400 bg-cyan-500/10 border-cyan-500/30">
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Backfilling history...</span>
                </GlassPanel>
            )}

            {(backfill === "PARTIAL" || backfill === "FAILED") && (
                <GlassPanel className="px-3 py-1.5 flex items-center gap-2 text-amber-400 bg-amber-500/10 border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" />
                    {gaps.length > 0 ? (
                        <span>
                            Gap: <span className="font-mono text-[9px] bg-black/20 px-1 rounded">{gaps[0].from_cursor.slice(0, 8)}...</span>
                        </span>
                    ) : (
                        <span>History Gap: Partial</span>
                    )}

                    {backfill === "FAILED" && retryInfo.retries < retryInfo.max && (
                        <button
                            onClick={retryBackfill}
                            className="ml-2 text-[9px] uppercase font-bold text-amber-500 hover:text-amber-300 underline"
                        >
                            Retry ({retryInfo.max - retryInfo.retries})
                        </button>
                    )}
                </GlassPanel>
            )}

            {/* Data Mode Pill */}
            <GlassPanel className={`px-3 py-1.5 flex items-center gap-2 border-white/5 ${mode === "WS" || mode === "LIVE"
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                : mode === "HTTP"
                    ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                }`}>
                {mode === "WS" ? (
                    <Radio className="w-3 h-3 animate-pulse" />
                ) : mode === "MOCK" ? (
                    <FlaskConical className="w-3 h-3" />
                ) : (
                    <Database className="w-3 h-3" />
                )}
                <span>
                    {mode === "MOCK" ? "MOCK DATA" : (mode === "HTTP" || mode === "LIVE") ? "LIVE TRAFFIC" : "STREAMING"}
                </span>
            </GlassPanel>

            {/* Redaction Policy */}
            <GlassPanel className="px-3 py-1.5 flex items-center gap-2 text-slate-400 bg-white/[0.03] border-white/5">
                <Lock className="w-3 h-3 opacity-60" />
                <span>REDACTION: {allowSafeMetadata ? "SAFE" : "STRICT"}</span>
            </GlassPanel>
        </div>
    );
}
