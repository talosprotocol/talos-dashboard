"use client";

import { useEffect, useState } from "react";
import { dataSource, Secret } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Plus, Trash2, Key, Search, ShieldCheck } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

export default function SecretsPage() {
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    
    const [newName, setNewName] = useState("");
    const [newValue, setNewValue] = useState("");
    const [creating, setCreating] = useState(false);

    const load = async () => {
        try {
            const data = await dataSource.listSecrets();
            setSecrets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (name: string) => {
        if (!confirm(`Are you sure you want to delete secret "${name}"?`)) return;
        try {
            await dataSource.deleteSecret(name);
            setSecrets(secrets.filter(s => s.name !== name));
        } catch (err: any) {
            alert("Failed to delete: " + err.message);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim() || !newValue.trim()) return;
        setCreating(true);
        try {
            await dataSource.createSecret(newName, newValue);
            setNewName("");
            setNewValue("");
            setShowAdd(false);
            load();
        } catch (err: any) {
            alert("Failed to create: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    const filtered = secrets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Key className="text-[var(--accent)]" /> Secrets Management
                    </h1>
                    <p className="text-[var(--text-muted)] text-sm">Managed credentials and keys as named references.</p>
                </div>
                <button 
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg font-semibold hover:opacity-90 transition-all"
                >
                    <Plus size={18} /> Add Secret
                </button>
            </div>

            <GlassPanel className="p-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg)]/50 rounded-lg border border-[var(--glass-border)] mb-4 max-w-md">
                    <Search size={16} className="text-[var(--text-muted)]" />
                    <input 
                        placeholder="Search secrets..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm flex-1 outline-none"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[var(--glass-border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                                <th className="px-4 py-3 font-semibold">Secret Name</th>
                                <th className="px-4 py-3 font-semibold">Last Updated</th>
                                <th className="px-4 py-3 font-semibold">Type</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--glass-border)]">
                            {loading ? (
                                <tr><td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">Loading secrets...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={4} className="py-10 text-center text-[var(--text-muted)]">No secrets found.</td></tr>
                            ) : filtered.map(s => (
                                <tr key={s.name} className="hover:bg-[var(--panel-hover)]/30 transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-emerald-500" />
                                            <span className="font-mono text-sm font-semibold">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-[var(--text-muted)]">
                                        {s.updated_at ? new Date(s.updated_at).toLocaleString() : (s.created_at ? new Date(s.created_at).toLocaleString() : 'Never')}
                                    </td>
                                    <td className="px-4 py-4 text-xs font-medium">
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            CREDENTIAL
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <button 
                                            onClick={() => handleDelete(s.name)}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                            title="Delete Secret"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>

            <AdminModal
                title="Add New Secret"
                description="Securely store a credential value as a named reference"
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Secret Name (ID)</label>
                        <input 
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="e.g. openai-prod-key"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Secret Value (Hidden after save)</label>
                        <textarea 
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            placeholder="Paste sensitive value here..."
                            rows={3}
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-[var(--glass-border)]">
                        <button 
                            onClick={() => setShowAdd(false)}
                            className="flex-1 px-4 py-2 border border-[var(--glass-border)] rounded-lg text-sm font-semibold hover:bg-[var(--panel-hover)] transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleCreate}
                            disabled={creating || !newName.trim() || !newValue.trim()}
                            className="flex-1 px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Secret'}
                        </button>
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
