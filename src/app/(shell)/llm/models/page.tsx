"use client";

import { useEffect, useState } from "react";
import { dataSource, ModelGroup } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Plus, Trash2, Power, Layers, Zap, Edit2 } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

export default function ModelGroupsPage() {
    const [groups, setGroups] = useState<ModelGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<ModelGroup | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<ModelGroup>>({
        id: "", name: "", routing_policy_id: "default", enabled: true, deployments: [], fallback_groups: []
    });

    const load = async () => {
        try {
            const data = await dataSource.listModelGroups();
            setGroups(data);
        } catch (err) {
            console.error("Failed to load model groups", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleOpenAdd = () => {
        setEditing(null);
        setFormData({ id: "", name: "", routing_policy_id: "default", enabled: true, deployments: [], fallback_groups: [] });
        setShowModal(true);
    };

    const handleOpenEdit = (g: ModelGroup) => {
        setEditing(g);
        setFormData({ ...g });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) {
                const result = await dataSource.updateModelGroup(editing.id, formData, editing.version);
                setGroups(prev => prev.map(g => g.id === result.id ? result : g));
            } else {
                const result = await dataSource.createModelGroup(formData);
                setGroups(prev => [...prev, result]);
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
        if (!confirm("Are you sure you want to delete this model group?")) return;
        try {
            await dataSource.deleteModelGroup(id);
            setGroups(prev => prev.filter(g => g.id !== id));
        } catch (err) {
            alert("Failed to delete: " + err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Model Groups</h1>
                    <p className="text-sm text-[var(--text-muted)]">Manage logical model groupings and routing</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
                >
                    <Plus size={16} />
                    Create Group
                </button>
            </div>

            <GlassPanel className="overflow-hidden border-[var(--glass-border)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--glass-border)] bg-[var(--panel-hover)]/30">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Group ID / Name</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Policy</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Deployments</th>
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
                        ) : groups.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                    No model groups configured
                                </td>
                            </tr>
                        ) : (
                            groups.map(g => (
                                <tr key={g.id} className="hover:bg-[var(--panel-hover)]/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{g.id}</span>
                                            <span className="text-xs text-[var(--text-muted)]">{g.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <Zap size={14} className="text-amber-500" />
                                            {g.routing_policy_id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Layers size={14} className="opacity-50" />
                                            {g.deployments.length} deployments
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${g.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {g.enabled ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenEdit(g)}
                                                className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)]"
                                                title="Edit Group"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-emerald-500">
                                                <Power size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(g.id)}
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
                title={editing ? "Edit Model Group" : "Create Model Group"}
                description={editing ? `Configure routing for ${editing.id}` : "Create a new logical grouping of model deployments"}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            >
                <div className="space-y-4">
                    {!editing && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Group ID</label>
                            <input 
                                value={formData.id}
                                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="e.g. gpt-4-prod"
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Display Name</label>
                        <input 
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. GPT-4 Production"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Routing Policy ID</label>
                        <select 
                            value={formData.routing_policy_id}
                            onChange={e => setFormData(prev => ({ ...prev, routing_policy_id: e.target.value }))}
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        >
                            <option value="default">Default (Round Robin)</option>
                            <option value="latency">Latency Optimized</option>
                            <option value="cost">Cost Optimized</option>
                        </select>
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
                            {saving ? 'Saving...' : (editing ? 'Update Group' : 'Create Group')}
                        </button>
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
