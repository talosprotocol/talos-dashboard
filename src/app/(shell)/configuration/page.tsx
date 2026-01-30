"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/lib/hooks/use-toast";
import { ConfigurationAdapter, Draft, HistoryItem, ValidationResult } from "@/features/configuration/adapters/configuration-adapter";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { VERSION as REQUIRED_VERSION } from "@talosprotocol/contracts";
import yaml from "js-yaml";
import { AlertCircle, Check, FileJson, History, Save, Shield, Upload, Lock, LayoutTemplate, ShieldAlert, Bot } from "lucide-react";
import { MonacoEditor } from "@/components/ui/MonacoEditor";
import { CONFIG_TEMPLATES, Template } from "@/features/configuration/templates";
import { AgentChat } from "@/features/agent/AgentChat";
import { Button } from "@/components/ui/button";


export default function ConfigurationPage() {
  const [adapter] = useState(() => new ConfigurationAdapter());
  const [configText, setConfigText] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [contractsVersion, setContractsVersion] = useState<string>("");
  const [versionMismatch, setVersionMismatch] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'templates' | 'agent'>('editor');
  const [activeTemplateWarning, setActiveTemplateWarning] = useState<string | null>(null);
  const { toast } = useToast();

  const PRINCIPAL_ID = "admin-dashboard-user";

  const loadData = useCallback(async () => {
    try {
      // Use efficient bootstrap endpoint (C5: Optimization & C3: Version Gate)
      const data = await adapter.getBootstrap();
      
      setContractsVersion(data.contracts_version);
      setHistory(data.history?.items || []);
      
      // If we have current config from bootstrap, use it
      if (data.current_config) {
          setConfigText(yaml.dump(data.current_config));
      } else if (data.history?.items?.length > 0 && !configText) {
          // Fallback if current_config missing but history exists
          try {
             const latest = JSON.parse(data.history.items[0].config_json);
             setConfigText(yaml.dump(latest));
          } catch(e) { console.error(e); }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Check for Version Gate 409 (C3)
      if (msg.includes("Version mismatch") || msg.includes("CONTRACTS_VERSION_MISMATCH")) {
          setVersionMismatch(true);
      }
      setError(msg);
    }
  }, [adapter, configText]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleValidate() {
    setIsLoading(true);
    setValidationResult(null);
    try {
      const parsed = yaml.load(configText);
      const res = await adapter.validate(parsed);
      setValidationResult(res);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
      setValidationResult({ valid: false, errors: [msg] });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDraft() {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = yaml.load(configText);
      const res = await adapter.createDraft(parsed, "Draft via Dashboard", PRINCIPAL_ID);
      setDraft(res);
      toast({
          title: "Draft Initialized",
          description: "New configuration draft has been staged for authorization.",
          variant: "success"
      });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;
    setIsLoading(true);
    setError(null);
    try {
      await adapter.publishDraft(draft.draft_id, PRINCIPAL_ID);
      toast({
          title: "Release Authorized",
          description: "Configuration has been committed to the immutable ledger.",
          variant: "success"
      });
      setDraft(null);
      loadData(); // Refresh history
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUseTemplate = (template: Template) => {
      setConfigText(template.yaml);
      setActiveTab("editor");
      
      if (template.isDevOnly) {
          setActiveTemplateWarning(`Warning: You are using a ${template.label} template. Do not use this in production.`);
      } else {
          setActiveTemplateWarning(null);
      }
  };

  if (versionMismatch) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <div className="bg-rose-950/30 border border-rose-500/30 p-8 rounded-2xl max-w-md text-center space-y-4">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="w-8 h-8 text-rose-500" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">Version Mismatch</h1>
                  <p className="text-rose-200">
                      The dashboard contracts version ({REQUIRED_VERSION}) does not match the backend version ({contractsVersion}).
                  </p>
                  <p className="text-slate-400 text-sm">
                      To prevent configuration corruption, write access is disabled. Please update the dashboard or backend to matching versions.
                  </p>
              </div>
          </div>
      );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
    >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8 py-2">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
                    Configuration <span className="text-indigo-400">Control</span>
                </h1>
                <p className="text-slate-400 text-sm font-medium flex items-center gap-2 px-1">
                    <Lock className="w-4 h-4 text-emerald-500/80" />
                    Contracts Stack: <span className="font-mono text-emerald-400 font-bold">{contractsVersion || "SYNCHRONIZING..."}</span>
                </p>
            </div>
            <div className="flex gap-3 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                <button 
                    onClick={() => setActiveTab('editor')} 
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'editor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/[0.05] text-slate-500 hover:text-slate-300'}`}
                >
                    Editor
                </button>
                <button 
                    onClick={() => setActiveTab('templates')} 
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'templates' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/[0.05] text-slate-500 hover:text-slate-300'}`}
                >
                    <LayoutTemplate className="w-3 h-3" /> Templates
                </button>
                <button 
                    onClick={() => setActiveTab('agent')} 
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'agent' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/[0.05] text-slate-500 hover:text-slate-300'}`}
                >
                    <Bot className="w-3 h-3" /> Agent
                </button>
                <button 
                    onClick={() => setActiveTab('history')} 
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/[0.05] text-slate-500 hover:text-slate-300'}`}
                >
                    History
                </button>
            </div>
        </div>
        
        {/* Dev Warning Banner */}
        <AnimatePresence>
          {activeTemplateWarning && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-6 py-3 flex items-center gap-3 text-yellow-500 text-sm font-medium"
              >
                  <ShieldAlert className="w-4 h-4" />
                  {activeTemplateWarning}
                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10" onClick={() => setActiveTemplateWarning(null)}>
                      <span className="sr-only">Dismiss</span>
                      &times;
                  </Button>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        {error && (
            <GlassPanel className="bg-rose-500/10 border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-tight">{error}</span>
            </GlassPanel>
        )}

        {/* Tab Content */}
        {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-14rem)] min-h-[500px]">
                {/* Editor Column */}
                <div className="space-y-4 flex flex-col h-full min-h-0">
                    <div className="flex justify-between items-center px-1 shrink-0">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active YAML Core</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleValidate}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-all duration-300"
                            >
                                <Check className="w-3 h-3 text-emerald-500" /> Validate
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-[#1e1e1e] border-white/5 border rounded-xl overflow-hidden shadow-inner relative flex flex-col">
                        <MonacoEditor
                            value={configText}
                            onChange={(value) => setConfigText(value || "")}
                            className="h-full w-full"
                        />
                    </div>
                </div>

                {/* Actions Column */}
                <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                    {/* Validation Status */}
                    {validationResult && (
                        <GlassPanel className={`p-6 border shadow-2xl ${validationResult.valid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                            <h3 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${validationResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {validationResult.valid ? <Check className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                                {validationResult.valid ? "Integrity Check Passed" : "Schema Violation Detected"}
                            </h3>
                            {!validationResult.valid && (
                                <ul className="mt-4 space-y-2 text-[10px] text-rose-300/60 font-mono font-bold uppercase tracking-tight list-none">
                                    {(Array.isArray(validationResult.errors) ? validationResult.errors : [JSON.stringify(validationResult.errors)]).map((e: unknown, i: number) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="text-rose-500">▶</span>
                                            {typeof e === 'string' ? e : JSON.stringify(e)}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </GlassPanel>
                    )}

                    {/* Draft Actions */}
                    <GlassPanel className="p-8 space-y-6 border-white/5 bg-slate-900/40">
                        <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
                                <FileJson className="w-4 h-4 text-indigo-400" />
                                Deployment Terminal
                            </h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-normal">
                                Ensure validation passes before commitment. Drafts are isolated until authorized.
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleDraft}
                                disabled={isLoading || (validationResult != null && !validationResult.valid)}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:grayscale text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-300 flex justify-center items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Initialize Draft
                            </button>
                            {draft && (
                                <button 
                                    onClick={handlePublish}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 flex justify-center items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> Authorize Release
                                </button>
                            )}
                        </div>

                        {draft && (
                            <div className="mt-4 p-4 bg-black/40 rounded-xl border border-white/5 text-[9px] font-mono text-slate-500 space-y-1">
                                <div className="flex justify-between uppercase tracking-widest font-black">
                                    <span>Draft Session</span>
                                    <span className="text-emerald-500">Active</span>
                                </div>
                                <div className="break-all opacity-80 pt-2 font-bold">{draft.draft_id}</div>
                                <div className="flex items-center gap-2 pt-1 opacity-60">
                                    <Shield className="w-3 h-3" />
                                    <span>{draft.config_digest.substring(0, 24)}...</span>
                                </div>
                            </div>
                        )}
                    </GlassPanel>
                </div>
            </div>
        )}

        {activeTab === 'templates' && (
              <FilterableTemplateList onUse={handleUseTemplate} />
        )}

        {activeTab === 'agent' && (
            <div className="h-[calc(100vh-14rem)] min-h-[500px]">
                <AgentChat 
                    onApplyCode={async (code) => {
                        setIsLoading(true);
                        try {
                            // Validation Gate
                            const parsed = yaml.load(code);
                            const res = await adapter.validate(parsed);
                            
                            if (!res.valid) {
                                toast({
                                    title: "Safety Gate Blocked",
                                    description: "Agent output failed validation. Please refine the request.",
                                    variant: "destructive"
                                });
                                // Show specific errors in toast or log?
                                return;
                            }

                            setConfigText(code);
                            setActiveTab('editor');
                            toast({
                                title: "Configuration Applied",
                                description: "Agent output has been applied to the editor.",
                                variant: "success"
                            });
                        } catch (_e) {
                            toast({
                                title: "Parse Error",
                                description: "Agent returned invalid YAML.",
                                variant: "destructive"
                            });
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    isApplying={isLoading}
                />
            </div>
        )}

        {activeTab === 'history' && (
            <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                    <History className="w-4 h-4 text-indigo-400" /> Immutable Version History
                </h3>
                <GlassPanel className="border-white/5 overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-xs text-slate-400">
                        <thead className="bg-white/[0.02] text-slate-500 uppercase font-black text-[9px] tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">Temporal Index</th>
                                <th className="px-6 py-5">Version ID</th>
                                <th className="px-6 py-5">Operator</th>
                                <th className="px-6 py-5 text-right">Integrity Digest</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-transparent">
                            {history.map((item) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 font-bold text-white/90">{new Date(item.created_at).toLocaleString([], { hour12: false })}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-slate-500 select-all">{item.id.substring(0,12)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                                            <span className="font-bold text-slate-400 uppercase tracking-tight">{item.principal || 'SYSTEM'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 font-mono text-[10px] font-bold text-indigo-400/80">
                                            <Shield className="w-3 h-3 opacity-40" />
                                            {item.config_digest.substring(0, 16)}...
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </GlassPanel>
            </div>
        )}
    </motion.div>
  );
}

function FilterableTemplateList({ onUse }: { onUse: (t: Template) => void }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    
    // Filter Logic
    const filtered = CONFIG_TEMPLATES.filter(t => {
        const matchesCategory = filter === 'all' || t.category === filter;
        const searchLower = search.toLowerCase();
        const matchesSearch = t.label.toLowerCase().includes(searchLower) || 
                              t.description.toLowerCase().includes(searchLower) ||
                              t.tags.some(tag => tag.toLowerCase().includes(searchLower));
        return matchesCategory && matchesSearch;
    });

    const showComplianceBanner = filter === 'compliance' || (filter === 'all' && filtered.some(t => t.category === 'compliance'));

    return (
        <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 sticky top-0 z-10 bg-slate-950/80 backdrop-blur-sm p-1 rounded-xl">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        placeholder="Search templates..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {['all', 'development', 'production', 'compliance', 'gateway'].map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap border ${filter === cat ? 'bg-indigo-600 text-white border-indigo-500/50 shadow-lg shadow-indigo-500/20' : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/5'}`}
                            >
                                {cat}
                            </button>
                        ))}
                </div>
            </div>

            {/* Warning for Compliance */}
            {showComplianceBanner && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl mb-6 flex gap-3 text-blue-400 animate-in fade-in slide-in-from-top-2">
                    <Shield className="w-5 h-5 shrink-0" />
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wide">Compliance Disclaimer</h4>
                        <p className="text-[10px] opacity-80 leading-relaxed max-w-2xl">
                            Templates labeled as &quot;Supporting Baseline&quot; provide technical configurations that <u>support</u> compliance goals (e.g. HIPAA, GDPR).
                            However, using these templates does NOT guarantee compliance. You must verify deployment controls, data handling, and organizational processes.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                {filtered.map((tmpl) => (
                    <GlassPanel key={tmpl.id} className={`p-6 border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-colors flex flex-col gap-4 relative group ${tmpl.isDevOnly ? 'border-rose-500/10 bg-rose-950/10' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex gap-2 mb-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{tmpl.category}</span>
                                    {tmpl.riskLevel === 'high' && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">High Risk</span>}
                                </div>
                                <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{tmpl.label}</h3>
                                <p className="text-xs text-slate-400 mt-2 leading-relaxed h-10 line-clamp-2">{tmpl.description}</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {tmpl.tags.map(tag => (
                                <span key={tag} className="text-[9px] font-mono text-indigo-300/60 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10">#{tag}</span>
                            ))}
                        </div>

                        {tmpl.isDevOnly && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500 bg-rose-500/5 p-2 rounded border border-rose-500/10">
                                <ShieldAlert className="w-3 h-3" />
                                DEV ONLY: Unsafe for Prod
                            </div>
                        )}
                        
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono font-bold tracking-widest uppercase">v{tmpl.minContractsVersion}+</span>
                            <Button 
                                size="sm" 
                                onClick={() => onUse(tmpl)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest"
                            >
                                Use Template
                            </Button>
                        </div>
                    </GlassPanel>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-500">
                        <p className="text-sm">No templates match your search criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
