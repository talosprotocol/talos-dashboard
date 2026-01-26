"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { dataSource, Upstream } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Plus, Trash2, Power, Globe, Tag, Edit2 } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

export default function UpstreamsPage() {
    const [upstreams, setUpstreams] = useState<Upstream[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Upstream | null>(null);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState<Partial<Upstream>>({
        id: "", provider: "openai", endpoint: "", credentials_ref: "", enabled: true, tags: {}
    });

    const load = async () => {
        try {
            const data = await dataSource.listUpstreams();
            setUpstreams(data);
        } catch (err) {
            console.error("Failed to load upstreams", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleOpenAdd = () => {
        setEditing(null);
        setFormData({ id: "", provider: "openai", endpoint: "", credentials_ref: "", enabled: true, tags: {} });
        setShowModal(true);
    };

    const handleOpenEdit = (u: Upstream) => {
        setEditing(u);
        setFormData({ ...u });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) {
                const result = await dataSource.updateUpstream(
                    editing.id, 
                    formData, 
                    editing.version
                );
                setUpstreams(prev => prev.map(u => u.id === result.id ? result : u));
            } else {
                const result = await dataSource.createUpstream(formData);
                setUpstreams(prev => [...prev, result]);
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast({
                title: "Inbound Interface Error",
                description: `Failed to save upstream: ${msg}`,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this upstream?")) return;
        try {
            await dataSource.deleteUpstream(id);
            setUpstreams(prev => prev.filter(u => u.id !== id));
        } catch (err: unknown) {
            let msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("DEPENDENCY_EXISTS") || msg.includes("dependent")) {
                msg = "Cannot delete upstream: It is currently being used by one or more Model Groups. Please remove those deployments first.";
            }
            toast({
                title: "Teardown Conflict",
                description: msg,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">LLM Upstreams</h1>
                    <p className="text-sm text-[var(--text-muted)]">Configure external AI provider endpoints</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
                >
                    <Plus size={16} />
                    Add Upstream
                </button>
            </div>

            <GlassPanel className="overflow-hidden border-[var(--glass-border)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--glass-border)] bg-[var(--panel-hover)]/30">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Upstream ID</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Provider</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Endpoint</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
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
                        ) : upstreams.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                    No upstreams configured
                                </td>
                            </tr>
                        ) : (
                            upstreams.map(u => (
                                <tr key={u.id} className="hover:bg-[var(--panel-hover)]/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{u.id}</span>
                                            <div className="flex gap-1 mt-1">
                                                {Object.entries(u.tags).map(([k, v]) => (
                                                    <span key={k} className="px-1.5 py-0.5 rounded bg-[var(--accent)]/5 border border-[var(--accent)]/10 text-[10px] text-[var(--accent)] flex items-center gap-1">
                                                        <Tag size={8} /> {v}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm capitalize">{u.provider}</td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-muted)] truncate max-w-xs">
                                        <div className="flex items-center gap-2">
                                            <Globe size={14} className="opacity-50" />
                                            {u.endpoint}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {u.enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenEdit(u)}
                                                className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)]"
                                                title="Edit Upstream"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-emerald-500">
                                                <Power size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(u.id)}
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
                title={editing ? "Edit Upstream" : "Add Upstream"} 
                description={editing ? `Update configuration for ${editing.id}` : "Configure a new LLM provider endpoint"}
                isOpen={showModal} 
                onClose={() => setShowModal(false)}
            >
                <div className="space-y-4">
                    {!editing && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Upstream ID</label>
                            <input 
                                value={formData.id}
                                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="e.g. openai-prod"
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Provider</label>
                            <select 
                                value={formData.provider}
                                onChange={e => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="azure">Azure OpenAI</option>
                                <option value="google">Google Vertex/AI</option>
                                <option value="custom">Custom (OpenAI Compatible)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Credentials Ref</label>
                            <input 
                                value={formData.credentials_ref}
                                onChange={e => setFormData(prev => ({ ...prev, credentials_ref: e.target.value }))}
                                placeholder="e.g. openai-key"
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Endpoint URL</label>
                        <input 
                            value={formData.endpoint}
                            onChange={e => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
                            placeholder="https://api.openai.com/v1"
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
                            {saving ? 'Saving...' : (editing ? 'Update Upstream' : 'Create Upstream')}
                        </button>
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
