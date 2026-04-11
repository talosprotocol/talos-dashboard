"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Shield, Database, Terminal, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setResolved] = useState(false);

    useEffect(() => { setResolved(true); }, []);

    if (!mounted) return null;

    return (
        <div className="space-y-8 pb-12 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Dashboard Settings</h1>
                <p className="text-sm text-slate-400">Configure your local workspace and monitoring preferences.</p>
            </div>

            <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-1">Appearance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ThemeCard 
                        active={theme === 'dark'} 
                        onClick={() => setTheme('dark')}
                        label="Dark"
                        description="High contrast, reduced eye strain."
                        icon={<Moon size={20} />}
                    />
                    <ThemeCard 
                        active={theme === 'light'} 
                        onClick={() => setTheme('light')}
                        label="Light"
                        description="Clear visibility in bright environments."
                        icon={<Sun size={20} />}
                    />
                    <ThemeCard 
                        active={theme === 'system'} 
                        onClick={() => setTheme('system')}
                        label="System"
                        description="Follow your operating system preference."
                        icon={<Monitor size={20} />}
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-1">Data Engine</h3>
                <GlassPanel className="divide-y divide-white/5">
                    <SettingRow 
                        icon={<Database size={18} className="text-indigo-400" />}
                        label="Stream Mode"
                        description="Use Server-Sent Events (SSE) for real-time updates."
                        action={<Toggle active={true} />}
                    />
                    <SettingRow 
                        icon={<RefreshCw size={18} className="text-emerald-400" />}
                        label="Auto-Refresh"
                        description="Automatically refresh background stats every 60 seconds."
                        action={<Toggle active={true} />}
                    />
                    <SettingRow 
                        icon={<Terminal size={18} className="text-amber-400" />}
                        label="Debug Overlay"
                        description="Show raw JSON payloads and API latency in the console."
                        action={<Toggle active={false} />}
                    />
                </GlassPanel>
            </section>

            <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 px-1">Security & Sessions</h3>
                <GlassPanel className="p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-1">Active Administrative Session</h4>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                                    Your current session is authenticated via WebAuthn. 
                                    Sessions expire after 24 hours of inactivity or if your local hardware key is removed.
                                </p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
                            Terminate Session
                        </button>
                    </div>
                </GlassPanel>
            </section>
        </div>
    );
}

function ThemeCard({ active, onClick, label, description, icon }: { 
    active: boolean, onClick: () => void, label: string, description: string, icon: React.ReactNode 
}) {
    return (
        <button 
            onClick={onClick}
            className={`text-left p-5 rounded-2xl border transition-all duration-300 group ${
                active 
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
            }`}
        >
            <div className={`p-2 rounded-lg w-fit mb-4 transition-colors ${
                active ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 group-hover:text-slate-200'
            }`}>
                {icon}
            </div>
            <h4 className={`text-sm font-bold mb-1 ${active ? 'text-white' : 'text-slate-300'}`}>{label}</h4>
            <p className="text-[10px] text-slate-500 leading-normal">{description}</p>
        </button>
    );
}

function SettingRow({ icon, label, description, action }: { 
    icon: React.ReactNode, label: string, description: string, action: React.ReactNode 
}) {
    return (
        <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-200">{label}</h4>
                    <p className="text-xs text-slate-500">{description}</p>
                </div>
            </div>
            {action}
        </div>
    );
}

function Toggle({ active }: { active: boolean }) {
    return (
        <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${active ? 'bg-indigo-500' : 'bg-slate-700'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${active ? 'left-6' : 'left-1'}`} />
        </div>
    );
}
