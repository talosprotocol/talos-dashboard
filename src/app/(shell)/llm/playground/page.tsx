"use client";

import { useEffect, useState } from "react";
import { dataSource, ModelGroup } from "@/lib/data/DataSource";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Send, Key, Brain, Info, Loader2 } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface ChatResponse {
    model: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    choices: {
        message: {
            role: "user" | "assistant";
            content: string;
        };
        finish_reason: string;
    }[];
}

export default function PlaygroundPage() {
    const [apiKey, setApiKey] = useState("sk-test-key-1");
    const [selectedModel, setSelectedModel] = useState("");
    const [models, setModels] = useState<ModelGroup[]>([]);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<ChatResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await dataSource.listModelGroups();
                setModels(data);
                if (data.length > 0) setSelectedModel(data[0].id);
            } catch (err) {
                console.error("Failed to load models", err);
            }
        }
        load();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || !selectedModel || loading) return;

        const newMessages: Message[] = [...messages, { role: "user", content: input }];
        setMessages(newMessages);
        setInput("");
        setLoading(true);
        setError(null);
        setInsights(null);

        try {
            const data = await dataSource.chatCompletion(apiKey, {
                model: selectedModel,
                messages: newMessages
            });
            
            const result = data as unknown as ChatResponse;

            if (result.choices && result.choices[0]) {
                const assistantMsg = result.choices[0].message;
                setMessages(prev => [...prev, assistantMsg]);
                setInsights(result);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to complete chat");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                        <Key size={12} /> API Key (Service Account)
                    </label>
                    <input 
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--panel)] border border-[var(--glass-border)] rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
                        placeholder="sk-..."
                    />
                </div>
                <div className="w-full md:w-64 space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-1.5">
                        <Brain size={12} /> Model Group
                    </label>
                    <select 
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--panel)] border border-[var(--glass-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                    >
                        {models.map(m => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                {/* Chat Panel */}
                <GlassPanel className="flex-1 flex flex-col p-0 overflow-hidden border-[var(--glass-border)]">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50 space-y-2">
                                <Brain size={48} strokeWidth={1} />
                                <p>Select a model and start a conversation</p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                                    m.role === 'user' 
                                        ? 'bg-[var(--accent)] text-[var(--bg)]' 
                                        : 'bg-[var(--panel-hover)] border border-[var(--glass-border)] text-[var(--text-primary)]'
                                } shadow-sm`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-[var(--panel-hover)] border border-[var(--glass-border)] px-4 py-3 rounded-2xl animate-pulse flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={16} />
                                    <span className="text-sm">Generating...</span>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-xs font-mono">
                                <strong>Error:</strong> {error}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--panel)]/50">
                        <div className="flex gap-2">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="Type your prompt here..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-[var(--accent)] text-[var(--bg)] rounded-lg disabled:opacity-50 hover:opacity-90 transition-all"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </GlassPanel>

                {/* Sidebar: Insights */}
                <div className="w-full lg:w-80 flex flex-col gap-4">
                    <GlassPanel className="p-4 flex flex-col gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                            <Info size={14} /> Routing Insights
                        </h3>
                        
                        {insights ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Model ID</label>
                                    <div className="text-sm font-mono mt-0.5">{insights.model}</div>
                                </div>
                                {insights.usage && (
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Usage</label>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <div className="bg-[var(--panel-hover)] rounded p-2 text-center">
                                                <div className="text-[10px] text-[var(--text-muted)]">Prompt</div>
                                                <div className="font-bold font-mono">{insights.usage.prompt_tokens}</div>
                                            </div>
                                            <div className="bg-[var(--panel-hover)] rounded p-2 text-center">
                                                <div className="text-[10px] text-[var(--text-muted)]">Completion</div>
                                                <div className="font-bold font-mono">{insights.usage.completion_tokens}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="text-[10px] text-[var(--text-muted)] italic">
                                    More detailed routing metadata (Upstream ID, exact Latency) is available in the audit logs.
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-[var(--text-muted)] italic py-10 text-center">
                                Send a message to see routing details
                            </div>
                        )}
                    </GlassPanel>

                    <GlassPanel className="p-4 bg-[var(--accent)]/5 border-[var(--accent)]/20">
                        <h4 className="text-xs font-bold mb-2 text-[var(--accent)]">Pro Tip</h4>
                        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                            All playground interactions are recorded in the <strong>Audit Logs</strong> with your service account identity. 
                            Use this to verify your Model Group fallback and routing policies.
                        </p>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
