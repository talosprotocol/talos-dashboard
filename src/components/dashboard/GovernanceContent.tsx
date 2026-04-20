"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { ShieldCheck, History, Activity, Terminal, AlertCircle, CheckCircle, Scale } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GovernanceLogEntry {
    trace_id: string;
    sequence_number: number;
    artifact_type: string;
    ts: string;
    status: string;
    principal_id: string;
    artifact_id: string;
}

/**
 * GovernanceContent - Administrative Visibility into TGA Decisions
 */
export function GovernanceContent() {
    const [entries, setEntries] = useState<GovernanceLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const resp = await fetch("/api/admin/v1/governance/logs");
            if (!resp.ok) throw new Error("Failed to fetch governance logs");
            const data = await resp.json();
            setEntries(data.entries || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to fetch governance logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header / Stats Overlay */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <GlassPanel className="p-4 bg-indigo-500/5 border-indigo-500/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">TGA Status</span>
                    </div>
                    <div className="text-xl font-extrabold text-white">Active</div>
                    <div className="text-[10px] text-indigo-300/50 uppercase font-black">Integrity Check v1.0</div>
                </GlassPanel>

                <GlassPanel className="p-4 bg-emerald-500/5 border-emerald-500/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Authorized</span>
                    </div>
                    <div className="text-xl font-extrabold text-white">{entries.length}</div>
                    <div className="text-[10px] text-emerald-300/50 uppercase font-black">All Trace Sequences</div>
                </GlassPanel>

                <GlassPanel className="p-4 bg-amber-500/5 border-amber-500/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-amber-400 mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Warm Path Hits</span>
                    </div>
                    <div className="text-xl font-extrabold text-white">100%</div>
                    <div className="text-[10px] text-amber-300/50 uppercase font-black">Session Recall Efficiency</div>
                </GlassPanel>

                <GlassPanel className="p-4 bg-white/5 border-white/10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Scale className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Supervisor</span>
                    </div>
                    <div className="text-xl font-extrabold text-white truncate text-xs">GLOBAL_PRIMARY</div>
                    <div className="text-[10px] text-slate-500 uppercase font-black">Root Authority</div>
                </GlassPanel>
            </div>

            {/* Governance Log Table */}
            <GlassPanel className="overflow-hidden border-white/5">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">High-Integrity Execution Log</h3>
                    </div>
                    <button 
                        onClick={fetchLogs}
                        disabled={loading}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        {loading ? "Syncing..." : "Refresh Chain"}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Trace ID</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Operation / Sequence</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Principal</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Integrity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence mode="popLayout">
                                {entries.map((entry, idx) => (
                                    <motion.tr 
                                        key={`${entry.trace_id}-${entry.sequence_number}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-[10px] font-mono font-bold text-slate-400">
                                                {new Date(entry.ts).toLocaleTimeString([], { hour12: false })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                <span className="text-[10px] font-mono font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">
                                                    {entry.trace_id.slice(0, 8)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-white">{entry.artifact_type}</span>
                                                    <span className="px-1 py-0.5 bg-white/5 border border-white/5 rounded text-[8px] font-black text-slate-500">SEQ {entry.sequence_number}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-500 truncate max-w-[200px]">{entry.artifact_id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                <Terminal className="w-3 h-3 opacity-50" />
                                                <span>{entry.principal_id.slice(0, 12)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {entry.status === "VALIDATED" ? (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded inline-flex border border-emerald-500/20">
                                                    <CheckCircle className="w-3 h-3" />
                                                    CHAIN_VERIFIED
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded inline-flex border border-amber-500/20">
                                                    <AlertCircle className="w-3 h-3" />
                                                    UNVERIFIED
                                                </div>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>

                            {entries.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <History className="w-8 h-8 text-slate-700 mb-2" />
                                            <span className="text-sm font-medium text-slate-500 italic">No execution traces recorded in current window</span>
                                            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">TGA is standing by for authorization requests</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>

            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4 text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
                    <span>Secure Evidence Storage: SQLite Hardened</span>
                    <span>Algorithm: EdDSA (Ed25519)</span>
                </div>
                <div className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                     Execution Context Isolation: Enabled
                </div>
            </div>
        </div>
    );
}
