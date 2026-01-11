"use client";

import { useEffect, useState } from "react";
import { dataSource, McpPolicy } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Plus, Trash2, ShieldCheck, Users, Box, Edit2 } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

export default function McpPoliciesPage() {
    const [policies, setPolicies] = useState<McpPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<McpPolicy | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<McpPolicy>>({
        id: "", team_id: "", allowed_servers: [], allowed_tools: ["*"]
    });

    const load = async () => {
        try {
            const data = await dataSource.listMcpPolicies();
            setPolicies(data);
        } catch (err) {
            console.error("Failed to load MCP policies", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleOpenAdd = () => {
        setEditing(null);
        setFormData({ id: "", team_id: "", allowed_servers: [], allowed_tools: ["*"] });
        setShowModal(true);
    };

    const handleOpenEdit = (p: McpPolicy) => {
        setEditing(p);
        setFormData({ ...p });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await dataSource.upsertMcpPolicy(formData);
            if (editing) {
                setPolicies(prev => prev.map(p => p.id === result.id ? result : p));
            } else {
                setPolicies(prev => [...prev, result]);
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            alert("Failed to save: " + msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this policy?")) return;
        try {
            await dataSource.deleteMcpPolicy(id);
            setPolicies(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert("Failed to delete: " + err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">MCP Policies</h1>
                    <p className="text-sm text-[var(--text-muted)]">Control team access to MCP servers and tools</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
                >
                    <Plus size={16} />
                    New Policy
                </button>
            </div>

            <GlassPanel className="overflow-hidden border-[var(--glass-border)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--glass-border)] bg-[var(--panel-hover)]/30">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Policy ID</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Team Context</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Servers</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Tools</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-6 py-8">
                                        <div className="h-4 bg-[var(--panel-hover)] rounded w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : policies.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                    No MCP policies configured
                                </td>
                            </tr>
                        ) : (
                            policies.map(p => (
                                <tr key={p.id} className="hover:bg-[var(--panel-hover)]/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-[var(--accent)]" />
                                            <span className="font-mono font-bold text-sm text-[var(--text-primary)] truncate max-w-[120px]">{p.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="opacity-50" />
                                            {p.team_id || "Global"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex flex-wrap gap-1">
                                            {p.allowed_servers.map(s => (
                                                <span key={s} className="px-1.5 py-0.5 rounded bg-[var(--panel-hover)] border border-[var(--glass-border)] text-[10px]">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Box size={14} className="text-emerald-500" />
                                            <span className="text-xs">{p.allowed_tools.join(", ") || "None"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenEdit(p)}
                                                className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)]"
                                                title="Edit Policy"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(p.id)}
                                                className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-rose-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </GlassPanel>

            <AdminModal
                title={editing ? "Edit MCP Policy" : "New MCP Policy"}
                description={editing ? `Update access control for ${editing.id}` : "Define tool access rules for a team or globally"}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            >
                <div className="space-y-4">
                    {!editing && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Policy ID</label>
                            <input 
                                value={formData.id}
                                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="e.g. engineering-full"
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Team ID (Leave blank for Global)</label>
                        <input 
                            value={formData.team_id}
                            onChange={e => setFormData(prev => ({ ...prev, team_id: e.target.value }))}
                            placeholder="e.g. engineering"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Allowed Servers (Comma separated)</label>
                        <input 
                            value={formData.allowed_servers?.join(", ")}
                            onChange={e => setFormData(prev => ({ ...prev, allowed_servers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            placeholder="filesystem, memory, slack"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Allowed Tools (Comma separated, use * for all)</label>
                        <input 
                            value={formData.allowed_tools?.join(", ")}
                            onChange={e => setFormData(prev => ({ ...prev, allowed_tools: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))}
                            placeholder="*"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[var(--glass-border)]">
                        <button 
                            onClick={() => setShowModal(false)}
                            className="flex-1 px-4 py-2 border border-[var(--glass-border)] rounded-lg text-sm font-semibold hover:bg-[var(--panel-hover)] transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (editing ? 'Update Policy' : 'Create Policy')}
                        </button>
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
