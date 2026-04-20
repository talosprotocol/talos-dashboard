"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { dataSource, RbacRole, RbacBinding } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Plus, Trash2, Shield, Search, Users, ExternalLink } from "lucide-react";
import { AdminModal } from "@/components/admin/AdminModal";

function errorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback;
}

export default function RBACContent() {
    const [roles, setRoles] = useState<RbacRole[]>([]);
    const [bindings, setBindings] = useState<RbacBinding[]>([]);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"roles" | "bindings">("roles");
    const [search, setSearch] = useState("");
    const { toast } = useToast();

    // Role modal state
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRoleId, setNewRoleId] = useState("");
    const [newRoleName, setNewRoleName] = useState("");
    const [newRolePerms, setNewRolePerms] = useState("");
    const [savingRole, setSavingRole] = useState(false);

    // Binding modal state
    const [showBindingModal, setShowBindingModal] = useState(false);
    const [newPrincipal, setNewPrincipal] = useState("");
    const [newBindingRoleId, setNewBindingRoleId] = useState("");
    const [newScopeType, setNewScopeType] = useState("global");
    const [savingBinding, setSavingBinding] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [rolesData, bindingsData] = await Promise.all([
                dataSource.listRbacRoles(),
                dataSource.listRbacBindings()
            ]);
            setRoles(rolesData);
            setBindings(bindingsData);
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "Failed to load RBAC config";
            setError(msg);
            toast({ title: "Sync Failure", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const handleDeleteRole = async (roleId: string) => {
        if (!confirm(`Delete role "${roleId}"?`)) return;
        try {
            await dataSource.deleteRbacRole(roleId);
            setRoles(prev => prev.filter(r => r.role_id !== roleId));
            toast({ title: "Role Removed", description: `${roleId} removed.` });
        } catch (err: unknown) {
            toast({ title: "Error", description: errorMessage(err, "Failed to delete role"), variant: "destructive" });
        }
    };

    const handleDeleteBinding = async (principalId: string) => {
        if (!confirm(`Revoke all bindings for "${principalId}"?`)) return;
        try {
            await dataSource.deleteRbacBinding(principalId);
            setBindings(prev => prev.filter(b => b.principal_id !== principalId));
            toast({ title: "Access Revoked", description: `${principalId} bindings cleared.` });
        } catch (err: unknown) {
            toast({ title: "Error", description: errorMessage(err, "Failed to revoke binding"), variant: "destructive" });
        }
    };

    const handleCreateRole = async () => {
        if (!newRoleId.trim() || !newRoleName.trim()) return;
        setSavingRole(true);
        try {
            const perms = newRolePerms.split("\n").map(p => p.trim()).filter(Boolean);
            const role: RbacRole = {
                role_id: newRoleId.trim(),
                name: newRoleName.trim(),
                permissions: perms.length > 0 ? perms : ["system:health"],
                built_in: false,
            };
            await dataSource.upsertRbacRole(role);
            setShowRoleModal(false);
            setNewRoleId(""); setNewRoleName(""); setNewRolePerms("");
            await load();
            toast({ title: "Role Created", description: `"${role.name}" added.` });
        } catch (err: unknown) {
            toast({ title: "Create Failed", description: errorMessage(err, "Failed to create role"), variant: "destructive" });
        } finally {
            setSavingRole(false);
        }
    };

    const handleCreateBinding = async () => {
        if (!newPrincipal.trim() || !newBindingRoleId) return;
        setSavingBinding(true);
        try {
            const binding: RbacBinding = {
                principal_id: newPrincipal.trim(),
                bindings: [{
                    binding_id: `bind_${Date.now()}`,
                    role_id: newBindingRoleId,
                    scope: { scope_type: newScopeType, attributes: {} }
                }]
            };
            await dataSource.upsertRbacBinding(binding);
            setShowBindingModal(false);
            setNewPrincipal(""); setNewBindingRoleId(""); setNewScopeType("global");
            await load();
            toast({ title: "Binding Created", description: `${newPrincipal} granted ${newBindingRoleId}.` });
        } catch (err: unknown) {
            toast({ title: "Binding Error", description: errorMessage(err, "Failed to create binding"), variant: "destructive" });
        } finally {
            setSavingBinding(false);
        }
    };

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.role_id.toLowerCase().includes(search.toLowerCase())
    );
    const filteredBindings = bindings.filter(b =>
        b.principal_id.toLowerCase().includes(search.toLowerCase())
    );

    const inputClass = "w-full px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-sm font-mono text-slate-200 outline-none focus:border-cyan-500/50 transition-colors";
    const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1";

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <Shield className="text-[var(--accent)]" size={22} />
                        RBAC Mission Control
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Policy-based access control for platform surfaces and resources.</p>
                </div>
                <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                    {(["roles", "bindings"] as const).map(tab => (
                        <button
                            key={tab}
                            id={`tab-${tab}`}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                                activeTab === tab
                                    ? "bg-[var(--accent)] text-[var(--bg)] shadow-lg"
                                    : "text-slate-500 hover:text-slate-200"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex-1 max-w-xs">
                    <Search size={14} className="text-slate-500 shrink-0" />
                    <input
                        placeholder={`Search ${activeTab}…`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm flex-1 outline-none text-slate-200 placeholder:text-slate-600"
                    />
                </div>
                <button
                    id={`btn-add-${activeTab}`}
                    onClick={() => activeTab === "roles" ? setShowRoleModal(true) : setShowBindingModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent)] text-[var(--bg)] rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(20,255,236,0.2)]"
                >
                    <Plus size={16} /> {activeTab === "roles" ? "New Role" : "Grant Access"}
                </button>
            </div>

            {/* Roles Table */}
            {activeTab === "roles" && (
                <GlassPanel className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5">
                                    <th className="px-6 py-4">Role ID / Name</th>
                                    <th className="px-6 py-4">Permissions</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={3} className="py-16 text-center text-slate-600 text-sm">Synchronizing authorities…</td></tr>
                                ) : filteredRoles.length === 0 ? (
                                    <tr><td colSpan={3} className="py-16 text-center text-slate-700 text-xs uppercase tracking-widest font-black">No authority definitions found</td></tr>
                                ) : filteredRoles.map(role => (
                                    <tr key={role.role_id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-sm font-bold text-slate-200 flex items-center gap-2">
                                                    {role.role_id}
                                                    {role.built_in && (
                                                        <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-400/30 uppercase tracking-tighter">Built-in</span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-500 mt-0.5">{role.name}</span>
                                                {role.description && <span className="text-[10px] text-slate-700 italic mt-0.5">{role.description}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-sm">
                                                {role.permissions.slice(0, 6).map(p => (
                                                    <span key={p} className="px-2 py-0.5 bg-black/40 text-[10px] font-mono text-slate-400 rounded border border-white/5">{p}</span>
                                                ))}
                                                {role.permissions.length > 6 && (
                                                    <span className="px-2 py-0.5 text-[10px] text-slate-600 rounded">+{role.permissions.length - 6} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!role.built_in && (
                                                <button
                                                    onClick={() => handleDeleteRole(role.role_id)}
                                                    aria-label={`Delete role ${role.role_id}`}
                                                    className="p-1.5 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassPanel>
            )}

            {/* Bindings Table */}
            {activeTab === "bindings" && (
                <GlassPanel className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5">
                                    <th className="px-6 py-4">Principal</th>
                                    <th className="px-6 py-4">Roles & Scopes</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={3} className="py-16 text-center text-slate-600 text-sm">Analyzing access graph…</td></tr>
                                ) : filteredBindings.length === 0 ? (
                                    <tr><td colSpan={3} className="py-16 text-center text-slate-700 text-xs uppercase tracking-widest font-black">No active role bindings</td></tr>
                                ) : filteredBindings.map(binding => (
                                    <tr key={binding.principal_id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                                                    <Users size={14} className="text-indigo-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-sm font-bold text-slate-200">{binding.principal_id}</span>
                                                    {binding.team_id && <span className="text-[10px] text-slate-600">Team: {binding.team_id}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                {binding.bindings.map(b => (
                                                    <div key={b.binding_id} className="flex items-center gap-3 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 text-[10px] font-bold">
                                                            <Shield size={11} /> {b.role_id}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-slate-600 text-[10px]">
                                                            <ExternalLink size={10} />
                                                            <span className="font-black uppercase tracking-widest">{b.scope.scope_type}</span>
                                                            {Object.keys(b.scope.attributes).length > 0 && (
                                                                <span className="font-mono opacity-60">({JSON.stringify(b.scope.attributes)})</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <button
                                                onClick={() => handleDeleteBinding(binding.principal_id)}
                                                aria-label={`Revoke bindings for ${binding.principal_id}`}
                                                className="p-1.5 text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassPanel>
            )}

            {/* Role Create Modal */}
            {showRoleModal && (
                <AdminModal
                    title="Create Authority Definition"
                    description="Define a new role with a specific set of granular permissions."
                    onClose={() => { setShowRoleModal(false); setNewRoleId(""); setNewRoleName(""); setNewRolePerms(""); }}
                    onConfirm={handleCreateRole}
                    confirmLabel={savingRole ? "Creating…" : "Create Role"}
                    confirmDisabled={!newRoleId.trim() || !newRoleName.trim() || savingRole}
                >
                    <div className="space-y-3">
                        <div>
                            <label className={labelClass}>Role ID</label>
                            <input id="new-role-id" autoFocus placeholder="e.g. role-analyst" value={newRoleId} onChange={e => setNewRoleId(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Display Name</label>
                            <input id="new-role-name" placeholder="e.g. Data Analyst" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Permissions (one per line)</label>
                            <textarea
                                id="new-role-perms"
                                placeholder={"llm:read\naudit:read\nmcp:list"}
                                value={newRolePerms}
                                onChange={e => setNewRolePerms(e.target.value)}
                                rows={4}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </div>
                </AdminModal>
            )}

            {/* Binding Create Modal */}
            {showBindingModal && (
                <AdminModal
                    title="Grant Access Authority"
                    description="Bind an entity (User or Service) to a platform role."
                    onClose={() => { setShowBindingModal(false); setNewPrincipal(""); setNewBindingRoleId(""); setNewScopeType("global"); }}
                    onConfirm={handleCreateBinding}
                    confirmLabel={savingBinding ? "Granting…" : "Grant Access"}
                    confirmDisabled={!newPrincipal.trim() || !newBindingRoleId || savingBinding}
                >
                    <div className="space-y-3">
                        <div>
                            <label className={labelClass}>Principal ID</label>
                            <input id="new-binding-principal" autoFocus placeholder="e.g. user:alice or svc:ci-agent" value={newPrincipal} onChange={e => setNewPrincipal(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Role</label>
                            <select id="new-binding-role" value={newBindingRoleId} onChange={e => setNewBindingRoleId(e.target.value)} className={`${inputClass} cursor-pointer`}>
                                <option value="">Select a role…</option>
                                {roles.map(r => (
                                    <option key={r.role_id} value={r.role_id}>{r.name} ({r.role_id})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Scope Type</label>
                            <select id="new-binding-scope" value={newScopeType} onChange={e => setNewScopeType(e.target.value)} className={`${inputClass} cursor-pointer`}>
                                <option value="global">global</option>
                                <option value="team">team</option>
                                <option value="tenant">tenant</option>
                            </select>
                        </div>
                    </div>
                </AdminModal>
            )}
        </div>
    );
}
