"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { dataSource, McpServer } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Plus, Trash2, Power, Terminal, Edit2 } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

export default function McpServersPage() {
    const [servers, setServers] = useState<McpServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<McpServer | null>(null);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState<Partial<McpServer>>({
        id: "", name: "", endpoint: "", enabled: true
    });

    const load = async () => {
        try {
            const data = await dataSource.listMcpServers();
            setServers(data);
        } catch (err) {
            console.error("Failed to load MCP servers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleOpenAdd = () => {
        setEditing(null);
        setFormData({ id: "", name: "", endpoint: "", enabled: true });
        setShowModal(true);
    };

    const handleOpenEdit = (s: McpServer) => {
        setEditing(s);
        setFormData({ ...s });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editing) {
                const result = await dataSource.updateMcpServer(editing.id, formData, editing.version);
                setServers(prev => prev.map(s => s.id === result.id ? result : s));
            } else {
                const result = await dataSource.createMcpServer(formData);
                setServers(prev => [...prev, result]);
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast({
                title: "Registry Sync Failure",
                description: `Failed to save MCP server: ${msg}`,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this MCP server?")) return;
        try {
            await dataSource.deleteMcpServer(id);
            setServers(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast({
                title: "Decommissioning Failure",
                description: `Failed to delete MCP server: ${err}`,
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">MCP Servers</h1>
                    <p className="text-sm text-[var(--text-muted)]">Register and manage Model Context Protocol servers</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="px-4 py-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
                >
                    <Plus size={16} />
                    Add Server
                </button>
            </div>

            <GlassPanel className="overflow-hidden border-[var(--glass-border)]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[var(--glass-border)] bg-[var(--panel-hover)]/30">
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Server ID</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Endpoint</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--glass-border)]">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={4} className="px-6 py-8">
                                        <div className="h-4 bg-[var(--panel-hover)] rounded w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : servers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                    No MCP servers configured
                                </td>
                            </tr>
                        ) : (
                            servers.map(s => (
                                <tr key={s.id} className="hover:bg-[var(--panel-hover)]/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Terminal size={14} className="text-sky-500" />
                                            <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{s.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-muted)] truncate max-w-sm">
                                        {s.endpoint}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${s.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {s.enabled ? 'Online' : 'Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleOpenEdit(s)}
                                                className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-[var(--accent)]"
                                                title="Edit Server"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-1.5 hover:bg-[var(--panel-hover)] rounded-md text-[var(--text-muted)] hover:text-emerald-500">
                                                <Power size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(s.id)}
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
                title={editing ? "Edit MCP Server" : "Add MCP Server"}
                description={editing ? `Update configuration for ${editing.id}` : "Register a new external Model Context Protocol server"}
                isOpen={showModal}
                onClose={() => setShowModal(false)}
            >
                <div className="space-y-4">
                    {!editing && (
                        <div>
                            <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Server ID</label>
                            <input 
                                value={formData.id}
                                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="e.g. filesystem"
                                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Server Name</label>
                        <input 
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Filesystem Connector"
                            className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Endpoint URL / Stdio Command</label>
                        <input 
                            value={formData.endpoint}
                            onChange={e => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
                            placeholder="e.g. https://mcp.example.com/api or stdio://cat"
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
                            {saving ? 'Saving...' : (editing ? 'Update Server' : 'Create Server')}
                        </button>
                    </div>
                </div>
            </AdminModal>
        </div>
    );
}
