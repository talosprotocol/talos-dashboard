"use client";

import { useState, useRef, useEffect } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Send, StopCircle, Terminal, Shield, Lock } from "lucide-react";

type Message = {
    role: "user" | "assistant" | "system";
    content: string;
    toolParams?: Record<string, unknown>; // For tool calls
};

type Capability = string;

type Tool = {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
};

export default function AgentPage() {
    // State
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capabilities, setCapabilities] = useState<Capability[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [conversationId, setConversationId] = useState("demo-session-v1");
    
    // Refs for streaming
    const abortControllerRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load & Session
    useEffect(() => {
        // Restore or Create Conversation based on principle
        const principalId = "user_principal_01"; 
        const storageKey = `talos_conversation_${principalId}`;
        
        const existing = sessionStorage.getItem(storageKey);
        if (existing) {
             setConversationId(existing);
        } else {
             const newId = crypto.randomUUID();
             sessionStorage.setItem(storageKey, newId);
             setConversationId(newId);
        }

        // Fetch tools (mock capability discovery)
        fetch("/api/agent/tools")
            .then(res => res.json())
            .then((data: { tools: Tool[] }) => setTools(data.tools || []))
            .catch(console.error);
            
        // Initial caps
        setCapabilities(["chat", "tool:read_file"]);
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isStreaming) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsStreaming(true);

        // Abort Controller
        const ac = new AbortController();
        abortControllerRef.current = ac;

        try {
            // Optimistic assistant message
            setMessages(prev => [...prev, { role: "assistant", content: "" }]);

            const response = await fetch("/api/agent/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3", // Default for now
                    messages: [...messages, userMsg],
                    session_id: conversationId,
                    client_requested_caps: capabilities
                }),
                signal: ac.signal
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Failed to send message");
            }

            if (!response.body) throw new Error("No response body");

            // SSE Parsing via ReadableStream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || ""; // Keep incomplete chunk

                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        // Simple parse logic
                        const eventType = line.split("\n")[0].replace("event: ", "").trim();
                        const dataLine = line.split("\n")[1];
                        if (!dataLine?.startsWith("data: ")) continue;
                        
                        const dataStr = dataLine.replace("data: ", "").trim();
                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);
                            handleSSEEvent(eventType, data);
                        } catch (e) {
                            console.error("SSE Parse Error", e);
                        }
                    }
                }
            }

        } catch (error) {
            const err = error as Error;
            if (err.name !== "AbortError") {
                setMessages(prev => [...prev, { role: "system", content: `Error: ${err.message}` }]);
            }
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const handleSSEEvent = (type: string, data: { content?: string }) => {
        if (type === "token" && data.content) {
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, content: last.content + data.content }];
                }
                return prev;
            });
        }
    };

    const handleAbort = () => {
        abortControllerRef.current?.abort();
        setIsStreaming(false);
    };

    return (
        <div className="flex h-screen flex-col bg-[#0A0A0A] text-white">
            <PageHeader title="Talos Secure Agent" subtitle="BETA" />
            
            <main className="flex flex-1 gap-4 p-4 overflow-hidden">
                {/* Chat Panel */}
                <GlassPanel className="flex flex-col flex-1 relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <Shield className="w-12 h-12 mb-4 opacity-20" />
                                <p>Secure Agent Environment</p>
                                <p className="text-sm">Requests are audited and redacted.</p>
                            </div>
                        )}
                        
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-lg p-3 ${
                                    msg.role === 'user' 
                                        ? 'bg-blue-600/20 border border-blue-500/30' 
                                        : msg.role === 'system'
                                        ? 'bg-red-900/20 border border-red-500/30 text-red-200'
                                        : 'bg-zinc-800/50 border border-zinc-700/50'
                                }`}>
                                    <div className="text-xs mb-1 opacity-50 uppercase font-mono">{msg.role}</div>
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                                placeholder="Message the secure agent..."
                                disabled={isStreaming}
                                className="flex-1 bg-zinc-900/50 border border-zinc-700 rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {isStreaming ? (
                                <button onClick={handleAbort} className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-md transition-colors">
                                    <StopCircle className="w-5 h-5 text-red-400" />
                                </button>
                            ) : (
                                <button onClick={handleSend} disabled={!input.trim()} className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-md transition-colors disabled:opacity-50">
                                    <Send className="w-5 h-5 text-blue-400" />
                                </button>
                            )}
                        </div>
                    </div>
                </GlassPanel>

                {/* Sidebar: Capabilities & Tools */}
                <div className="w-80 flex flex-col gap-4">
                    {/* Capabilities */}
                    <GlassPanel className="h-1/3 p-4">
                        <div className="flex items-center gap-2 mb-4 text-zinc-400">
                            <Shield className="w-4 h-4" />
                            <h3 className="font-semibold text-sm">Capabilities</h3>
                        </div>
                        <div className="space-y-2">
                            {capabilities.map(cap => (
                                <div key={cap} className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                                    <Lock className="w-3 h-3" />
                                    {cap}
                                </div>
                            ))}
                        </div>
                    </GlassPanel>

                    {/* Available Tools */}
                    <GlassPanel className="flex-1 p-4 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-zinc-400 shrink-0">
                            <Terminal className="w-4 h-4" />
                            <h3 className="font-semibold text-sm">Available Tools</h3>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2">
                            {tools.map((tool) => (
                                <div key={tool.name} className="group p-3 bg-zinc-900/40 rounded border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="font-mono text-sm text-blue-300 font-bold">{tool.name}</div>
                                    <div className="text-xs text-zinc-400 mt-1">{tool.description}</div>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>
            </main>
        </div>
    );
}
