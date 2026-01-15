"use client";
import Editor from "@monaco-editor/react";
import { CheckCircle2, XCircle, X, Terminal, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SubmissionModal({ isOpen, onClose, submission }: any) {
  if (!isOpen || !submission) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-6xl h-full max-h-[90vh] bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col"
      >
        {/* HEADER */}
        <div className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-6">
                <div className={cn("px-4 py-1 rounded-full text-xs font-bold border tracking-widest uppercase", 
                    submission.status === 'accepted' ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-rose-500/20 bg-rose-500/10 text-rose-500")}>
                    {submission.status}
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <span className="text-sm font-mono text-neutral-500 italic">{new Date(submission.createdAt).toLocaleString()}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-neutral-400"><X size={24} /></button>
        </div>

        {/* CONTENT SPLIT */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Editor Area */}
            <div className="flex-1 bg-[#09090b] relative">
                <div className="absolute top-4 right-6 z-10 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-neutral-500 uppercase font-mono">
                    {submission.language} Source
                </div>
                <Editor
                    height="100%"
                    theme="vs-dark"
                    language={submission.language === 'c++' ? 'cpp' : submission.language}
                    value={submission.code}
                    options={{ 
                        readOnly: true, 
                        fontSize: 14, 
                        fontFamily: 'var(--font-mono)', 
                        minimap: { enabled: false },
                        padding: { top: 30, bottom: 30 },
                        lineHeight: 22,
                        scrollBeyondLastLine: false,
                        renderLineHighlight: "none"
                    }}
                />
            </div>

            {/* Stats Panel */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/5 bg-black/40 p-8 flex flex-col gap-8 overflow-y-auto">
                <div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Cpu size={12}/> Performance Metrics</div>
                    <div className="space-y-1">
                        <div className="text-3xl font-bold text-white font-mono">{submission.runtime} <span className="text-sm text-neutral-600 font-normal">ms</span></div>
                        <div className="text-xs text-neutral-500">Latency during execution</div>
                    </div>
                </div>

                <div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 size={12}/> Validation</div>
                    <div className="text-xl font-bold text-white font-mono">{submission.testCasesPassed} / {submission.testCasesTotal}</div>
                    <div className="text-xs text-neutral-500 mt-1">Test vectors successfully matched</div>
                </div>

                {submission.errorMessage && (
                    <div className="pt-6 border-t border-white/5">
                        <div className="text-[10px] text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Terminal size={12}/> Error Log</div>
                        <pre className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[11px] text-rose-300 font-mono whitespace-pre-wrap">{submission.errorMessage}</pre>
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </div>
  );
}