"use client";

import { useState, useRef, useEffect } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { 
    Send, 
    Terminal, 
    Shield, 
    Lock, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    Clock, 
    Search, 
    Cpu, 
    ExternalLink, 
    RefreshCw, 
    Layers, 
    Play,
    ChevronDown,
    ChevronRight,
    Key
} from "lucide-react";

export type A2ATaskState = "SUBMITTED" | "WORKING" | "COMPLETED" | "FAILED" | "CANCELED";
export type A2ADriver = "InMemoryTaskRunner" | "TemporalTaskRunner";

export interface A2ATaskPart {
    type: "text" | "audio" | "video";
    text?: string;
    content?: string;
    mime_type?: string;
}

export interface A2ATask {
    id: string;
    context_id: string;
    agent_did: string;
    driver: A2ADriver;
    state: A2ATaskState;
    message: {
        role: "user" | "assistant" | "system";
        parts: A2ATaskPart[];
    };
    reasoning?: string;
    output?: string;
    capability?: {
        issuer: string;
        actions: string[];
        expires_at: string;
    };
    integrity?: {
        leaf_hash: string;
        root_hash: string;
        verified: boolean;
        verified_at?: string;
    };
    created_at: string;
    completed_at?: string;
    latency_ms: number;
}

const SEED_TASKS: A2ATask[] = [
    {
        id: "task_a2a_pi5_0918",
        context_id: "ctx_visa_scout_01",
        agent_did: "did:talos:agent:visa-scout:8f12d4a",
        driver: "InMemoryTaskRunner",
        state: "COMPLETED",
        message: {
            role: "user",
            parts: [{ type: "text", text: "Monitor visa portal slots and emit cryptographically signed availability report." }]
        },
        reasoning: "1. Queried authenticated session on edge node (Pi 5)\n2. Parsed VAC slots across consular districts (Hyderabad, New Delhi)\n3. Clustered 186 community posts into 61 verified release events\n4. Verified Ed25519 payload signature before Merkle tree insertion",
        output: "Identified last bulk release event at 2026-05-05T13:40+05:30. Ingested into local edge audit plane with zero policy violations.",
        capability: {
            issuer: "did:talos:agent:root-orchestrator:001",
            actions: ["scout:read_slots", "audit:write_event"],
            expires_at: "2026-10-22T00:00:00Z"
        },
        integrity: {
            leaf_hash: "0x3a4f89d1b029487c6e0018a2bc49103e91048bcae1",
            root_hash: "0x9c8821a0be37628190dbe381904721903ba810023a",
            verified: true,
            verified_at: "2026-10-21T08:00:15Z"
        },
        created_at: "2026-10-21T07:59:58Z",
        completed_at: "2026-10-21T08:00:02Z",
        latency_ms: 4.2
    },
    {
        id: "task_a2a_fedora_0481",
        context_id: "ctx_cluster_remediation_44",
        agent_did: "did:talos:agent:aiops-remediator:5e229c1",
        driver: "TemporalTaskRunner",
        state: "WORKING",
        message: {
            role: "user",
            parts: [{ type: "text", text: "Coordinate rolling node drain and TLS certificate rotation across edge cluster." }]
        },
        reasoning: "Step 1: Check Temporal workflow wf_drain_098 on fedora:7233\nStep 2: Emit pre-drain heartbeat to Qdrant cluster\nStep 3: Await peer consensus from DidRegistry quorum",
        output: "Durable workflow active: Phase 2/4 in progress. 3 edge nodes drained and verified.",
        capability: {
            issuer: "did:talos:agent:root-orchestrator:001",
            actions: ["cluster:drain", "cert:rotate"],
            expires_at: "2026-10-21T23:59:59Z"
        },
        integrity: {
            leaf_hash: "0x712a9c80145be8a01f7823901bca09481273940182",
            root_hash: "0x9c8821a0be37628190dbe381904721903ba810023a",
            verified: true,
            verified_at: "2026-10-21T08:15:00Z"
        },
        created_at: "2026-10-21T08:14:18Z",
        latency_ms: 42.1
    },
    {
        id: "task_a2a_audit_0019",
        context_id: "ctx_merkle_anchor_12",
        agent_did: "did:talos:agent:audit-accumulator:19a0fc3",
        driver: "InMemoryTaskRunner",
        state: "COMPLETED",
        message: {
            role: "user",
            parts: [{ type: "text", text: "Compute 10,000 leaf domain-separated Merkle root for epoch 2026-10-20." }]
        },
        reasoning: "Accumulated 10,000 audit hashes with 0x00 leaf domain separator.\nComputed pairwise parent hashes with 0x01 node domain separator.\nComputed Root: 0x8dfa2894bfa293c4e091bca7729103e...",
        output: "Epoch 2026-10-20 finalized. Merkle Root attested to local SQLite store and mirrored to fedora audit plane.",
        capability: {
            issuer: "did:talos:agent:root-orchestrator:001",
            actions: ["audit:accumulate", "merkle:anchor"],
            expires_at: "2026-10-22T12:00:00Z"
        },
        integrity: {
            leaf_hash: "0x8dfa2894bfa293c4e091bca7729103e8712390a1bc",
            root_hash: "0x8dfa2894bfa293c4e091bca7729103e8712390a1bc",
            verified: true,
            verified_at: "2026-10-20T23:59:59Z"
        },
        created_at: "2026-10-20T23:59:55Z",
        completed_at: "2026-10-20T23:59:59Z",
        latency_ms: 3.8
    },
    {
        id: "task_a2a_sec_0102",
        context_id: "ctx_unauthorized_probe",
        agent_did: "did:talos:agent:untrusted-probe:0000000",
        driver: "InMemoryTaskRunner",
        state: "FAILED",
        message: {
            role: "user",
            parts: [{ type: "text", text: "Attempt tool invocation on prod-db without capability token delegation." }]
        },
        reasoning: "Policy evaluation failed: Agent presented zero capability delegations.\nAction 'tools:execute' on resource 'prod-db' denied by zero-trust gate.",
        output: "Error: CAPABILITY_DENIED (403). Missing required capability delegation for action 'tools:execute'.",
        capability: undefined,
        integrity: {
            leaf_hash: "0x110098234be8912304918230491823049182304918",
            root_hash: "0x9c8821a0be37628190dbe381904721903ba810023a",
            verified: false,
            verified_at: undefined
        },
        created_at: "2026-10-21T06:12:00Z",
        completed_at: "2026-10-21T06:12:01Z",
        latency_ms: 1.1
    }
];

