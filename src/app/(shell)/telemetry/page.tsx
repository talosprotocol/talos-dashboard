"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useDataSource } from "@/lib/hooks/useDataSource";
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, BarChart, Bar 
} from "recharts";
import { Activity, Zap, Clock, Shield, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useMemo } from "react";

export default function TelemetryPage() {
    const { stats, loading } = useDataSource("LIVE");

    const chartData = useMemo(() => {
        if (!stats?.request_volume_series) return [];
        return stats.request_volume_series.map(d => ({
            ...d,
            timestamp: new Date(d.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            total: d.ok + d.deny + d.error,
        }));
    }, [stats]);

    if (loading || !stats) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-white/5 rounded" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <GlassPanel key={i} className="h-32 bg-white/5" />)}
                </div>
                <GlassPanel className="h-96 bg-white/5" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">System Telemetry</h1>
                <p className="text-sm text-slate-400">High-resolution performance and throughput analytics.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    label="Requests (24h)" 
                    value={stats.requests_24h.toLocaleString()} 
                    icon={<Activity className="text-indigo-400" />} 
                    trend="+5.2%"
                />
                <MetricCard 
                    label="Tokens Processed" 
                    value={stats.tokens_24h?.toLocaleString() || "0"} 
                    icon={<Zap className="text-amber-400" />} 
                    trend="+12.1%"
                />
                <MetricCard 
                    label="Avg. Latency" 
                    value={`${stats.latency_avg?.toFixed(0) || 0}ms`} 
                    icon={<Clock className="text-sky-400" />} 
                    trend="-2ms"
                    reverseTrend
                />
                <MetricCard 
                    label="Success Rate" 
                    value={`${(stats.auth_success_rate * 100).toFixed(2)}%`} 
                    icon={<Shield className="text-emerald-400" />} 
                    trend="99.9%"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Throughput Chart */}
                <GlassPanel className="p-6 h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Traffic Throughput</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">OK</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Denied</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorOk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorDeny" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="timestamp" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 10}}
                                    minTickGap={30}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#64748b', fontSize: 10}}
                                />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px'}}
                                    itemStyle={{fontSize: '12px'}}
                                />
                                <Area type="monotone" dataKey="ok" stroke="#6366f1" fillOpacity={1} fill="url(#colorOk)" strokeWidth={2} />
                                <Area type="monotone" dataKey="deny" stroke="#f43f5e" fillOpacity={1} fill="url(#colorDeny)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassPanel>

                {/* Latency Percentiles */}
                <GlassPanel className="p-6 h-[400px] flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Latency Distribution</h3>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <LatencyMetric label="p50" value={stats.latency_percentiles?.p50 || 0} sub="Median" color="text-indigo-400" />
                            <LatencyMetric label="p95" value={stats.latency_percentiles?.p95 || 0} sub="High" color="text-amber-400" />
                            <LatencyMetric label="p99" value={stats.latency_percentiles?.p99 || 0} sub="Peak" color="text-rose-400" />
                        </div>
                        
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'p50', value: stats.latency_percentiles?.p50 || 0, fill: '#6366f1' },
                                    { name: 'p95', value: stats.latency_percentiles?.p95 || 0, fill: '#f59e0b' },
                                    { name: 'p99', value: stats.latency_percentiles?.p99 || 0, fill: '#f43f5e' },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                                    <Tooltip 
                                        cursor={{fill: '#ffffff05'}}
                                        contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '8px'}}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </GlassPanel>
            </div>

            {/* Token Usage & Cost Overview */}
            <GlassPanel className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Economic Efficiency</h3>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-widest">Resource consumption vs. allocation</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white tracking-tighter">${stats.cost_24h?.toFixed(4) || "0.00"}</div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Estimated 24h Cost</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <EfficiencyMetric 
                        label="Token Ingress" 
                        value={stats.tokens_24h ? (stats.tokens_24h * 0.4).toFixed(0) : "0"} 
                        unit="prompt"
                        percentage={40}
                    />
                    <EfficiencyMetric 
                        label="Token Egress" 
                        value={stats.tokens_24h ? (stats.tokens_24h * 0.6).toFixed(0) : "0"} 
                        unit="completion"
                        percentage={60}
                    />
                    <EfficiencyMetric 
                        label="Cache Hit Rate" 
                        value="84.2" 
                        unit="percent"
                        percentage={84.2}
                        color="bg-emerald-500"
                    />
                </div>
            </GlassPanel>
        </div>
    );
}

function MetricCard({ label, value, icon, trend, reverseTrend }: { 
    label: string, value: string, icon: React.ReactNode, trend: string, reverseTrend?: boolean 
}) {
    const isPositive = trend.startsWith('+');
    const isGood = reverseTrend ? !isPositive : isPositive;

    return (
        <GlassPanel className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">{label}</span>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
            <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest mt-2 ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {trend}
            </div>
        </GlassPanel>
    );
}

function LatencyMetric({ label, value, sub, color }: { label: string, value: number, sub: string, color: string }) {
    return (
        <div className="text-center">
            <div className={`text-2xl font-black ${color} tracking-tighter mb-0.5`}>{value}ms</div>
            <div className="text-[10px] font-black text-white uppercase tracking-widest">{label}</div>
            <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{sub}</div>
        </div>
    );
}

function EfficiencyMetric({ label, value, unit, percentage, color = "bg-indigo-500" }: { 
    label: string, value: string, unit: string, percentage: number, color?: string 
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">{value}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{unit}</span>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-500">{percentage}%</div>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    );
}
