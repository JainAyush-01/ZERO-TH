"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor, { useMonaco } from "@monaco-editor/react";
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { 
    Play, Send, CheckCircle2, AlertCircle, Clock, 
    ChevronDown, Terminal, Code2, List, 
    ChevronLeft, Check, X, History, RefreshCcw, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from 'sonner';
import AIChatPanel from "@/components/workspace/AIChatPanel"; // Import the AI Panel

export default function Workspace() {
  const { id } = useParams();
  const router = useRouter();
  
  // --- STATE ---
  const [code, setCode] = useState<string>("// Loading...");
  const [language, setLanguage] = useState("javascript");
  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const [output, setOutput] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "submitting">("idle");
  const [problem, setProblem] = useState<any>(null);
  
  // Error & Loading States
  const [error, setError] = useState<string | null>(null);
  
  // AI States
  const [showAI, setShowAI] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  const monaco = useMonaco();

  // 1. Fetch Problem Data
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        if (!id) return;
        const { data } = await api.get(`/problem/fetchProblemById/${id}`);
        setProblem(data);
        
        // Load default code
        const defaultCode = data.startCode.find((c:any) => c.language === language)?.initialCode;
        if(defaultCode) setCode(defaultCode);
        
      } catch (e: any) {
        console.error("Fetch Error:", e);
        setError(e.response?.data?.message || e.message || "Failed to connect to server");
      }
    };
    fetchProblem();
  }, [id, language]);

  // 2. Fetch Submissions
  const { data: submissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => {
        if (!id) return [];
        try {
            const { data } = await api.get(`/problem/fetchSubmittedProblem?pid=${id}`);
            return Array.isArray(data) ? data : [];
        } catch (e) { return []; }
    },
    enabled: activeTab === 'submissions'
  });

  // 3. Monaco Theme
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('nexus-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#09090b', 
          'editor.lineHighlightBackground': '#ffffff08',
          'editorLineNumber.foreground': '#525252',
        }
      });
      monaco.editor.setTheme('nexus-dark');
    }
  }, [monaco]);

  // --- ACTIONS ---

  const handleRun = async () => {
    setStatus("running");
    setLastError(undefined); // Clear previous error context
    try {
      const { data } = await api.post(`/submission/run/${id}`, { code, language });
      setOutput(data);
      
      // Capture error for AI
      const failed = data.find((r: any) => r.statusId !== 3);
      if (failed) setLastError(failed.error || "Wrong Answer or Runtime Error");

    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Execution failed";
      setOutput([{ statusId: 13, status: "Internal Error", error: errMsg }]);
      setLastError(errMsg);
    } finally {
      setStatus("idle");
    }
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    setLastError(undefined);
    try {
      const { data } = await api.post(`/submission/submit/${id}`, { code, language });
      
      if(data.status === 'accepted') toast.success("Solution Accepted!");
      else toast.error(`Solution Rejected: ${data.status}`);

      if (data.errorDetails) {
          setOutput([data.errorDetails]);
          setLastError(data.errorDetails.error || "Hidden Test Case Failed");
      } else {
          setOutput([{ 
            statusId: data.status === "accepted" ? 3 : 4,
            status: data.status.toUpperCase(),
            testCase: `Passed: ${data.testCasesPassed}/${data.testCasesTotal}`, 
            runtime: data.runtime,
            error: data.errorMessage 
          }]);
          if (data.status !== "accepted") setLastError(data.errorMessage);
      }
      
      if(activeTab === 'submissions') refetchSubmissions();
    } catch (err: any) {
      toast.error("Submission failed.");
      setLastError(err.message);
    } finally {
      setStatus("idle");
    }
  };

  // --- RENDER ERROR STATE ---
  if (error) return (
    <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-6">
        <div className="bg-red-500/10 p-4 rounded-full">
            <AlertCircle size={48} className="text-red-500" />
        </div>
        <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">Module Load Error</h2>
            <p className="text-neutral-400 font-mono text-sm bg-white/5 px-4 py-2 rounded border border-white/10">
                Error: {error}
            </p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 transition-colors text-sm font-medium">
                <RefreshCcw size={14} /> Retry Connection
            </button>
            <button onClick={() => router.push('/problems')} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm">
                Return to Modules
            </button>
        </div>
    </div>
  );

  // --- RENDER LOADING STATE ---
  if (!problem) return (
    <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-sm tracking-widest text-neutral-500 animate-pulse">
            Establishing Link...
        </span>
    </div>
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#050505] overflow-hidden">
        
      {/* HEADER */}
      <div className="h-12 border-b border-white/5 bg-[#0A0A0A] flex items-center px-4 justify-between shrink-0">
         <div className="flex items-center gap-4">
             <button onClick={() => router.push('/problems')} className="p-1.5 hover:bg-white/5 rounded-md text-neutral-400 hover:text-white transition-colors">
                 <ChevronLeft size={16} />
             </button>
             <div className="h-4 w-[1px] bg-white/10" />
             <h1 className="text-sm font-medium text-white truncate">{problem.title}</h1>
         </div>
         {/* Shortcuts Hint */}
         <div className="hidden md:flex items-center gap-4 text-[10px] text-neutral-600 font-mono">
             <span>Run: Ctrl + Enter</span>
             <span>AI Assistant: {showAI ? 'Active' : 'Offline'}</span>
         </div>
      </div>

      {/* MAIN WORKSPACE */}
      <PanelGroup direction="horizontal" className="flex-1">
        
        {/* LEFT PANEL: Description / Submissions */}
        <Panel defaultSize={40} minSize={30} className="flex flex-col border-r border-white/5 bg-[#050505]">
          <div className="flex items-center h-10 border-b border-white/5 px-2">
            {[ { id: 'description', icon: List, label: 'Description' }, { id: 'submissions', icon: History, label: 'Submissions' } ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex items-center gap-2 px-4 h-full text-xs font-medium border-b-[2px] transition-all", activeTab === tab.id ? "border-accent text-white bg-white/[0.02]" : "border-transparent text-neutral-500 hover:text-neutral-300")}>
                    <tab.icon size={14} /> {tab.label}
                </button>
            ))}
          </div>

          {activeTab === 'description' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">{problem.title}</h2>
                    <div className="flex gap-2">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-mono border uppercase tracking-wider", problem.difficulty === 'easy' ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : problem.difficulty === 'medium' ? "text-amber-400 border-amber-400/20 bg-amber-400/5" : "text-rose-400 border-rose-400/20 bg-rose-400/5")}>
                            {problem.difficulty}
                        </span>
                    </div>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-neutral-300"><p>{problem.description}</p></div>
                <div className="space-y-4">
                    <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Examples</h3>
                    {problem.visibleTestCases.map((tc: any, i:number) => (
                        <div key={i} className="bg-[#0A0A0A] rounded-lg border border-white/5 overflow-hidden">
                             <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] text-[10px] text-neutral-500 font-mono uppercase">Case {i + 1}</div>
                             <div className="p-4 font-mono text-sm space-y-2">
                                 <div><span className="text-neutral-500 block text-xs mb-1">Input</span><div className="text-white bg-black/20 p-2 rounded border border-white/5">{tc.input}</div></div>
                                 <div><span className="text-neutral-500 block text-xs mb-1">Output</span><div className="text-accent/90 bg-accent/5 p-2 rounded border border-accent/10">{tc.output}</div></div>
                             </div>
                        </div>
                    ))}
                </div>
              </div>
          )}

          {activeTab === 'submissions' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                  {submissions?.length === 0 ? <div className="p-8 text-center text-neutral-500 text-sm">No submissions found.</div> : (
                      <div className="divide-y divide-white/5">
                          {submissions?.slice().reverse().map((sub: any, i:number) => (
                              <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                                  <div className="flex items-center gap-3">
                                      {sub.status === 'accepted' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                                      <div>
                                          <div className={cn("text-sm font-medium capitalize", sub.status === 'accepted' ? "text-emerald-400" : "text-rose-400")}>{sub.status}</div>
                                          <div className="text-xs text-neutral-500 font-mono mt-0.5">{new Date(sub.createdAt).toLocaleString()}</div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-xs text-neutral-400 font-mono">{sub.runtime}ms</div>
                                      <div className="text-[10px] text-neutral-600 uppercase">{sub.language}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}
        </Panel>

        <PanelResizeHandle className="w-2 bg-[#000] hover:bg-accent/20 transition-colors border-l border-r border-white/5 flex items-center justify-center group"><div className="h-8 w-1 rounded-full bg-white/20 group-hover:bg-accent" /></PanelResizeHandle>

        {/* RIGHT PANEL: Nested Split (Editor & AI) */}
        <Panel defaultSize={60} minSize={30}>
          <PanelGroup direction="horizontal"> 
            
            {/* COLUMN 1: Editor & Console */}
            <Panel defaultSize={showAI ? 70 : 100} minSize={50} className="flex flex-col">
                <PanelGroup direction="vertical">
                    
                    {/* EDITOR */}
                    <Panel defaultSize={70} minSize={20} className="flex flex-col bg-[#09090b]">
                        {/* Toolbar */}
                        <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#0A0A0A] shrink-0">
                            <div className="flex items-center gap-3">
                                <Code2 size={14} className="text-neutral-500" />
                                <div className="relative">
                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="appearance-none bg-[#09090b] border border-white/10 rounded-md py-1 pl-2 pr-8 text-xs text-neutral-300 focus:border-accent focus:outline-none hover:border-white/20 transition-colors">
                                        <option value="javascript">JavaScript</option><option value="cpp">C++</option><option value="python">Python</option><option value="java">Java</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {/* AI TOGGLE BUTTON */}
                                <button 
                                    onClick={() => setShowAI(!showAI)} 
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                                        showAI 
                                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                                            : "bg-white/5 text-neutral-400 border-white/5 hover:text-white"
                                    )}
                                >
                                    <Sparkles size={12} /> AI
                                </button>

                                <button onClick={handleRun} disabled={status !== "idle"} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-medium transition-all border border-white/5"><Play size={12} className={status === "running" ? "animate-spin" : ""} /> Run</button>
                                <button onClick={handleSubmit} disabled={status !== "idle"} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-accent hover:bg-accent/90 text-white text-xs font-medium transition-all shadow-lg shadow-accent/20">{status === "submitting" ? <Clock size={12} className="animate-spin" /> : <Send size={12} />} Submit</button>
                            </div>
                        </div>
                        
                        <div className="flex-1 relative">
                            <Editor height="100%" theme="nexus-dark" language={language === 'cpp' ? 'cpp' : language} value={code} onChange={(val) => setCode(val || "")} options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'var(--font-mono)', lineHeight: 24, padding: { top: 20 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: "smooth", renderLineHighlight: "all" }} />
                        </div>
                    </Panel>

                    <PanelResizeHandle className="h-2 bg-[#000] hover:bg-accent/20 transition-colors border-t border-b border-white/5 flex items-center justify-center group cursor-row-resize"><div className="w-8 h-1 rounded-full bg-white/20 group-hover:bg-accent" /></PanelResizeHandle>

                    {/* CONSOLE */}
                    <Panel defaultSize={30} minSize={10} className="flex flex-col bg-[#050505]">
                        <div className="h-9 border-b border-white/5 flex items-center px-4 bg-white/[0.02] justify-between shrink-0">
                            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-2"><Terminal size={12} /> Execution Console</span>
                            {output.length > 0 && <button onClick={() => setOutput([])} className="text-[10px] text-neutral-500 hover:text-white transition-colors">Clear</button>}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
                            {status !== "idle" ? <div className="flex items-center gap-2 text-neutral-500"><div className="w-2 h-2 bg-accent rounded-full animate-pulse" />Processing...</div> : output.length === 0 ? <div className="text-neutral-700 italic">Run code to see output.</div> : (
                                <div className="space-y-4">
                                    {output.map((res, idx) => (
                                        <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300 border-b border-white/5 pb-4 mb-4 last:border-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                {res.statusId === 3 ? <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 text-[11px] font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Accepted</div> : <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20 text-[11px] font-bold uppercase tracking-wider"><AlertCircle size={12} /> {res.status}</div>}
                                                {res.runtime > 0 && <span className="text-neutral-500 text-[10px] font-mono">{res.runtime}ms</span>}
                                                {res.testCase && <span className="text-neutral-500 text-[10px] font-mono">Test Case: {res.testCase}</span>}
                                            </div>
                                            {res.error && <div className="text-rose-300/90 bg-rose-950/20 p-3 rounded-md border border-rose-500/10 font-mono text-[11px] whitespace-pre-wrap mb-3">{res.error}</div>}
                                            {res.input && <div className="space-y-3 font-mono text-[11px]"><div className="grid grid-cols-[80px_1fr] gap-2"><span className="text-neutral-500 uppercase tracking-wider text-[10px] pt-1">Input</span><div className="bg-[#111] p-2 rounded border border-white/5 text-neutral-300 whitespace-pre-wrap">{res.input}</div></div>{res.expected && <div className="grid grid-cols-[80px_1fr] gap-2"><span className="text-neutral-500 uppercase tracking-wider text-[10px] pt-1">Expected</span><div className="bg-[#111] p-2 rounded border border-white/5 text-emerald-400/90 whitespace-pre-wrap">{res.expected}</div></div>}<div className="grid grid-cols-[80px_1fr] gap-2"><span className="text-neutral-500 uppercase tracking-wider text-[10px] pt-1">Actual</span><div className="bg-[#111] p-2 rounded border border-white/5 text-white whitespace-pre-wrap">{res.actual || <span className="text-neutral-600 italic">No output</span>}</div></div></div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>
                </PanelGroup>
            </Panel>

            {/* COLUMN 2: AI PANEL (CONDITIONAL) */}
            {showAI && (
                <>
                    <PanelResizeHandle className="w-1 bg-[#000] hover:bg-purple-500/50 transition-colors border-l border-white/5" />
                    <Panel defaultSize={30} minSize={20} className="bg-[#050505]">
                        <AIChatPanel 
                            code={code} 
                            language={language}
                            problem={problem} 
                            lastError={lastError} 
                            onClose={() => setShowAI(false)} 
                        />
                    </Panel>
                </>
            )}

          </PanelGroup>
        </Panel>

      </PanelGroup>
    </div>
  );
}