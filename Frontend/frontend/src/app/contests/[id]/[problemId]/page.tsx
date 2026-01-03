"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor, { useMonaco } from "@monaco-editor/react";
import api from '@/lib/api';
import { 
    Play, Send, CheckCircle2, AlertCircle, Clock, 
    ChevronDown, Terminal, Code2, List, 
    ChevronLeft, Check, X, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from 'sonner';

export default function ContestWorkspace() {
  const { id: contestId, problemId } = useParams(); // Get both IDs
  const router = useRouter();
  
  // State
  const [code, setCode] = useState<string>("// Loading...");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "submitting">("idle");
  const [problem, setProblem] = useState<any>(null);
  
  const monaco = useMonaco();

  // 1. Fetch Problem Data
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data } = await api.get(`/problem/fetchProblemById/${problemId}`);
        setProblem(data);
        const defaultCode = data.startCode.find((c:any) => c.language === language)?.initialCode;
        if(defaultCode) setCode(defaultCode);
      } catch (e) {
        toast.error("Failed to load problem data");
      }
    };
    if(problemId) fetchProblem();
  }, [problemId, language]);

  // 2. Monaco Theme
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

  // Actions
  const handleRun = async () => {
    setStatus("running");
    try {
      // Use standard run endpoint for testing
      const { data } = await api.post(`/submission/run/${problemId}`, { code, language });
      setOutput(data); 
    } catch (err) {
      setOutput([{ statusId: 13, status: "Internal Error", error: "Execution failed" }]);
    } finally {
      setStatus("idle");
    }
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    try {
      // 🚀 CRITICAL CHANGE: Submit to CONTEST Endpoint
      const { data } = await api.post(`/contest/submit`, { 
          contestId,
          problemId,
          code, 
          language 
      });
      
      if(data.status === 'Accepted') {
          toast.success(`Correct! Points Awarded: ${data.score}`);
      } else {
          toast.error("Wrong Answer. Time Penalty Applied.");
      }

      if (data.errorDetails) {
          setOutput([data.errorDetails]);
      } else {
          setOutput([{ 
            statusId: data.status === 'Accepted' ? 3 : 4,
            status: data.status.toUpperCase(),
            testCase: "CONTEST JUDGE", 
            runtime: 0, // Contest endpoint might not return full runtime array yet
            error: data.status !== 'Accepted' ? "Hidden Contest Logic" : ""
          }]);
      }

    } catch (err: any) {
      toast.error(err.response?.data || "Submission failed.");
    } finally {
      setStatus("idle");
    }
  };

  if (!problem) return <div className="h-screen bg-[#050505] text-white flex items-center justify-center">Loading Contest Module...</div>;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#050505] overflow-hidden">
        
      {/* HEADER: Back to Arena */}
      <div className="h-12 border-b border-white/5 bg-[#0A0A0A] flex items-center px-4 justify-between shrink-0">
         <div className="flex items-center gap-4">
             <button onClick={() => router.push(`/contests/${contestId}`)} className="p-1.5 hover:bg-white/5 rounded-md text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
                 <ArrowLeft size={16} /> <span className="text-xs font-mono">BACK TO ARENA</span>
             </button>
             <div className="h-4 w-[1px] bg-white/10" />
             <h1 className="text-sm font-medium text-white truncate">{problem.title}</h1>
         </div>
         
         <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-500 text-xs font-mono uppercase animate-pulse">
             Contest Mode
         </div>
      </div>

      {/* MAIN WORKSPACE */}
      <PanelGroup direction="horizontal" className="flex-1">
        
        {/* LEFT PANEL: Description Only (No Submissions Tab in Contest) */}
        <Panel defaultSize={40} minSize={30} className="flex flex-col border-r border-white/5 bg-[#050505]">
          <div className="flex items-center h-10 border-b border-white/5 px-2">
             <button className="flex items-center gap-2 px-4 h-full text-xs font-medium border-b-[2px] border-accent text-white bg-white/[0.02]">
                <List size={14} /> Description
             </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-4">{problem.title}</h2>
                <div className="flex gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 uppercase tracking-wider">
                        {problem.difficulty}
                    </span>
                </div>
            </div>

            <div className="prose prose-invert prose-sm max-w-none text-neutral-300">
                <p>{problem.description}</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Examples</h3>
                {problem.visibleTestCases.map((tc: any, i:number) => (
                    <div key={i} className="bg-[#0A0A0A] rounded-lg border border-white/5 overflow-hidden">
                            <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02] text-[10px] text-neutral-500 font-mono uppercase">
                            Case {i + 1}
                            </div>
                            <div className="p-4 font-mono text-sm space-y-2">
                                <div>
                                <span className="text-neutral-500 block text-xs mb-1">Input</span>
                                <div className="text-white bg-black/20 p-2 rounded border border-white/5">{tc.input}</div>
                                </div>
                                <div>
                                <span className="text-neutral-500 block text-xs mb-1">Output</span>
                                <div className="text-accent/90 bg-accent/5 p-2 rounded border border-accent/10">{tc.output}</div>
                                </div>
                            </div>
                    </div>
                ))}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-[#000] hover:bg-accent/20 transition-colors border-l border-r border-white/5 flex items-center justify-center group">
            <div className="h-8 w-1 rounded-full bg-white/20 group-hover:bg-accent" />
        </PanelResizeHandle>

        {/* RIGHT PANEL: Editor & Console */}
        <Panel defaultSize={60} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={20} className="flex flex-col bg-[#09090b]">
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#0A0A0A] shrink-0">
                 <div className="flex items-center gap-3">
                    <Code2 size={14} className="text-neutral-500" />
                    <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-[#09090b] border border-white/10 rounded-md py-1 pl-2 pr-8 text-xs text-neutral-300 focus:border-accent focus:outline-none"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="cpp">C++</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                    </select>
                 </div>

                 <div className="flex items-center gap-2">
                    <button onClick={handleRun} disabled={status !== "idle"} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-medium border border-white/5">
                        <Play size={12} className={status === "running" ? "animate-spin" : ""} /> Run
                    </button>
                    <button onClick={handleSubmit} disabled={status !== "idle"} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-medium shadow-lg shadow-yellow-500/20">
                        {status === "submitting" ? <Clock size={12} className="animate-spin" /> : <Send size={12} />} Submit
                    </button>
                 </div>
              </div>

              <div className="flex-1 relative">
                <Editor
                  height="100%"
                  theme="nexus-dark"
                  language={language === 'cpp' ? 'cpp' : language}
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'var(--font-mono)', padding: { top: 20 } }}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="h-2 bg-[#000] hover:bg-accent/20 transition-colors border-t border-b border-white/5 flex items-center justify-center group cursor-row-resize">
                <div className="w-8 h-1 rounded-full bg-white/20 group-hover:bg-accent" />
            </PanelResizeHandle>

            <Panel defaultSize={30} minSize={10} className="flex flex-col bg-[#050505]">
               <div className="h-9 border-b border-white/5 flex items-center px-4 bg-white/[0.02] justify-between shrink-0">
                    <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                        <Terminal size={12} /> Contest Output
                    </span>
                    {output.length > 0 && (
                        <button onClick={() => setOutput([])} className="text-[10px] text-neutral-500 hover:text-white transition-colors">Clear</button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
                    {status !== "idle" ? (
                        <div className="flex items-center gap-2 text-neutral-500">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                            Evaluating on Contest Server...
                        </div>
                    ) : output.length === 0 ? (
                        <div className="text-neutral-700 italic">Run code to see output.</div>
                    ) : (
                        <div className="space-y-4">
                            {output.map((res, idx) => (
                                <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-300 border-b border-white/5 pb-4 mb-4 last:border-0">
                                    <div className="flex items-center gap-3 mb-3">
                                        {res.statusId === 3 ? 
                                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 text-[11px] font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Accepted</div> : 
                                            <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20 text-[11px] font-bold uppercase tracking-wider"><AlertCircle size={12} /> {res.status}</div>
                                        }
                                    </div>
                                    {res.error && <div className="text-rose-300/90 bg-rose-950/20 p-3 rounded-md border border-rose-500/10 font-mono text-[11px] whitespace-pre-wrap">{res.error}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Panel>
          </PanelGroup>
        </Panel>

      </PanelGroup>
    </div>
  );
}