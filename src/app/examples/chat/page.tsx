"use client";

import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
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
  const [sessionId] = useState(
    () => `sess_${Math.random().toString(36).substring(2, 10)}`,
  );
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
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const gatewayUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      const payload = {
        session_id: sessionId,
        model: "llama3.2:latest",
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: 512,
        client_request_id: `req_${Date.now()}`,
      };

      const response = await fetch(`${gatewayUrl}/mcp/tools/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || errData.error || "Gateway Error");
      }

      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        const botMsg = data.messages[0];
        setMessages((prev) => [
          ...prev,
          {
            role: botMsg.role,
            content: botMsg.content,
            correlation_id: payload.client_request_id,
            audited: true,
          },
        ]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${errorMessage}`,
          audited: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] p-8 font-sans text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Secure AI Chat"
          subtitle={`Session: ${sessionId}`}
          actions={
            <div className="flex items-center gap-4">
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded border border-emerald-500/20 tracking-wider">
                AUDITED
              </span>
              <Link
                href="/examples"
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Back to Catalog
              </Link>
            </div>
          }
        />

        {/* Chat Panel */}
        <GlassPanel className="h-[600px] flex flex-col relative overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                <p>Start a secure conversation...</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isSystem = msg.role === "system";

              let bubbleStyles =
                "bg-[var(--panel-hover)] text-[var(--text-primary)] rounded-tl-none border border-[var(--panel-border)] shadow-sm";
              if (isUser) {
                bubbleStyles =
                  "bg-[var(--accent)] text-white rounded-tr-none shadow-md shadow-[var(--accent-glow)]";
              } else if (isSystem) {
                bubbleStyles =
                  "bg-red-500/10 text-red-500 border border-red-500/20";
              }

              return (
                <div
                  key={`${msg.role}-${i}-${msg.correlation_id || ""}`}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${bubbleStyles}`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Meta */}
                    {msg.audited && (
                      <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-70 border-t border-[var(--panel-border)]/50 pt-2">
                        <span className="font-mono text-[var(--text-muted)]">
                          {msg.correlation_id?.slice(-8)}
                        </span>
                        <span className="text-emerald-500 font-semibold">
                          ✓ Audited
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--panel-hover)] rounded-2xl px-4 py-3 rounded-tl-none border border-[var(--panel-border)]">
                  <div className="flex gap-1.5 px-1">
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-duration:1s]" />
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[var(--panel-border)] bg-[var(--panel)]">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message (audited by Talos)..."
                className="flex-1 bg-[var(--bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--text-muted)] opacity-80 focus:opacity-100"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-[var(--text-primary)] text-[var(--bg)] px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
              >
                Send
              </button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
