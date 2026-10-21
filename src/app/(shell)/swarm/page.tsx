"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Network,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Search,
  Copy,
  Cpu,
  Layers,
  Globe,
  Terminal,
  ArrowRight,
  Code,
  Zap,
  Info,
  Check,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import type { SwarmAgentCard } from "@/app/api/swarm/cards/route";

export default function SwarmDirectoryPage() {
  const [cards, setCards] = useState<SwarmAgentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState<"all" | "verified" | "unverified">("all");
  const [selectedCard, setSelectedCard] = useState<SwarmAgentCard | null>(null);
  const [activeTab, setActiveTab] = useState<"card" | "did" | "proof" | "skills">("card");
  const [copiedDid, setCopiedDid] = useState<string | null>(null);

  // Peer probe state
  const [probeUrl, setProbeUrl] = useState("");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/swarm/cards");
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
        if (data.cards?.length > 0 && !selectedCard) {
          setSelectedCard(data.cards[0]);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCopyDid = (did: string) => {
    navigator.clipboard.writeText(did);
    setCopiedDid(did);
    setTimeout(() => setCopiedDid(null), 2000);
  };

  const handleProbePeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probeUrl.trim()) return;

    setProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/swarm/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: probeUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.card) {
        setProbeResult({
          success: true,
          message: data.message || "Peer card discovered successfully.",
        });
        setCards((prev) => {
          const filtered = prev.filter((c) => c.did !== data.card.did);
          return [data.card, ...filtered];
        });
        setSelectedCard(data.card);
        setProbeUrl("");
      } else {
        setProbeResult({
          success: false,
          message: data.error || "Failed to discover peer endpoint.",
        });
      }
    } catch (err: unknown) {
      setProbeResult({
        success: false,
        message: err instanceof Error ? err.message : "Network error discovering peer.",
      });
    } finally {
      setProbing(false);
    }
  };

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.did.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.skills.some((s) => s.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        card.capabilities.extensions.some((ext) => ext.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterVerified === "verified") return card.verified;
      if (filterVerified === "unverified") return !card.verified;
      return true;
    });
  }, [cards, searchQuery, filterVerified]);

  const verifiedCount = cards.filter((c) => c.verified).length;
  const totalExtensions = useMemo(() => {
    const extSet = new Set<string>();
    cards.forEach((c) => c.capabilities.extensions.forEach((e) => extSet.add(e)));
    return extSet.size;
  }, [cards]);

  const generateDidDocument = (card: SwarmAgentCard) => {
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      id: card.did,
      verificationMethod: [
        {
          id: `${card.did}#key-1`,
          type: "Ed25519VerificationKey2020",
          controller: card.did,
          publicKeyMultibase: card.proof?.proofValue || "z6MkuT...",
        },
      ],
      authentication: [`${card.did}#key-1`],
      assertionMethod: [`${card.did}#key-1`],
      service: [
        {
          id: `${card.did}#a2a-rpc`,
          type: "A2ARPCService",
          serviceEndpoint: card.endpoints.rpc,
        },
        ...(card.endpoints.stream
          ? [
              {
                id: `${card.did}#a2a-stream`,
                type: "A2AStreamingService",
                serviceEndpoint: card.endpoints.stream,
              },
            ]
          : []),
      ],
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Swarm Directory & Agent Cards"
        subtitle="Authenticated A2A Agent Card registry, cryptographic verification, and peer capability discovery (a2a/v1.0.0)."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCards}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface border border-border-subtle text-xs font-mono text-content-subtle hover:text-content transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/agent"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-xs font-mono text-brand-primary transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              Agent Console
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassPanel className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-content">{cards.length}</div>
            <div className="text-xs text-content-subtle">Discovered Swarm Nodes</div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{verifiedCount}</div>
            <div className="text-xs text-content-subtle">Ed25519 Verified Cards</div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-cyan-400">{totalExtensions}</div>
            <div className="text-xs text-content-subtle">Active A2A Extensions</div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-violet-400">a2a/v1.0.0</div>
            <div className="text-xs text-content-subtle">Core Protocol Baseline</div>
          </div>
        </GlassPanel>
      </div>

      {/* Peer Discovery Form */}
      <GlassPanel className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-content flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-brand-primary" />
              Discover & Verify Peer Agent Card
            </h3>
            <p className="text-xs text-content-subtle mt-0.5">
              Enter a peer node endpoint to fetch its <code className="font-mono text-brand-primary">/.well-known/agent.json</code> and verify its cryptographic Ed25519 proof.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-content-subtle">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Raspberry Pi 5 Scout Online (192.168.1.189)
          </div>
        </div>

        <form onSubmit={handleProbePeer} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-2.5 w-4 h-4 text-content-subtle" />
            <input
              type="text"
              placeholder="e.g. http://192.168.1.189:8000/a2a or https://node.example.org/.well-known/agent.json"
              value={probeUrl}
              onChange={(e) => setProbeUrl(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-xs font-mono text-content placeholder:text-content-subtle/50 focus:outline-none focus:border-brand-primary/50"
            />
          </div>
          <button
            type="submit"
            disabled={probing || !probeUrl.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-black font-semibold rounded-lg text-xs hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
          >
            {probing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Verifying Proof...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Inspect & Verify Card
              </>
            )}
          </button>
        </form>

        {probeResult && (
          <div
            className={`mt-3 p-3 rounded-lg border text-xs flex items-center gap-2 ${
              probeResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {probeResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{probeResult.message}</span>
          </div>
        )}
      </GlassPanel>

      {/* Directory Content: Left List / Right Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of Agents */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-content-subtle" />
              <input
                type="text"
                placeholder="Search by agent name, DID, skill, extension..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-subtle border border-border-subtle rounded-lg text-xs font-mono text-content placeholder:text-content-subtle/50 focus:outline-none focus:border-brand-primary/50"
              />
            </div>
            <div className="flex rounded-lg border border-border-subtle bg-surface-subtle p-0.5 text-xs font-mono">
              <button
                onClick={() => setFilterVerified("all")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterVerified === "all" ? "bg-surface text-content font-semibold" : "text-content-subtle"
                }`}
              >
                All ({cards.length})
              </button>
              <button
                onClick={() => setFilterVerified("verified")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterVerified === "verified" ? "bg-emerald-500/20 text-emerald-400 font-semibold" : "text-content-subtle"
                }`}
              >
                Verified ({verifiedCount})
              </button>
              <button
                onClick={() => setFilterVerified("unverified")}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filterVerified === "unverified" ? "bg-amber-500/20 text-amber-400 font-semibold" : "text-content-subtle"
                }`}
              >
                Unverified ({cards.length - verifiedCount})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredCards.map((card) => {
              const isSelected = selectedCard?.did === card.did;
              return (
                <div
                  key={card.did}
                  onClick={() => setSelectedCard(card)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-surface border-brand-primary/50 shadow-lg shadow-brand-primary/5"
                      : "bg-surface-subtle/60 hover:bg-surface border-border-subtle hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-content">{card.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border-subtle text-content-subtle">
                          v{card.version}
                        </span>
                      </div>
                      <p className="text-xs text-content-subtle line-clamp-1">{card.description}</p>
                    </div>

                    {card.verified ? (
                      <span className="shrink-0 flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <ShieldAlert className="w-3 h-3" />
                        Unverified
                      </span>
                    )}
                  </div>

                  {/* DID and Copy */}
                  <div className="flex items-center justify-between gap-2 py-1 px-2 mb-3 bg-black/20 rounded border border-border-subtle/50 text-[11px] font-mono text-content-subtle">
                    <span className="truncate">{card.did}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyDid(card.did);
                      }}
                      className="text-content-subtle hover:text-content"
                      title="Copy DID"
                    >
                      {copiedDid === card.did ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {card.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary"
                      >
                        {skill.id}
                      </span>
                    ))}
                  </div>

                  {/* Extensions bar */}
                  <div className="flex items-center justify-between text-[11px] text-content-subtle border-t border-border-subtle/40 pt-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3 h-3 text-content-subtle" />
                      <span>{card.capabilities.extensions.length} extensions</span>
                    </div>
                    <div className="flex items-center gap-1 text-brand-primary font-mono text-[11px]">
                      <span>Inspect card</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCards.length === 0 && (
              <GlassPanel className="p-8 text-center text-content-subtle text-xs">
                No agent cards match your search criteria.
              </GlassPanel>
            )}
          </div>
        </div>

        {/* Right column: Card & DID Inspector */}
        <div className="lg:col-span-6">
          {selectedCard ? (
            <GlassPanel className="p-5 space-y-4 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-border-subtle">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-content">{selectedCard.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-content-subtle">
                      v{selectedCard.version}
                    </span>
                  </div>
                  <p className="text-xs text-content-subtle mt-1">{selectedCard.description}</p>
                </div>

                <Link
                  href={`/agent?did=${encodeURIComponent(selectedCard.did)}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-black font-semibold text-xs hover:bg-brand-primary/90 transition-colors shrink-0"
                >
                  <span>Dispatch Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Endpoints Grid */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-content uppercase tracking-wider">
                  Service Endpoints
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border-subtle">
                    <span className="text-content-subtle">A2A JSON-RPC</span>
                    <span className="text-brand-primary truncate max-w-[280px]">
                      {selectedCard.endpoints.rpc}
                    </span>
                  </div>
                  {selectedCard.endpoints.stream && (
                    <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border-subtle">
                      <span className="text-content-subtle">A2A Streaming</span>
                      <span className="text-cyan-400 truncate max-w-[280px]">
                        {selectedCard.endpoints.stream}
                      </span>
                    </div>
                  )}
                  {selectedCard.endpoints.didDocument && (
                    <div className="flex items-center justify-between p-2 rounded bg-surface-subtle border border-border-subtle">
                      <span className="text-content-subtle">W3C DID Doc</span>
                      <span className="text-violet-400 truncate max-w-[280px]">
                        {selectedCard.endpoints.didDocument}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Extensions & Capabilities */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-content uppercase tracking-wider">
                  Active Extensions
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCard.capabilities.extensions.length > 0 ? (
                    selectedCard.capabilities.extensions.map((ext) => (
                      <span
                        key={ext}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300"
                      >
                        {ext}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-content-subtle italic">No extensions active</span>
                  )}
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <div className="flex items-center gap-1 border-b border-border-subtle pb-2 text-xs font-mono">
                  <button
                    onClick={() => setActiveTab("card")}
                    className={`px-3 py-1 rounded transition-colors ${
                      activeTab === "card"
                        ? "bg-brand-primary/20 text-brand-primary font-semibold"
                        : "text-content-subtle hover:text-content"
                    }`}
                  >
                    Agent Card JSON
                  </button>
                  <button
                    onClick={() => setActiveTab("did")}
                    className={`px-3 py-1 rounded transition-colors ${
                      activeTab === "did"
                        ? "bg-brand-primary/20 text-brand-primary font-semibold"
                        : "text-content-subtle hover:text-content"
                    }`}
                  >
                    DID Document
                  </button>
                  <button
                    onClick={() => setActiveTab("proof")}
                    className={`px-3 py-1 rounded transition-colors ${
                      activeTab === "proof"
                        ? "bg-brand-primary/20 text-brand-primary font-semibold"
                        : "text-content-subtle hover:text-content"
                    }`}
                  >
                    Cryptographic Proof
                  </button>
                  <button
                    onClick={() => setActiveTab("skills")}
                    className={`px-3 py-1 rounded transition-colors ${
                      activeTab === "skills"
                        ? "bg-brand-primary/20 text-brand-primary font-semibold"
                        : "text-content-subtle hover:text-content"
                    }`}
                  >
                    Skills ({selectedCard.skills.length})
                  </button>
                </div>

                {/* Tab Views */}
                {activeTab === "card" && (
                  <pre className="p-3 bg-black/40 border border-border-subtle rounded-lg text-[11px] font-mono text-content-subtle overflow-x-auto max-h-[320px]">
                    {JSON.stringify(selectedCard, null, 2)}
                  </pre>
                )}

                {activeTab === "did" && (
                  <pre className="p-3 bg-black/40 border border-border-subtle rounded-lg text-[11px] font-mono text-content-subtle overflow-x-auto max-h-[320px]">
                    {JSON.stringify(generateDidDocument(selectedCard), null, 2)}
                  </pre>
                )}

                {activeTab === "proof" && (
                  <div className="space-y-3 p-3 bg-black/40 border border-border-subtle rounded-lg text-xs font-mono">
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle/50">
                      <span className="text-content-subtle">Signature Verification</span>
                      {selectedCard.verified ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Cryptographically Valid
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Signature Missing / Invalid
                        </span>
                      )}
                    </div>

                    {selectedCard.proof ? (
                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-content-subtle">Suite: </span>
                          <span className="text-content">{selectedCard.proof.type}</span>
                        </div>
                        <div>
                          <span className="text-content-subtle">Verification Method: </span>
                          <span className="text-brand-primary break-all">{selectedCard.proof.verificationMethod}</span>
                        </div>
                        <div>
                          <span className="text-content-subtle">Purpose: </span>
                          <span className="text-content">{selectedCard.proof.proofPurpose}</span>
                        </div>
                        <div>
                          <span className="text-content-subtle">Created: </span>
                          <span className="text-content">{selectedCard.proof.created}</span>
                        </div>
                        <div>
                          <span className="text-content-subtle">Value: </span>
                          <span className="text-content-subtle break-all">{selectedCard.proof.proofValue}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-300">
                        This agent card does not carry an Ed25519Signature2020 proof bundle. Peer requests from this node are treated as unverified.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === "skills" && (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {selectedCard.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="p-2.5 rounded bg-surface-subtle border border-border-subtle space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-content">{skill.name}</span>
                          <code className="text-[10px] font-mono text-brand-primary">{skill.id}</code>
                        </div>
                        <p className="text-xs text-content-subtle">{skill.description}</p>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {skill.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-content-subtle"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-8 text-center text-content-subtle text-xs">
              Select an agent from the directory to inspect its card and cryptographic proof.
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
