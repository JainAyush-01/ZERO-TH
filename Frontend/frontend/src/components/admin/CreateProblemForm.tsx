"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Plus, Trash2, Code, TestTube, FileText, Eye, EyeOff, Lock, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreateProblemForm({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"meta" | "tests" | "code">("meta");
  const [loading, setLoading] = useState(false);

  // --- STATE ---
  // Added 'visibility' field here
  const [meta, setMeta] = useState({ 
      title: "", 
      description: "", 
      difficulty: "easy", 
      tags: "", 
      visibility: "public" // Default
  });
  
  const [visibleTests, setVisibleTests] = useState([{ input: "", output: "", explanation: "" }]);
  const [hiddenTests, setHiddenTests] = useState([{ input: "", output: "", explanation: "Hidden Case" }]);

  const [codeConfig, setCodeConfig] = useState({
    language: "cpp",
    driverCode: `#include <iostream>\n#include <vector>\n#include <string>\n#include "solution.cpp"\n\nusing namespace std;\n\nint main() {\n    // Driver logic here\n    return 0;\n}`,
    startCode: `class Solution {\npublic:\n    // Function signature\n};`,
    referenceSolution: `class Solution {\npublic:\n    // Complete solution\n};`
  });

  // --- ACTIONS ---
  const addTest = (type: 'visible' | 'hidden') => {
    const newCase = { input: "", output: "", explanation: "" };
    if(type === 'visible') setVisibleTests([...visibleTests, newCase]);
    else setHiddenTests([...hiddenTests, newCase]);
  };

  const removeTest = (type: 'visible' | 'hidden', idx: number) => {
    if(type === 'visible') setVisibleTests(visibleTests.filter((_, i) => i !== idx));
    else setHiddenTests(hiddenTests.filter((_, i) => i !== idx));
  };

  const updateTest = (type: 'visible' | 'hidden', idx: number, field: string, val: string) => {
    const updater = (prev: any[]) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item);
    if(type === 'visible') setVisibleTests(updater(visibleTests));
    else setHiddenTests(updater(hiddenTests));
  };

  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (!meta.title || !meta.description) return toast.error("Title and Description required");
    
    setLoading(true);
    
    const payload = {
        ...meta,
        // Backend expects 'contest' or 'private' to hide it from main list
        status: meta.visibility === 'public' ? 'published' : 'draft', 
        tags: meta.tags, 
        visibleTestCases: visibleTests,
        hiddenTestCases: hiddenTests,
        driverCode: [{ language: codeConfig.language, Code: codeConfig.driverCode }],
        startCode: [{ language: codeConfig.language, initialCode: codeConfig.startCode }],
        referenceSolution: [{ language: codeConfig.language, CompleteCode: codeConfig.referenceSolution }]
    };

    try {
        await api.post("/problem/create", payload);
        toast.success(`Module Created (${meta.visibility})`);
        onClose();
    } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || "Failed to inject module");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#09090b] border border-white/10 w-full max-w-4xl h-[90vh] flex flex-col rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#111]">
            <div>
                <h2 className="text-lg font-bold text-white">Inject New Module</h2>
                <p className="text-xs text-neutral-500">Define parameters, test vectors, and execution runtime.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-neutral-400"/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-[#09090b]">
            {[
                { id: "meta", icon: FileText, label: "Metadata" },
                { id: "tests", icon: TestTube, label: "Test Vectors" },
                { id: "code", icon: Code, label: "Runtime Config" },
            ].map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTab(t.id as any)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-4 text-xs font-medium uppercase tracking-wider transition-all border-b-2",
                        tab === t.id ? "border-accent text-white bg-white/5" : "border-transparent text-neutral-500 hover:text-neutral-300"
                    )}
                >
                    <t.icon size={14} /> {t.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#050505]">
            
            {/* 1. METADATA TAB */}
            {tab === 'meta' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-mono">Module Title</label>
                        <input className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none" 
                            value={meta.title} onChange={e => setMeta({...meta, title: e.target.value})} placeholder="e.g. Binary Search Tree Inversion" />
                    </div>
                    
                     <div className="grid grid-cols-2 gap-4">
                        {/* Difficulty - Added Icon for Alignment */}
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono flex items-center gap-2 h-4">
                                <BarChart2 size={12} /> Difficulty
                            </label>
                            <select className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none appearance-none"
                                value={meta.difficulty} onChange={e => setMeta({...meta, difficulty: e.target.value})}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        
                        {/* Visibility Mode */}
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono flex items-center gap-2 h-4">
                                {meta.visibility === 'public' ? <Eye size={12}/> : meta.visibility === 'contest' ? <Lock size={12}/> : <EyeOff size={12}/>}
                                Visibility Mode
                            </label>
                            <select 
                                className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none appearance-none"
                                value={meta.visibility} 
                                onChange={e => setMeta({...meta, visibility: e.target.value})}
                            >
                                <option value="public">Public (Visible to All)</option>
                                <option value="contest">Contest Only (Hidden)</option>
                                <option value="private">Private (Draft)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-mono">Tags (Enum)</label>
                        <input className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none" 
                            value={meta.tags} onChange={e => setMeta({...meta, tags: e.target.value})} placeholder="Array" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-mono">Description</label>
                        <textarea className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none min-h-[200px]" 
                            value={meta.description} onChange={e => setMeta({...meta, description: e.target.value})} placeholder="Detailed problem statement..." />
                    </div>
                </div>
            )}

            {/* 2. TEST CASES TAB (Same as before) */}
            {tab === 'tests' && (
                <div className="space-y-8 max-w-3xl mx-auto">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><TestTube size={16} className="text-emerald-500"/> Public Cases</h3>
                            <button onClick={() => addTest('visible')} className="text-xs flex items-center gap-1 text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded transition-colors"><Plus size={12}/> Add Case</button>
                        </div>
                        <div className="space-y-4">
                            {visibleTests.map((tc, i) => (
                                <div key={i} className="bg-[#111] border border-white/10 rounded-xl p-4 relative group">
                                    <button onClick={() => removeTest('visible', i)} className="absolute top-2 right-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <input className="bg-black/50 border border-white/10 rounded p-2 text-xs text-white" placeholder="Input" value={tc.input} onChange={e => updateTest('visible', i, 'input', e.target.value)} />
                                        <input className="bg-black/50 border border-white/10 rounded p-2 text-xs text-white" placeholder="Output" value={tc.output} onChange={e => updateTest('visible', i, 'output', e.target.value)} />
                                    </div>
                                    <input className="w-full bg-black/50 border border-white/10 rounded p-2 text-xs text-white" placeholder="Explanation" value={tc.explanation} onChange={e => updateTest('visible', i, 'explanation', e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><TestTube size={16} className="text-purple-500"/> Hidden Cases</h3>
                            <button onClick={() => addTest('hidden')} className="text-xs flex items-center gap-1 text-purple-400 hover:bg-purple-500/10 px-2 py-1 rounded transition-colors"><Plus size={12}/> Add Case</button>
                        </div>
                        <div className="space-y-4">
                            {hiddenTests.map((tc, i) => (
                                <div key={i} className="bg-[#111] border border-white/10 rounded-xl p-4 relative group">
                                    <button onClick={() => removeTest('hidden', i)} className="absolute top-2 right-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="bg-black/50 border border-white/10 rounded p-2 text-xs text-white" placeholder="Input" value={tc.input} onChange={e => updateTest('hidden', i, 'input', e.target.value)} />
                                        <input className="bg-black/50 border border-white/10 rounded p-2 text-xs text-white" placeholder="Output" value={tc.output} onChange={e => updateTest('hidden', i, 'output', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 3. CODE CONFIG TAB (Same as before) */}
            {tab === 'code' && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <div className="flex justify-end">
                        <select className="bg-[#111] border border-white/10 rounded-lg px-3 py-1 text-xs text-white outline-none"
                            value={codeConfig.language} onChange={e => setCodeConfig({...codeConfig, language: e.target.value})}>
                            <option value="cpp">C++</option><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono">Driver Code (Hidden)</label>
                            <textarea className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-xs font-mono text-neutral-300 focus:border-accent outline-none h-[200px]" 
                                value={codeConfig.driverCode} onChange={e => setCodeConfig({...codeConfig, driverCode: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-neutral-400 font-mono">User Start Code</label>
                            <textarea className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-xs font-mono text-neutral-300 focus:border-accent outline-none h-[200px]" 
                                value={codeConfig.startCode} onChange={e => setCodeConfig({...codeConfig, startCode: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-mono">Reference Solution</label>
                        <textarea className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-xs font-mono text-neutral-300 focus:border-accent outline-none h-[150px]" 
                            value={codeConfig.referenceSolution} onChange={e => setCodeConfig({...codeConfig, referenceSolution: e.target.value})} />
                    </div>
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="h-16 border-t border-white/10 bg-[#111] flex items-center justify-end px-6 gap-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-white text-black hover:bg-neutral-200">
                {loading ? "Injecting..." : "Inject Module"}
            </Button>
        </div>

      </div>
    </div>
  );
}