export default function AgentPage() {
    const [tasks, setTasks] = useState<A2ATask[]>(SEED_TASKS);
    const [selectedTaskId, setSelectedTaskId] = useState<string>("task_a2a_pi5_0918");
    const [filterState, setFilterState] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    
    // Dispatch Dialog / Form State
    const [promptInput, setPromptInput] = useState("");
    const [selectedDriver, setSelectedDriver] = useState<A2ADriver>("InMemoryTaskRunner");
    const [targetAgentDid, setTargetAgentDid] = useState("did:talos:agent:visa-scout:8f12d4a");
    const [isDispatching, setIsDispatching] = useState(false);
    const [activeTab, setActiveTab] = useState<"trace" | "input" | "integrity">("trace");
    const [reasoningExpanded, setReasoningExpanded] = useState(true);

    const selectedTask = tasks.find(t => t.id === selectedTaskId) || tasks[0];

    // Filter tasks
    const filteredTasks = tasks.filter(t => {
        const matchesFilter = filterState === "ALL" || t.state === filterState;
        const matchesSearch = searchQuery === "" || 
            t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.context_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.agent_did.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const counts = {
        total: tasks.length,
        working: tasks.filter(t => t.state === "WORKING").length,
        completed: tasks.filter(t => t.state === "COMPLETED").length,
        failed: tasks.filter(t => t.state === "FAILED" || t.state === "CANCELED").length,
    };

    const handleDispatch = async () => {
        if (!promptInput.trim() || isDispatching) return;

        setIsDispatching(true);
        const taskId = `task_a2a_${Date.now().toString(36)}`;
        const contextId = `ctx_${Math.random().toString(36).substring(2, 9)}`;

        // Optimistic Submitted Task
        const newTask: A2ATask = {
            id: taskId,
            context_id: contextId,
            agent_did: targetAgentDid,
            driver: selectedDriver,
            state: "WORKING",
            message: {
                role: "user",
                parts: [{ type: "text", text: promptInput.trim() }]
            },
            reasoning: "Initializing secure session...\nVerifying agent capability token...\nEvaluating policy rules...",
            output: "",
            capability: {
                issuer: "did:talos:agent:root-orchestrator:001",
                actions: ["tasks:send", "audit:verify"],
                expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
            },
            created_at: new Date().toISOString(),
            latency_ms: selectedDriver === "InMemoryTaskRunner" ? 4.1 : 38.5
        };

        setTasks(prev => [newTask, ...prev]);
        setSelectedTaskId(taskId);
        setPromptInput("");

        // Simulate real-time streaming execution
        setTimeout(async () => {
            const encoder = new TextEncoder();
            const leafBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(newTask.id + newTask.context_id));
            const leafHex = Array.from(new Uint8Array(leafBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

            setTasks(prev => prev.map(t => {
                if (t.id === taskId) {
                    return {
                        ...t,
                        state: "COMPLETED",
                        reasoning: "1. Verified capability token signature (Ed25519)\n2. Established ChaCha20-Poly1305 forward-secret frame\n3. Dispatched via " + selectedDriver + "\n4. Appended leaf to Merkle audit plane with 0x00 domain separator",
                        output: "Task executed successfully. Result verified against zero-trust policy. All cryptographic invariants held.",
                        integrity: {
                            leaf_hash: `0x${leafHex.substring(0, 42)}`,
                            root_hash: "0x9c8821a0be37628190dbe381904721903ba810023a",
                            verified: true,
                            verified_at: new Date().toISOString()
                        },
                        completed_at: new Date().toISOString()
                    };
                }
                return t;
            }));
            setIsDispatching(false);
        }, 1200);
    };

    const getStatusBadge = (state: A2ATaskState) => {
        switch (state) {
            case "WORKING":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" /> WORKING</span>;
            case "COMPLETED":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><CheckCircle2 className="w-3 h-3" /> COMPLETED</span>;
            case "FAILED":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30"><XCircle className="w-3 h-3" /> FAILED</span>;
            case "CANCELED":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30"><AlertTriangle className="w-3 h-3" /> CANCELED</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30"><Clock className="w-3 h-3" /> SUBMITTED</span>;
        }
    };

    return (
        <div className="flex h-screen flex-col bg-[#08080A] text-zinc-100 font-sans">
            <PageHeader 
                title="A2A Task Fleet Inspector" 
                subtitle="Agent-to-Agent v1 Protocol • Canonical Lifecycle & Execution Monitoring" 
            />

            {/* Top Cluster & Status Bar */}
            <div className="border-b border-zinc-800/80 bg-zinc-950/60 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Edge Runner: <strong className="text-zinc-200">InMemoryTaskRunner (&lt; 5ms)</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Distributed Swarm: <strong className="text-zinc-200">Temporal (:7233)</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Vector Store: <strong className="text-zinc-200">Qdrant (:6333)</strong></span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <a 
                        href="http://192.168.1.250:8233" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-all"
                    >
                        Temporal Web UI <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 pb-2">
                <GlassPanel className="p-4">
                    <div className="text-xs text-zinc-400 font-medium">Total Tasks</div>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">{counts.total}</div>
                </GlassPanel>
                <GlassPanel className="p-4">
                    <div className="text-xs text-amber-400 font-medium">Active (Working)</div>
                    <div className="text-2xl font-bold text-amber-300 mt-1">{counts.working}</div>
                </GlassPanel>
                <GlassPanel className="p-4">
                    <div className="text-xs text-emerald-400 font-medium">Completed</div>
                    <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.completed}</div>
                </GlassPanel>
                <GlassPanel className="p-4">
                    <div className="text-xs text-zinc-400 font-medium">Avg Edge Latency</div>
                    <div className="text-2xl font-bold text-zinc-100 mt-1">&lt; 4.5ms</div>
                </GlassPanel>
            </div>

            {/* Main Fleet Console */}
            <main className="flex flex-1 gap-6 p-6 pt-3 overflow-hidden">
                {/* Left Pane: Tasks List */}
                <GlassPanel className="w-5/12 flex flex-col overflow-hidden">
                    {/* Filter and Search */}
                    <div className="p-4 border-b border-white/5 space-y-3">
                        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-md px-3 py-1.5 text-xs">
                            <Search className="w-3.5 h-3.5 text-zinc-400" />
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter tasks by ID, context, or DID..."
                                className="bg-transparent flex-1 focus:outline-none text-zinc-200 placeholder:text-zinc-500"
                            />
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto text-xs font-medium">
                            {["ALL", "WORKING", "COMPLETED", "FAILED"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setFilterState(tab)}
                                    className={`px-2.5 py-1 rounded-md transition-colors ${
                                        filterState === tab 
                                            ? "bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold" 
                                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tasks Scrollable List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                        {filteredTasks.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">
                                No A2A tasks match your criteria.
                            </div>
                        ) : (
                            filteredTasks.map(t => {
                                const isSelected = t.id === selectedTaskId;
                                return (
                                    <div 
                                        key={t.id}
                                        onClick={() => setSelectedTaskId(t.id)}
                                        className={`p-4 cursor-pointer transition-all ${
                                            isSelected 
                                                ? "bg-blue-600/10 border-l-4 border-blue-500" 
                                                : "hover:bg-zinc-900/40"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="font-mono text-xs font-bold text-zinc-200 truncate">{t.id}</span>
                                            {getStatusBadge(t.state)}
                                        </div>
                                        <div className="text-xs text-zinc-400 mb-2 font-mono truncate">
                                            Context: {t.context_id}
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                                            <span className="inline-flex items-center gap-1 font-mono text-zinc-400">
                                                <Cpu className="w-3 h-3 text-zinc-500" />
                                                {t.driver === "InMemoryTaskRunner" ? "Edge (In-Memory)" : "Temporal Cluster"}
                                            </span>
                                            <span>{t.latency_ms}ms</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Dispatch Form Box */}
                    <div className="p-4 border-t border-white/10 bg-zinc-950/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                                <Play className="w-3 h-3 text-blue-400" /> Dispatch A2A Task
                            </span>
                            <select 
                                value={selectedDriver}
                                onChange={e => setSelectedDriver(e.target.value as A2ADriver)}
                                className="bg-zinc-900 border border-zinc-700 rounded text-xs px-2 py-1 text-zinc-300 focus:outline-none"
                            >
                                <option value="InMemoryTaskRunner">InMemoryTaskRunner (Edge)</option>
                                <option value="TemporalTaskRunner">TemporalTaskRunner (Swarm)</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <input 
                                value={promptInput}
                                onChange={e => setPromptInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleDispatch()}
                                placeholder="Task instruction for autonomous agent swarm..."
                                disabled={isDispatching}
                                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleDispatch}
                                disabled={!promptInput.trim() || isDispatching}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-all flex items-center gap-1"
                            >
                                {isDispatching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>
                </GlassPanel>

                {/* Right Pane: Task Deep-Dive & Attestation */}
                <GlassPanel className="flex-1 flex flex-col overflow-hidden">
                    {selectedTask ? (
                        <>
                            {/* Task Detail Header */}
                            <div className="p-6 border-b border-white/5 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold text-zinc-100 font-mono">{selectedTask.id}</h2>
                                            {getStatusBadge(selectedTask.state)}
                                        </div>
                                        <div className="text-xs text-zinc-400 mt-1 font-mono">
                                            Context: <span className="text-zinc-200">{selectedTask.context_id}</span> • Agent: <span className="text-blue-300">{selectedTask.agent_did}</span>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-zinc-400 space-y-1">
                                        <div>Created: <span className="text-zinc-300 font-mono">{selectedTask.created_at}</span></div>
                                        <div>Driver: <span className="text-zinc-200 font-semibold">{selectedTask.driver}</span></div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-4 border-b border-white/5 text-xs font-semibold">
                                    <button 
                                        onClick={() => setActiveTab("trace")}
                                        className={`pb-2 transition-colors ${
                                            activeTab === "trace" 
                                                ? "text-blue-400 border-b-2 border-blue-500" 
                                                : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                    >
                                        Reasoning & Output Trace
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab("input")}
                                        className={`pb-2 transition-colors ${
                                            activeTab === "input" 
                                                ? "text-blue-400 border-b-2 border-blue-500" 
                                                : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                    >
                                        Input Message & Artifacts
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab("integrity")}
                                        className={`pb-2 transition-colors ${
                                            activeTab === "integrity" 
                                                ? "text-blue-400 border-b-2 border-blue-500" 
                                                : "text-zinc-400 hover:text-zinc-200"
                                        }`}
                                    >
                                        Cryptographic Attestation
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {activeTab === "trace" && (
                                    <div className="space-y-4">
                                        {/* Reasoning Block */}
                                        {selectedTask.reasoning && (
                                            <div className="rounded-lg border border-purple-500/20 bg-purple-950/10 p-4">
                                                <button 
                                                    onClick={() => setReasoningExpanded(!reasoningExpanded)}
                                                    className="flex items-center justify-between w-full text-xs font-semibold text-purple-300 mb-2"
                                                >
                                                    <span className="flex items-center gap-1.5 font-mono">
                                                        <Terminal className="w-3.5 h-3.5" /> Agent Reasoning Trace (&lt;think&gt;)
                                                    </span>
                                                    {reasoningExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </button>
                                                {reasoningExpanded && (
                                                    <pre className="text-xs text-purple-200/90 whitespace-pre-wrap font-mono leading-relaxed bg-black/30 p-3 rounded border border-purple-500/20">
                                                        {selectedTask.reasoning}
                                                    </pre>
                                                )}
                                            </div>
                                        )}

                                        {/* Output Block */}
                                        <div className="rounded-lg border border-white/5 bg-zinc-900/40 p-4 space-y-2">
                                            <div className="text-xs font-semibold text-zinc-300 font-mono">
                                                Task Output Result
                                            </div>
                                            <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                                {selectedTask.output || <span className="text-zinc-500 italic">No output produced yet.</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "input" && (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-white/5 bg-zinc-900/40 p-4 space-y-2">
                                            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                Role: {selectedTask.message.role}
                                            </div>
                                            {selectedTask.message.parts.map((p, i) => (
                                                <div key={i} className="text-sm text-zinc-200 font-mono bg-black/30 p-3 rounded border border-white/5">
                                                    {p.text || p.content}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === "integrity" && (
                                    <div className="space-y-4">
                                        {/* Capability Token */}
                                        <div className="rounded-lg border border-white/5 bg-zinc-900/40 p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                                                <Key className="w-3.5 h-3.5 text-amber-400" /> Delegated Capability Token
                                            </div>
                                            {selectedTask.capability ? (
                                                <div className="space-y-2 text-xs font-mono">
                                                    <div className="text-zinc-400">Issuer: <span className="text-zinc-200">{selectedTask.capability.issuer}</span></div>
                                                    <div className="text-zinc-400">Actions: <span className="text-emerald-400">{selectedTask.capability.actions.join(", ")}</span></div>
                                                    <div className="text-zinc-400">Expires: <span className="text-zinc-200">{selectedTask.capability.expires_at}</span></div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-rose-400 font-mono">
                                                    No capability delegation token attached. Action unauthorized.
                                                </div>
                                            )}
                                        </div>

                                        {/* Merkle Attestation */}
                                        <div className="rounded-lg border border-white/5 bg-zinc-900/40 p-4 space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                                                <Shield className="w-3.5 h-3.5 text-blue-400" /> Cryptographic Merkle Audit Attestation
                                            </div>
                                            {selectedTask.integrity ? (
                                                <div className="space-y-2 text-xs font-mono">
                                                    <div className="text-zinc-400">Leaf Hash (0x00 separator): <div className="text-zinc-200 break-all">{selectedTask.integrity.leaf_hash}</div></div>
                                                    <div className="text-zinc-400">Merkle Root: <div className="text-blue-300 break-all">{selectedTask.integrity.root_hash}</div></div>
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <span className="text-zinc-400">Verification Status:</span>
                                                        {selectedTask.integrity.verified ? (
                                                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED ATTESTED
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                                                                <XCircle className="w-3.5 h-3.5" /> UNVERIFIED
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-zinc-500 italic">Audit attestation pending completion.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                            Select an A2A task from the left to view details and cryptographic attestation.
                        </div>
                    )}
                </GlassPanel>
            </main>
        </div>
    );
}
