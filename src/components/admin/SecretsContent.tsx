"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { dataSource } from "@/lib/data/DataSource";
import type { Secret, KekStatus, RotationOperation } from "@/lib/data/DataSourceTypes";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";
import { Plus, Trash2, Key, Search, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Clock, Lock } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

export default function SecretsContent() {
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const { toast } = useToast();

    const [newName, setNewName] = useState("");
    const [newValue, setNewValue] = useState("");
    const [creating, setCreating] = useState(false);

    // Rotation State
    const [kekStatus, setKekStatus] = useState<KekStatus | null>(null);
    const [activeOp, setActiveOp] = useState<RotationOperation | null>(null);
    const [rotating, setRotating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, kek] = await Promise.all([
                dataSource.listSecrets(),
                dataSource.getKekStatus()
            ]);
            setSecrets(data);
            setKekStatus(kek);
        } catch (err) {
            console.error("Failed to load secrets", err);
            const msg = err instanceof Error ? err.message : "Failed to synchronize with KMS";
            setError(msg);
            toast({ title: "Sync Failure", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    // Poll rotation operation status
    useEffect(() => {
        if (!activeOp || activeOp.status !== "running") return;
        const interval = setInterval(async () => {
            try {
                const updated = await dataSource.getRotationStatus(activeOp.id);
                setActiveOp(updated);
                if (updated.status !== "running") {
                    clearInterval(interval);
                    load();
                    toast({
                        title: updated.status === "completed" ? "Rotation Complete" : "Rotation Failed",
                        description: updated.status === "completed"
                            ? `Rotated ${updated.stats?.rotated ?? 0} of ${updated.stats?.scanned ?? 0} secrets.`
                            : updated.last_error || "An error occurred during rotation.",
                        variant: updated.status === "completed" ? "default" : "destructive"
                    });
                }
            } catch (e) {
                console.error("Failed to poll rotation", e);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [activeOp, load, toast]);

    const handleDelete = async (name: string) => {
        if (!confirm(`Delete secret "${name}"? This action cannot be undone.`)) return;
        try {
            await dataSource.deleteSecret(name);
            setSecrets(prev => prev.filter(s => s.name !== name));
            toast({ title: "Secret Deleted", description: `"${name}" has been removed.` });
        } catch (err) {
            toast({
                title: "Delete Failed",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive"
            });
        }
    };

    const handleCreate = async () => {
        if (!newName.trim() || !newValue.trim()) return;
        setCreating(true);
        try {
            await dataSource.createSecret(newName.trim(), newValue);
            setNewName(""); setNewValue(""); setShowAdd(false);
            await load();
            toast({ title: "Secret Created", description: `"${newName}" stored securely.` });
        } catch (err) {
            toast({
                title: "Create Failed",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive"
            });
        } finally {
            setCreating(false);
        }
    };

    const handleRotate = async () => {
        const staleCount = Object.values(kekStatus?.stale_counts || {}).reduce((a, b) => a + b, 0);
        if (!confirm(`This will re-encrypt ${staleCount} stale secret(s) under the current KEK. Background rotation will begin immediately. Continue?`)) return;
        setRotating(true);
        try {
            const op = await dataSource.rotateAllSecrets();
            setActiveOp(op);
            toast({ title: "Rotation Started", description: `Operation ${op.id} is running in the background.` });
        } catch (err) {
            toast({
                title: "Rotation Error",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive"
            });
        } finally {
            setRotating(false);
        }
    };

    const filtered = secrets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    const staleCount = Object.values(kekStatus?.stale_counts || {}).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <Key className="text-[var(--accent)]" size={22} />
                        Secrets Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Platform credentials stored encrypted under the current Key Encryption Key (KEK).
                    </p>
                </div>
                <button
                    id="btn-add-secret"
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-[var(--bg)] rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(20,255,236,0.2)]"
                >
                    <Plus size={16} /> New Secret
                </button>
            </div>

            {/* KEK Status Panel */}
            <GlassPanel className="p-5 border-l-4 border-l-cyan-500/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ShieldCheck size={11} className="text-cyan-400" /> Key Encryption Key Status
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-xs font-mono font-bold text-slate-300 bg-black/30 px-2.5 py-1 rounded-lg border border-white/10">
                                {kekStatus?.current_kek_id || "Loading…"}
                            </div>
                            {kekStatus && (
                                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tight">
                                        Active
                                    </span>
                                </div>
                            )}
                        </div>
                        {kekStatus && (
                            <div className="text-[10px] text-slate-600 mt-2">
                                {kekStatus.loaded_kek_ids?.length ?? 1} KEK(s) loaded · {staleCount} stale secret(s)
                            </div>
                        )}
                    </div>
                    <button
                        id="btn-rotate-all"
                        onClick={handleRotate}
                        disabled={rotating || activeOp?.status === "running"}
                        className="flex items-center gap-2 px-4 py-2.5 border border-amber-500/30 bg-amber-500/10 text-amber-400 rounded-xl font-bold text-sm hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <RefreshCw size={15} className={rotating || activeOp?.status === "running" ? "animate-spin" : ""} />
                        {activeOp?.status === "running" ? "Rotation Running…" : `Rotate All (${staleCount} stale)`}
                    </button>
                </div>

                {/* Rotation Progress */}
                {activeOp && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {activeOp.status === "running" ? (
                                    <Clock size={13} className="text-amber-400 animate-spin" />
                                ) : activeOp.status === "completed" ? (
                                    <CheckCircle2 size={13} className="text-emerald-400" />
                                ) : (
                                    <AlertTriangle size={13} className="text-rose-400" />
                                )}
                                <span className="text-[11px] font-bold text-slate-400 font-mono">
                                    Operation <span className="text-slate-300">{activeOp.id?.slice(0, 12)}…</span>
                                </span>
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                activeOp.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : activeOp.status === "running" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>{activeOp.status}</span>
                        </div>
                        {activeOp.stats && (
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { key: "scanned", label: "Scanned", val: activeOp.stats.scanned },
                                    { key: "rotated", label: "Rotated", val: activeOp.stats.rotated },
                                    { key: "failed", label: "Failed", val: activeOp.stats.failed, color: "text-rose-400" },
                                ].map(s => (
                                    <div key={s.key} className="text-center px-3 py-2 bg-white/[0.02] rounded-lg border border-white/5">
                                        <div className={`text-lg font-mono font-bold ${s.color || "text-white"}`}>{s.val}</div>
                                        <div className="text-[9px] font-black text-slate-600 uppercase">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeOp.last_error && (
                            <div className="mt-2 text-[10px] text-rose-400 font-mono bg-rose-500/5 px-2 py-1.5 rounded border border-rose-500/10">
                                Error: {activeOp.last_error}
                            </div>
                        )}
                    </div>
                )}
            </GlassPanel>

            {/* Secrets Table */}
            <GlassPanel className="p-5">
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-white/5 rounded-xl border border-white/10 max-w-xs">
                        <Search size={14} className="text-slate-500 shrink-0" />
                        <input
                            id="secrets-search"
                            placeholder="Search secrets..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-sm flex-1 outline-none text-slate-200 placeholder:text-slate-600"
                        />
                    </div>
                    <span className="text-[10px] font-black text-slate-600 ml-auto">{filtered.length} secret{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                {loading ? (
                    <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                        <Lock size={28} className="text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-600 text-xs uppercase tracking-widest font-black">No secrets found</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(secret => (
                            <SecretRow
                                key={secret.name}
                                secret={secret}
                                currentKekId={kekStatus?.current_kek_id}
                                onDelete={() => handleDelete(secret.name)}
                            />
                        ))}
                    </div>
                )}
            </GlassPanel>

            {/* Add Modal */}
            {showAdd && (
                <AdminModal
                    title="New Secret"
                    description="Store a named secret securely. The value is encrypted at rest using the current KEK."
                    onClose={() => { setShowAdd(false); setNewName(""); setNewValue(""); }}
                    onConfirm={handleCreate}
                    confirmLabel={creating ? "Storing…" : "Store Secret"}
                    confirmDisabled={!newName.trim() || !newValue.trim() || creating}
                >
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secret Name</label>
                            <input
                                id="new-secret-name"
                                autoFocus
                                placeholder="e.g. openai-api-key"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="mt-1 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-sm font-mono text-slate-200 outline-none focus:border-[var(--accent)]/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secret Value</label>
                            <input
                                id="new-secret-value"
                                type="password"
                                placeholder="The secret value to encrypt"
                                value={newValue}
                                onChange={e => setNewValue(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleCreate()}
                                className="mt-1 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-sm font-mono text-slate-200 outline-none focus:border-[var(--accent)]/50 transition-colors"
                            />
                        </div>
                    </div>
                </AdminModal>
            )}
        </div>
    );
}

function SecretRow({
    secret, onDelete, currentKekId
}: { secret: Secret; onDelete: () => void; currentKekId?: string }) {
    const isStale = currentKekId && secret.kek_id && secret.kek_id !== currentKekId;

    return (
        <div className={cn(
            "group flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
            isStale 
                ? "bg-amber-500/[0.03] border-amber-500/20 hover:bg-amber-500/[0.06] hover:border-amber-500/30" 
                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
        )}>
            <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    isStale ? "bg-amber-500/10 text-amber-500" : "bg-cyan-500/10 text-cyan-400"
                )}>
                    {isStale ? <AlertTriangle size={16} /> : <Key size={16} />}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="text-sm font-mono font-bold text-white truncate">{secret.name}</div>
                        {isStale && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase tracking-tight animate-pulse">
                                Stale
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                        {secret.updated_at ? `Synchronized ${new Date(secret.updated_at).toLocaleDateString()}` : "Ready"}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <div className="hidden md:flex flex-col items-end">
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Encryption Key</div>
                    {secret.kek_id ? (
                        <div className="text-[10px] font-mono font-bold text-slate-400 bg-black/20 px-2 py-0.5 rounded border border-white/5">
                            {secret.kek_id.slice(0, 12)}…
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-700 italic">None</span>
                    )}
                </div>
                <button
                    onClick={onDelete}
                    aria-label={`Delete ${secret.name}`}
                    className="p-2 rounded-xl text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
