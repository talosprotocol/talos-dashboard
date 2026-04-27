"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { AuditEvent } from "@/lib/data/schemas";
import { CheckCircle, Shield, Hash, Copy, AlertTriangle, Download, ShieldAlert, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { downloadBulkEvidenceBundle } from "@/lib/utils/export";

import { useToast } from "@/lib/hooks/use-toast";

interface ProofStep {
    position: "left" | "right";
    hash: string;
}

interface Proof {
    height: number;
    path: ProofStep[];
}

interface ProofDrawerProps {
    event: AuditEvent | null;
    onClose: () => void;
}

export function ProofDrawer({ event, onClose }: ProofDrawerProps) {
    const [proof, setProof] = useState<Proof | null>(null);
    const [loadingProof, setLoadingProof] = useState(false);
    const { toast } = useToast();

    if (!event) return null;

    const fetchProof = async () => {
        setLoadingProof(true);
        try {
            const res = await fetch(`/api/audit/proof/${event.event_id}`);
            if (!res.ok) throw new Error("Failed to fetch proof");
            const data = await res.json();
            setProof(data);
            toast({
                title: "Proof Retrieved",
                description: "Merkle path successfully loaded from audit service.",
            });
        } catch (e) {
            toast({
                title: "Proof Error",
                description: String(e),
                variant: "destructive",
            });
        } finally {
            setLoadingProof(false);
        }
    };

    const badge = computeProofBadge(event.integrity);
    const isTampered = badge === "FAILED" || event.integrity?.failure_reason === "CURSOR_MISMATCH";

    return (
        <div className={cn(
            "fixed inset-y-0 right-0 w-[480px] bg-[var(--bg)] border-l border-[var(--glass-border)] shadow-2xl backdrop-blur-xl z-50 p-6 flex flex-col transform transition-transform duration-300",
            isTampered && "border-l-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.15)]"
        )}>
            {/* Background Tint for Tampering */}
            {isTampered && (
                <div className="absolute inset-0 bg-red-500/[0.03] pointer-events-none" />
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-8 relative z-10">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Shield className={cn("w-5 h-5", isTampered ? "text-red-500" : "text-[var(--accent)]")} />
                        Audit Proof
                    </h2>
                    <div className="text-xs text-[var(--text-muted)] font-mono mt-1">{event.event_id}</div>
                </div>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close drawer">
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 relative z-10">
                {/* 1. Integrity State Machine */}
                <section>
                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3 flex justify-between items-center">
                        Integrity State
                        {!proof && (
                            <button 
                                onClick={fetchProof}
                                disabled={loadingProof}
                                className="text-[9px] px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50"
                            >
                                {loadingProof ? "Loading..." : "Verify with Backend"}
                            </button>
                        )}
                    </h3>

                    {/* CRITICAL OVERLAY */}
                    {isTampered && (
                        <div className="space-y-3 mb-6">
                            <GlassPanel className="px-3 py-3 flex flex-col gap-2 text-white bg-red-600 border-red-500 animate-pulse font-bold shadow-lg shadow-red-900/50">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5" />
                                    <span className="text-sm tracking-tight">REMEDIATION REQUIRED: DATA TAMPERING DETECTED</span>
                                </div>
                            </GlassPanel>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[11px] text-red-200 leading-relaxed italic">
                                &quot;The cryptographic chain of custody for this event has been broken. This usually indicates manual database modification or a compromised audit node. Segregate this actor immediately.&quot;
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <ComputedStateCard integrity={proof ? { ...event.integrity, proof_state: "VERIFIED" } : event.integrity} />
                        <StateCard
                            label="Signature"
                            value={event.integrity?.signature_state || "UNKNOWN"}
                            state={event.integrity?.signature_state === "VALID" ? "success" : event.integrity?.signature_state === "INVALID" ? "danger" : "warning"}
                        />
                    </div>

                    {proof && (
                        <div className="mt-4 space-y-2">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Merkle Path (Height: {proof.height})</div>
                            <div className="space-y-1">
                                {proof.path.map((step, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                        <span className="opacity-50">[{i}]</span>
                                        <span className={cn(step.position === "left" ? "text-blue-400" : "text-purple-400")}>
                                            {step.position.toUpperCase()}
                                        </span>
                                        <span className="truncate">{step.hash}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {event.integrity?.failure_reason && (
                        <div className="mt-3">
                            <FailureReasonBadge reason={event.integrity.failure_reason} />
                        </div>
                    )}
                </section>

                {/* 2. Bindings & Hashes */}
                <section>
                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">Cryptographic Bindings</h3>
                    <div className="space-y-2">
                        <HashRow label="Event Hash" value={event.hashes?.event_hash} required />
                        <HashRow label="Capability Hash" value={event.hashes?.capability_hash} />
                        <HashRow label="Request Hash" value={event.hashes?.request_hash} />
                        <HashRow label="Response Hash" value={event.hashes?.response_hash} />
                    </div>
                </section>

                {/* 3. Session Context */}
                <section>
                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">Session Context</h3>
                    <GlassPanel className="p-4 space-y-3">
                        <ContextRow label="Session ID" value={event.session_id} />
                        <ContextRow label="Correlation ID" value={event.correlation_id} />
                        <ContextRow label="Peer ID" value={event.peer_id} />
                        <ContextRow label="Tool / Method" value={`${event.tool || "N/A"} : ${event.method || "N/A"} `} />
                    </GlassPanel>
                </section>

                {/* 4. Anchor State */}
                <section>
                    <h3 className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-3">Blockchain Anchor</h3>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--panel)]">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            event.integrity?.anchor_state === "ANCHORED" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-[var(--glass-border)]"
                        )} />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{event.integrity?.anchor_state || "UNKNOWN"}</div>
                            <div className="text-xs text-[var(--text-muted)]">Verifier: {event.integrity?.verifier_version || "N/A"}</div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <div className="pt-6 mt-6 border-t border-[var(--glass-border)]">
                <GlassPanel
                    variant="hoverable"
                    className="flex items-center justify-center p-3 gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    onClick={() => downloadBulkEvidenceBundle({
                        events: [event],
                        redactionLevel: "safe_default",
                        dashboardVersion: "1.0.0"
                    })}
                >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export Evidence JSON</span>
                </GlassPanel>
            </div>
        </div>
    );
}

function StateCard({ label, value, state, icon: Icon }: { label: string, value: string, state: "success" | "warning" | "danger", icon?: React.ElementType }) {
    const colors = {
        success: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
        warning: "text-amber-400 bg-amber-500/5 border-amber-500/20",
        danger: "text-rose-400 bg-rose-500/5 border-rose-500/20"
    };

    return (
        <GlassPanel className={cn("p-3 flex flex-col gap-1", colors[state])}>
            <div className="text-[10px] uppercase font-bold opacity-70 flex items-center gap-1">
                {Icon && <Icon className="w-3 h-3" />}
                {label}
            </div>
            <div className="font-mono text-sm font-semibold truncate">{value}</div>
        </GlassPanel>
    )
}

function HashRow({ label, value, required }: { label: string, value?: string, required?: boolean }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (value) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="group flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
                <Hash className={cn("w-3 h-3", value ? "text-[var(--accent)]" : "text-[var(--text-muted)]")} />
                <div className="flex flex-col min-w-0">
                    <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
                    <span className={cn("text-xs font-mono truncate", value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] italic")}>
                        {value || (required ? "MISSING" : "Not Present")}
                    </span>
                </div>
            </div>
            {value && (
                <button onClick={handleCopy} className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" aria-label="Copy hash">
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            )}
        </div>
    )
}

function ContextRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
            <span className="text-sm font-mono text-[var(--text-primary)] truncate select-all">{value}</span>
        </div>
    )
}

function ComputedStateCard({ integrity }: { integrity: AuditEvent["integrity"] }) {
    const badge = computeProofBadge(integrity);

    // Map badge to visual state
    let state: "success" | "warning" | "danger" | "neutral" = "neutral";
    let icon = AlertCircle;

    switch (badge) {
        case "VERIFIED":
            state = "success";
            icon = CheckCircle;
            break;
        case "FAILED":
            state = "danger";
            icon = ShieldAlert;
            break;
        case "MISSING_INPUTS":
            state = "warning";
            icon = AlertTriangle;
            break;
        case "UNVERIFIED":
            state = "neutral";
            icon = AlertCircle;
            break;
    }

    // Reuse StateCard visual logic but custom color for neutral
    const colors = {
        success: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
        warning: "text-amber-400 bg-amber-500/5 border-amber-500/20",
        danger: "text-rose-400 bg-rose-500/5 border-rose-500/20",
        neutral: "text-slate-400 bg-slate-500/5 border-slate-500/20"
    };

    return (
        <GlassPanel className={cn("p-3 flex flex-col gap-1", colors[state])}>
            <div className="text-[10px] uppercase font-bold opacity-70 flex items-center gap-1">
                {/* Dynamically rendered icon */}
                {(() => {
                    const Icon = icon;
                    return <Icon className="w-3 h-3" />;
                })()}
                Proof State
            </div>
            <div className="font-mono text-sm font-semibold truncate">{badge}</div>
        </GlassPanel>
    )
}

function FailureReasonBadge({ reason }: { reason: string }) {
    // Categorize severity
    // Critical/Failed
    const isCritical = [
        "CURSOR_MISMATCH",
        "SIGNATURE_INVALID",
        "ANCHOR_FAILED",
        "VERIFIER_ERROR",
        "UNSUPPORTED_SCHEMA_VERSION"
    ].includes(reason);

    const style = isCritical
        ? "bg-red-500/10 border-red-500/20 text-red-400"
        : "bg-amber-500/10 border-amber-500/20 text-amber-400"; // Default to Amber for info

    return (
        <GlassPanel className={cn("p-3 text-xs font-mono flex items-center gap-2", style)}>
            {isCritical && <ShieldAlert className="w-3 h-3" />}
            <span>FAILURE_REASON: {reason}</span>
        </GlassPanel>
    )
}


export function computeProofBadge(integrity: AuditEvent["integrity"]): "VERIFIED" | "FAILED" | "MISSING_INPUTS" | "UNVERIFIED" {
    if (!integrity) return "UNVERIFIED";
    const { proof_state, signature_state, anchor_state, failure_reason } = integrity;

    // 1. Force FAILED (Hard Crypto/Anchor Failures)
    if (
        signature_state === "INVALID" ||
        failure_reason === "SIGNATURE_INVALID" ||
        anchor_state === "ANCHOR_FAILED" ||
        failure_reason === "ANCHOR_FAILED" ||
        failure_reason === "VERIFIER_ERROR" ||
        failure_reason === "UNSUPPORTED_SCHEMA_VERSION"
    ) {
        return "FAILED";
    }

    // 2. Force MISSING_INPUTS
    if (
        signature_state === "NOT_PRESENT" ||
        failure_reason === "MISSING_SIGNATURE" ||
        failure_reason === "MISSING_EVENT_HASH" ||
        failure_reason === "MISSING_INPUTS"
    ) {
        return "MISSING_INPUTS";
    }

    // 3. Honor proof_state (with specific mappings)
    if (proof_state === "MISSING_INPUTS") return "MISSING_INPUTS";
    if (proof_state === "UNVERIFIED") return "UNVERIFIED"; // Included ANCHOR_PENDING implicitly
    if (proof_state === "FAILED") return "FAILED";

    // Default to VERIFIED if state says verified (and no overrides hit)
    return "VERIFIED";
}
