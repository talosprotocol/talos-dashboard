"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// Types
interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    correlation_id?: string;
    audited?: boolean;
}

export default function ChatPage() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 10)}`);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

            const payload = {
                session_id: sessionId,
                model: "llama3.2:latest",
                messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
                max_tokens: 512,
                client_request_id: `req_${Date.now()}`
            };

            const response = await fetch(`${gatewayUrl}/mcp/tools/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || errData.error || "Gateway Error");
            }

            const data = await response.json();
            // Expected response from connector: { messages: [response_message], ... }
            if (data.messages && data.messages.length > 0) {
                const botMsg = data.messages[0];
                setMessages(prev => [...prev, {
                    role: botMsg.role,
                    content: botMsg.content,
                    correlation_id: payload.client_request_id,
                    audited: true
                }]);
            } else {
                throw new Error("Invalid response format");
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setMessages(prev => [...prev, {
                role: "system",
                content: `Error: ${errorMessage}`,
                audited: false
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-8 font-sans text-slate-50">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Secure AI Chat <span className="text-slate-500 font-normal text-lg">(Example)</span></h1>
                        <p className="text-slate-400 text-sm">
                            Session: <span className="font-mono text-xs bg-slate-800 px-1 rounded">{sessionId}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded border border-emerald-500/20">
                            AUDITED
                        </span>
                        <Link href="/" className="text-sm text-slate-200 hover:text-white hover:underline">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Chat Panel */}
                <GlassPanel className="h-[600px] flex flex-col relative overflow-hidden bg-slate-900/60 border-slate-800">

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                <p>Start a secure conversation...</p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-tr-none"
                                    : msg.role === "system"
                                        ? "bg-red-900/20 text-red-400 border border-red-900/50"
                                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                                    }`}>
                                    <p>{msg.content}</p>

                                    {/* Meta */}
                                    {msg.audited && (
                                        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-70">
                                            <span className="font-mono text-slate-400">{msg.correlation_id?.slice(-8)}</span>
                                            <span className="text-emerald-500">✓ Audited</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-2xl px-4 py-3 rounded-tl-none border border-slate-700">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Type a message (audited by Talos)..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>

                </GlassPanel>
            </div>
        </div>
    );
}
