import React, { useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Download, AlertTriangle, FileJson, X, CheckCircle, Shield, BarChart3 } from "lucide-react";
import { RedactionLevel } from "@talos-protocol/contracts";

interface ExportDialogProps {
  readonly mode: "selected" | "filtered";
  readonly selectedCount: number;
  readonly filteredCount: number;
  readonly isOpen: boolean;
  readonly onExport: (options: { redactionLevel: RedactionLevel }) => void;
  readonly onClose: () => void;
  readonly isExporting?: boolean;
  readonly exportProgress?: number;
  readonly exportStage?: "preparing" | "validating" | "downloading";
  // For preview
  readonly outcomeCounts?: { OK: number; DENY: number; ERROR: number };
}

export function ExportDialog({
  mode,
  selectedCount,
  filteredCount,
  isOpen,
  onExport,
  onClose,
  isExporting,
  exportProgress,
  exportStage,
  outcomeCounts
}: ExportDialogProps) {
  const [redactionLevel, setRedactionLevel] = useState<RedactionLevel>("safe_default");

  if (!isOpen) return null;

  const count = mode === "selected" ? selectedCount : filteredCount;
  const isOverLimit = count > 10000;

  const stageLabel = exportStage === "preparing" ? "Preparing bundle..." 
    : exportStage === "validating" ? "Validating events..."
    : exportStage === "downloading" ? "Creating download..."
    : "Processing...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-md p-6 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
            <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-emerald-400" />
            Export Evidence Bundle
        </h2>

        <div className="space-y-4">
            <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Export Scope:</span>
                    <span className="text-white font-medium capitalize">{mode} Events</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                     <span className="text-zinc-400">Event Count:</span>
                     <span className={isOverLimit ? "text-red-400 font-bold" : "text-white"}>
                        {count.toLocaleString()}
                     </span>
                </div>
                 <div className="flex justify-between text-sm">
                     <span className="text-zinc-400">Est. Size:</span>
                     <span className="text-white">~{(count * 0.5).toFixed(1)} KB</span>
                </div>
            </div>

            {/* Integrity Preview */}
            {outcomeCounts && count > 0 && (
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>Integrity Preview</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-zinc-300">OK: {outcomeCounts.OK}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-zinc-300">DENY: {outcomeCounts.DENY}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span className="text-zinc-300">ERROR: {outcomeCounts.ERROR}</span>
                        </div>
                    </div>
                </div>
            )}

            {isOverLimit && (
                <div className="flex items-start gap-2 bg-red-900/20 border border-red-900/50 p-3 rounded-lg text-red-200 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>
                        Export limit exceeded. Browser export is capped at 10,000 events. 
                        Please filter your results to reduce the count.
                    </span>
                </div>
            )}

            <fieldset>
                <legend className="block text-sm text-zinc-400 mb-2">Redaction Level</legend>
                <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Redaction Level">
                    <button
                        onClick={() => setRedactionLevel("safe_default")}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            redactionLevel === "safe_default" 
                                ? "bg-emerald-900/20 border-emerald-500/50 text-white" 
                                : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                        }`}
                    >
                        <Shield className="w-5 h-5" />
                        <div>
                            <div className="font-medium">Safe Default</div>
                            <div className="text-xs opacity-70">Strips auth tokens/keys (Recommended)</div>
                        </div>
                        {redactionLevel === "safe_default" && <CheckCircle className="w-4 h-4 ml-auto text-emerald-400" />}
                    </button>
                     <button
                        onClick={() => setRedactionLevel("strict")}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                            redactionLevel === "strict" 
                                ? "bg-emerald-900/20 border-emerald-500/50 text-white" 
                                : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                        }`}
                    >
                        <Shield className="w-5 h-5" />
                        <div>
                            <div className="font-medium">Strict Mode</div>
                            <div className="text-xs opacity-70">Strips all headers & inputs</div>
                        </div>
                        {redactionLevel === "strict" && <CheckCircle className="w-4 h-4 ml-auto text-emerald-400" />}
                    </button>
                </div>
            </fieldset>

            {/* Progress Bar */}
            {isExporting && (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>{stageLabel}</span>
                        <span>{exportProgress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${exportProgress || 0}%` }}
                        />
                    </div>
                </div>
            )}

            <button
                disabled={isOverLimit || isExporting}
                onClick={() => onExport({ redactionLevel })}
                className="w-full mt-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
                {isExporting ? (
                    <>Processing...</>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        Download Bundle
                    </>
                )}
            </button>
        </div>
      </GlassPanel>
    </div>
  );
}
