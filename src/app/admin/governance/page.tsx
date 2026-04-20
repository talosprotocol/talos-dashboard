"use client";

import { GovernanceContent } from "@/components/dashboard/GovernanceContent";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Governance Management Page
 */
export default function GovernancePage() {
    return (
        <main className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-12 font-sans selection:bg-indigo-500/30">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link 
                                href="/management" 
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Link>
                            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-indigo-400" />
                                Governance <span className="text-indigo-400">Agent</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 text-sm max-w-2xl">
                            Oversight and high-integrity authorization for the Talos Protocol. 
                            Every action is cryptographically tied to a hash chain for tamper-evident auditing.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
                            Integrity Monitoring Active
                         </div>
                    </div>
                </div>

                {/* Main Content */}
                <GovernanceContent />

                {/* Footer Insight */}
                <GlassPanel className="p-6 bg-slate-900/40 border-white/5">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="flex-1 space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">The Governance Chain</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                The Talos Governance Agent (TGA) maintains a non-repudiable log of all autonomous interventions. 
                                Each log entry contains the SHA-256 digest of the previous entry, creating an unbroken hash chain 
                                from the cluster genesis. If any record is altered, the cryptographic chain will fail validation 
                                during the next synchronization event.
                            </p>
                        </div>
                        <div className="flex-shrink-0 grid grid-cols-2 gap-4 w-full md:w-auto">
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Protocol Version</div>
                                <div className="text-xs font-bold text-slate-300">v1.2.0-SEC</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Audit Retention</div>
                                <div className="text-xs font-bold text-slate-300">90 Days / Chain</div>
                            </div>
                        </div>
                    </div>
                </GlassPanel>
            </div>
        </main>
    );
}
