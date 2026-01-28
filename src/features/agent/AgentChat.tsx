"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Cpu, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

interface AgentChatProps {
    onApplyCode: (code: string) => Promise<void>;
    isApplying: boolean;
}

// MOCK_RESPONSE removed - using real agent API

export function AgentChat({ onApplyCode, isApplying }: AgentChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('talos_agent_history');
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load history", e);
            }
        } else {
            const SYSTEM_PROMPT = `You are the Talos Security Agent.
Your goal is to generate secure configuration YAMLs that strictly follow the Talos Configuration Schema.

RULES:
1. Always use 'config_version: "1.0"'.
2. Use 'global.env' for environment (dev, prod).
3. 'audit' and 'gateway' are root keys. 
4. Extensions like 'auth' go under 'extensions'.
5. Do not use 'features' key.
6. Use 'database_url_ref' for secrets.

Example Valid Config:
\`\`\`yaml
config_version: "1.0"
global:
  env: "prod"
audit:
  storage_backend: "postgres"
extensions:
  auth: { enabled: true }
\`\`\`
`;

            setMessages([
                {
                    id: 'system-prompt',
                    role: 'system',
                    content: SYSTEM_PROMPT,
                    timestamp: Date.now()
                },
                {
                id: 'welcome',
                role: 'assistant',
                content: 'Hello! I am the Talos Security Agent. I can help you generate secure configurations. Try asking for a "High Assurance Production Config".',
                timestamp: Date.now() + 1
            }]);
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('talos_agent_history', JSON.stringify(messages));
        }
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);


    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
                    model: 'llama3' 
                })
            });

            if (!response.ok) {
                // Production Grade: Show actual error, don't fallback to mock
                throw new Error("Agent error: " + response.statusText);
            }

            if (!response.body) throw new Error("No body");

            // Streaming Logic
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            
            // Create placeholder for stream
            setMessages(prev => [...prev, {
                id: 'streaming-' + Date.now(),
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.includes('[DONE]')) continue;
                    try {
                        // Ollama returns { model:..., created_at:..., response: "token", done: false }
                        // OR if using OpenAI compat: { choices: [{ delta: { content: "token" } }] }
                        // My proxy setup uses /v1/chat/completions so it follows OpenAI format usually,
                        // BUT Ollama raw is different.
                        // Wait, I am proxying to /v1/chat/completions in route.ts.
                        // So I expect OpenAI format: data: JSON
                        
                        const jsonStr = line.replace(/^data: /, '');
                        if (!jsonStr) continue;
                        
                        const json = JSON.parse(jsonStr);
                        const token = json.choices?.[0]?.delta?.content || '';
                        
                        if (token) {
                            assistantMessage += token;
                            setMessages(prev => {
                                const newArr = [...prev];
                                const last = newArr[newArr.length - 1];
                                last.content = assistantMessage;
                                return newArr; 
                            });
                        }
                    } catch {
                        // ignore parse errors for partial chunks
                    }
                }
            }
             setIsTyping(false);

        } catch (e: any) {
            console.error(e);
            setIsTyping(false);
             setMessages(prev => [...prev, {
                id: 'error-' + Date.now(),
                role: 'system',
                content: e.message || 'Error: Could not connect to Agent.',
                timestamp: Date.now()
            }]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/50 rounded-xl overflow-hidden border border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Bot className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Talos Security Agent</h3>
                        <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                        </p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                        setMessages([]);
                        localStorage.removeItem('talos_agent_history');
                    }}
                    className="text-slate-500 hover:text-rose-400"
                    title="Clear History"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                            msg.role === 'user' ? "bg-slate-800 border-white/10" : "bg-indigo-600/20 border-indigo-500/30"
                        )}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div className={cn(
                            "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg",
                            msg.role === 'user' ? "bg-slate-800 text-slate-200 rounded-tr-none" : "bg-indigo-950/30 text-indigo-100 border border-indigo-500/10 rounded-tl-none"
                        )}>
                            <ReactMarkdown
                                components={{
                                    code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const codeString = String(children).replace(/\n$/, '');
                                        const isYaml = match && match[1] === 'yaml';

                                        return !inline && match ? (
                                            <div className="relative mt-4 mb-2 group rounded-lg overflow-hidden border border-white/10">
                                                <div className="bg-slate-950 px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 border-b border-white/5 flex justify-between items-center">
                                                    <span>{match[1]}</span>
                                                    {isYaml && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            disabled={isApplying}
                                                            onClick={() => onApplyCode(codeString)}
                                                            className="h-5 text-[9px] hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 uppercase font-black tracking-wider transition-colors"
                                                        >
                                                            {isApplying ? <span className="animate-spin mr-1">○</span> : <CheckCircle className="w-3 h-3 mr-1" />}
                                                            Apply to Editor
                                                        </Button>
                                                    )}
                                                </div>
                                                <SyntaxHighlighter
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    style={vscDarkPlus as any}
                                                    language={match[1]}
                                                    PreTag="div"
                                                    customStyle={{ margin: 0, borderRadius: 0, fontSize: '11px' }}
                                                    {...props}
                                                >
                                                    {codeString}
                                                </SyntaxHighlighter>
                                            </div>
                                        ) : (
                                            <code className={cn("bg-black/30 px-1 py-0.5 rounded font-mono text-[11px] text-orange-300", className)} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }
                                }}
                            >
                                {msg.content}
                            </ReactMarkdown>
                            <p className="text-[9px] text-white/20 mt-2 text-right font-mono">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex items-center gap-1 h-8 px-3 rounded-full bg-indigo-950/30 border border-indigo-500/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/50 border-t border-white/5">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Describe the configuration requirements..."
                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 shadow-inner"
                    />
                    <Button 
                        size="icon" 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-1.5 top-1.5 h-9 w-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-md shadow-indigo-600/20"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="mt-2 flex justify-center gap-4 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                     <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Talos LLM v1</span>
                     <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> Secure Output</span>
                </div>
            </div>
        </div>
    );
}
