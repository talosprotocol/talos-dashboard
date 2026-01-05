"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Secure AI Agent Chat - Interactive Demo
 * 
 * Demonstrates Talos security features:
 * - End-to-end encryption
 * - Blockchain audit trail
 * - ACL-based MCP tool security
 */

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface ChatSummary {
    user_id: string;
    assistant_id: string;
    blockchain_height: number;
    pending_data: number;
    conversations: number;
    messages: number;
    tool_calls: number;
    ollama_available: boolean;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<ChatSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await fetch("/api/examples/chat/summary");
            if (res.ok) {
                const data = await res.json();
                setSummary(data);
            }
        } catch {
            // Ignore summary fetch errors
        }
    }, []);

    useEffect(() => {
        queueMicrotask(fetchSummary);
    }, [fetchSummary]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: input.trim(),
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/examples/chat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: userMessage.content }),
            });

            const data = await res.json();

            if (!res.ok || data.code) {
                setError(data.code || "TALOS_UNAVAILABLE");
                return;
            }

            const assistantMessage: Message = {
                id: data.message_id || `asst-${Date.now()}`,
                role: "assistant",
                content: data.response,
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
            fetchSummary();
        } catch {
            setError("TALOS_UNAVAILABLE");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <GlassPanel className="flex-1 flex flex-col p-4 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                        {messages.length === 0 && (
                            <div className="text-center text-[var(--text-muted)] py-8">
                                <p className="text-lg mb-2">🔐 Secure AI Chat</p>
                                <p className="text-sm">Messages are encrypted with X25519 + ChaCha20-Poly1305</p>
                                <p className="text-sm">All interactions logged to blockchain</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-2 rounded-xl ${msg.role === "user"
                                            ? "bg-[var(--accent)] text-white"
                                            : "bg-[var(--panel)] border border-[var(--glass-border)]"
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-[var(--panel)] border border-[var(--glass-border)] px-4 py-2 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <span className="animate-pulse">●</span>
                                        <span className="text-sm text-[var(--text-muted)]">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                            Error: {error}
                        </div>
                    )}

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-[var(--panel)] border border-[var(--glass-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </GlassPanel>
            </div>

            {/* Security Panel */}
            <div className="w-full lg:w-80">
                <GlassPanel className="p-4">
                    <h3 className="font-bold mb-4">🔒 Security Status</h3>
                    {summary ? (
                        <div className="space-y-3 text-sm">
                            <SecurityRow label="Ollama" value={summary.ollama_available ? "🟢 Online" : "🔴 Offline"} />
                            <SecurityRow label="Blockchain Height" value={summary.blockchain_height.toString()} />
                            <SecurityRow label="Messages" value={summary.messages.toString()} />
                            <SecurityRow label="Tool Calls" value={summary.tool_calls.toString()} />
                            <SecurityRow label="User ID" value={summary.user_id} mono />
                            <SecurityRow label="Assistant ID" value={summary.assistant_id} mono />
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--text-muted)]">Loading security status...</p>
                    )}
                </GlassPanel>

                <div className="mt-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
                    <strong>Features:</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                        <li>✅ E2E Encryption (X25519 + ChaCha20)</li>
                        <li>✅ Digital Signatures (Ed25519)</li>
                        <li>✅ Blockchain Audit Trail</li>
                        <li>✅ ACL-based MCP Security</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function SecurityRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">{label}</span>
            <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
        </div>
    );
}
