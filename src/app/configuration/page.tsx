"use client";

import { useEffect, useState, useCallback } from "react";
import { ConfigurationAdapter, Draft, HistoryItem, ValidationResult } from "@/features/configuration/adapters/configuration-adapter";
import { VERSION as REQUIRED_VERSION } from "@talos-protocol/contracts";
import yaml from "js-yaml";
import { AlertCircle, Check, FileJson, History, Save, Shield, Upload, Lock } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');

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
      alert("Draft Created!");
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
      alert("Published Successfully!");
      setDraft(null);
      loadData(); // Refresh history
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Configuration Control Plane</h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Contracts Version: <span className="font-mono text-emerald-400">{contractsVersion || "Loading..."}</span>
            </p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setActiveTab('editor')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>Editor</button>
             <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>History</button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
            </div>
        )}

        {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[70vh]">
                {/* Editor Column */}
                <div className="space-y-4 flex flex-col h-full">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-slate-400 uppercase tracking-wider">Config YAML</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleValidate}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-white transition border border-slate-700"
                            >
                                <Check className="w-3.5 h-3.5" /> Validate
                            </button>
                        </div>
                    </div>
                    <textarea 
                        value={configText}
                        onChange={(e) => setConfigText(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-slate-300"
                        spellCheck={false}
                    />
                </div>

                {/* Actions & Status Column */}
                <div className="space-y-6">
                    {/* Validation Status */}
                    {validationResult && (
                        <div className={`p-6 rounded-xl border ${validationResult.valid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                            <h3 className={`font-bold flex items-center gap-2 ${validationResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {validationResult.valid ? <Check className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
                                {validationResult.valid ? "Configuration Valid" : "Validation Failed"}
                            </h3>
                            {!validationResult.valid && (
                                <ul className="mt-4 space-y-1 text-sm text-rose-300/80 font-mono list-disc list-inside">
                                    {(Array.isArray(validationResult.errors) ? validationResult.errors : [JSON.stringify(validationResult.errors)]).map((e: unknown, i: number) => (
                                        <li key={i}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Draft Actions */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-indigo-400" />
                            Draft Actions
                        </h3>
                        <p className="text-sm text-slate-400">Validate your configuration before creating a draft. Once drafted, you can publish it to production.</p>
                        
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={handleDraft}
                                disabled={isLoading || (validationResult != null && !validationResult.valid)}
                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex justify-center items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Create Draft
                            </button>
                            {draft && (
                                <button 
                                    onClick={handlePublish}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex justify-center items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> Publish Draft
                                </button>
                            )}
                        </div>

                        {draft && (
                            <div className="mt-4 p-3 bg-slate-800 rounded-lg text-xs font-mono text-slate-400 break-all">
                                <strong>Active Draft ID:</strong> {draft.draft_id}
                                <br/>
                                <strong>Digest:</strong> {draft.config_digest.substring(0, 16)}...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" /> History
                </h3>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-900 text-slate-200 uppercase font-bold text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Published At</th>
                                <th className="px-6 py-4">Version ID</th>
                                <th className="px-6 py-4">Principal</th>
                                <th className="px-6 py-4 text-right">Digest</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                            {history.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-800/50 transition">
                                    <td className="px-6 py-4 font-mono text-white">{new Date(item.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-mono">{item.id.substring(0,8)}</td>
                                    <td className="px-6 py-4">{item.principal || 'N/A'}</td>
                                    <td className="px-6 py-4 text-right font-mono text-xs">{item.config_digest.substring(0, 12)}...</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
