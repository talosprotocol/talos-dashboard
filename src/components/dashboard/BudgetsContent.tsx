"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { dataSource, BudgetScope, VirtualKey, Team } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { 
    Wallet, 
    Key, 
    Users, 
    Search, 
    RefreshCw, 
    TrendingUp, 
    ShieldCheck, 
    AlertCircle,
    Activity
} from "lucide-react";

export default function BudgetsContent() {
    const [scopes, setScopes] = useState<BudgetScope[]>([]);
    const [keys, setKeys] = useState<VirtualKey[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"scopes" | "keys" | "teams">("scopes");
    const [search, setSearch] = useState("");
    const { toast } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [scopesData, keysData, teamsData] = await Promise.all([
                dataSource.listBudgetScopes(),
                dataSource.listVirtualKeys(),
                dataSource.listTeams()
            ]);
            setScopes(scopesData);
            setKeys(keysData);
            setTeams(teamsData);
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "Failed to load budget data";
            toast({ title: "Sync Failure", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const filteredScopes = useMemo(() => 
        scopes.filter(s => 
            s.scope_id.toLowerCase().includes(search.toLowerCase()) ||
            s.scope_type.toLowerCase().includes(search.toLowerCase())
        ), [scopes, search]);

    const filteredKeys = useMemo(() => 
        keys.filter(k => 
            k.id.toLowerCase().includes(search.toLowerCase()) ||
            k.team_id.toLowerCase().includes(search.toLowerCase())
        ), [keys, search]);

    const filteredTeams = useMemo(() => 
        teams.filter(t => 
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.id.toLowerCase().includes(search.toLowerCase())
        ), [teams, search]);

    const totalBudget = useMemo(() => 
        scopes.filter(s => s.scope_type === "global").reduce((acc, s) => acc + parseFloat(s.limit_usd), 0),
    [scopes]);

    const totalUsed = useMemo(() => 
        scopes.filter(s => s.scope_type === "global").reduce((acc, s) => acc + parseFloat(s.used_usd), 0),
    [scopes]);

    const usagePercent = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <Wallet className="text-indigo-400" size={22} />
                        Budget & Key Mission Control
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Monitor live usage, manage virtual key limits, and enforce team-level governance.
                    </p>
                </div>
                <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                    {(["scopes", "keys", "teams"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "text-slate-500 hover:text-slate-200"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassPanel className="p-4 border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <TrendingUp size={16} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">Live</span>
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-500">Global Burn Rate</div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-mono font-bold text-white">${totalUsed.toFixed(4)}</div>
                        <div className="text-[10px] text-slate-600">/ ${totalBudget.toFixed(2)}</div>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${
                                usagePercent > 90 ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${Math.min(100, usagePercent)}%` }}
                        />
                    </div>
                </GlassPanel>

                <GlassPanel className="p-4 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Key size={16} />
                        </div>
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-500">Active Virtual Keys</div>
                    <div className="text-2xl font-mono font-bold text-white">{keys.filter(k => !k.revoked).length}</div>
                    <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">
                        {keys.filter(k => k.revoked).length} Keys Revoked
                    </div>
                </GlassPanel>

                <GlassPanel className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-500">Enforcement Groups</div>
                    <div className="text-2xl font-mono font-bold text-white">{teams.length}</div>
                    <div className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">
                        Cross-team policies active
                    </div>
                </GlassPanel>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex-1 max-w-xs">
                    <Search size={14} className="text-slate-500 shrink-0" />
                    <input
                        placeholder={`Search ${activeTab}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm flex-1 outline-none text-slate-200 placeholder:text-slate-600"
                    />
                </div>
                <button
                    onClick={load}
                    className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                    title="Refresh Data"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Main Content Area */}
            <GlassPanel className="p-0 overflow-hidden min-h-[400px]">
                {activeTab === "scopes" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5">
                                    <th className="px-6 py-4">Scope / ID</th>
                                    <th className="px-6 py-4">Limit (USD)</th>
                                    <th className="px-6 py-4">Used</th>
                                    <th className="px-6 py-4">Reserved</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-slate-600 text-xs uppercase tracking-widest font-black">Connecting to budget stream...</td></tr>
                                ) : filteredScopes.length === 0 ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-slate-700 text-xs uppercase tracking-widest font-black">No budget scopes found</td></tr>
                                ) : filteredScopes.map(s => {
                                    const limit = parseFloat(s.limit_usd);
                                    const used = parseFloat(s.used_usd);
                                    const reserved = parseFloat(s.reserved_usd);
                                    const total = used + reserved;
                                    const over = limit > 0 && total >= limit;
                                    const warning = limit > 0 && total >= limit * 0.8 && !over;

                                    return (
                                        <tr key={`${s.scope_type}-${s.scope_id}`} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400/70">{s.scope_type}</span>
                                                    <span className="font-mono text-sm font-bold text-slate-200">{s.scope_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                                ${limit.toFixed(4)}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                                ${used.toFixed(4)}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-500 italic">
                                                ${reserved.toFixed(4)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                    over ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                                    warning ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                }`}>
                                                    {over ? "Exceeded" : warning ? "Warning" : "Active"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "keys" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5">
                                    <th className="px-6 py-4">Key ID</th>
                                    <th className="px-6 py-4">Team</th>
                                    <th className="px-6 py-4">Mode</th>
                                    <th className="px-6 py-4">Limit (USD)</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-slate-600 text-xs uppercase tracking-widest font-black">Loading virtual keys...</td></tr>
                                ) : filteredKeys.length === 0 ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-slate-700 text-xs uppercase tracking-widest font-black">No virtual keys detected</td></tr>
                                ) : filteredKeys.map(k => (
                                    <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm font-bold text-slate-200">
                                            {k.id}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400">
                                            {k.team_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                k.budget_mode === "hard" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            }`}>
                                                {k.budget_mode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                            ${parseFloat(k.budget.limit_usd).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {k.revoked ? (
                                                <span className="flex items-center gap-1.5 text-rose-400 text-[10px] font-black uppercase tracking-widest">
                                                    <AlertCircle size={12} /> Revoked
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                                    <ShieldCheck size={12} /> Healthy
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "teams" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-600 border-b border-white/5">
                                    <th className="px-6 py-4">Team Name / ID</th>
                                    <th className="px-6 py-4">Policy Mode</th>
                                    <th className="px-6 py-4">Aggregated Limit</th>
                                    <th className="px-6 py-4">Overdraft</th>
                                    <th className="px-6 py-4 text-right">Integrity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-slate-600 text-xs uppercase tracking-widest font-black">Syncing team hierarchies...</td></tr>
                                ) : filteredTeams.length === 0 ? (
                                    <tr><td colSpan={5} className="py-16 text-center text-slate-700 text-xs uppercase tracking-widest font-black">No enforcement teams found</td></tr>
                                ) : filteredTeams.map(t => (
                                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-200">{t.name}</span>
                                                <span className="text-[10px] font-mono text-slate-600">{t.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400">
                                                {t.budget_mode} ENFORCEMENT
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-300">
                                            ${parseFloat(t.budget.limit_usd).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-rose-400">
                                            ${parseFloat(t.overdraft_usd).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Activity size={14} className="text-slate-700 ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassPanel>
        </div>
    );
}
