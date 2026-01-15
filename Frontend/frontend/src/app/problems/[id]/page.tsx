"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Editor, { Monaco } from "@monaco-editor/react"; // Import Monaco type
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { 
    Play, Send, CheckCircle2, AlertCircle, 
    ChevronDown, Terminal, Code2, List, 
    ChevronLeft, Sparkles, Plus, Loader2
} from 'lucide-react';
import { cn, getErrorMessage } from '@/lib/utils';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from 'sonner';
import AIChatPanel from "@/components/workspace/AIChatPanel"; 
import RatingModal from "@/components/vault/RatingModal"; 
import SubmissionModal from "@/components/workspace/SubmissionModal";
import { Button } from '@/components/ui/button';

const BOILERPLATES: Record<string, string> = {
  javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar findMax = function(nums) {\n    // Write code here\n};`,
  python: `class Solution:\n    def findMax(self, nums: List[int]) -> int:\n        # Write code here`,
  cpp: `class Solution {\npublic:\n    int findMax(vector<int>& nums) {\n        // Write code here\n    }\n};`,
  java: `class Solution {\n    public int findMax(int[] nums) {\n        // Write code here\n    }\n}`
};

export default function Workspace() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReviewMode = searchParams.get('review') === 'true';
  
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState("javascript");
  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const [output, setOutput] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "submitting">("idle");
  const [problem, setProblem] = useState<any>(null);
  
  const [consoleTab, setConsoleTab] = useState<'testcase' | 'result'>('testcase');
  const [testCases, setTestCases] = useState<string[]>([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // --- THE THEME ENGINE ---
  const handleEditorWillMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('zeroth-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#09090b', // Exact Match to your UI
        'editor.lineHighlightBackground': '#ffffff05',
        'editorLineNumber.foreground': '#525252',
        'editor.selectionBackground': '#3b82f633',
        'editor.inactiveSelectionBackground': '#3b82f611',
      }
    });
  };

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data } = await api.get(`/problem/fetchProblemById/${id}`);
        setProblem(data);
        const defaultCode = data.startCode?.find((c:any) => c.language === language)?.initialCode;
        setCode(defaultCode || BOILERPLATES[language]);
        setTestCases(data.visibleTestCases?.map((tc: any) => tc.input) || [""]);
      } catch (e) {
        toast.error("Module connection failed.");
      }
    };
    if(id) fetchProblem();
  }, [id]);

  const { data: submissions, refetch: refetchSubmissions } = useQuery({
    queryKey: ['submissions', id],
    queryFn: async () => (await api.get(`/problem/fetchSubmittedProblem?pid=${id}`)).data,
    enabled: activeTab === 'submissions'
  });

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const specificStartCode = problem?.startCode?.find((c: any) => c.language === newLang)?.initialCode;
    setCode(specificStartCode || BOILERPLATES[newLang]);
  };

  const handleRun = async () => {
    setStatus("running");
    setConsoleTab('result');
    try {
      const { data } = await api.post(`/submission/run/${id}`, { 
          code, language, input: testCases[activeTestCase] 
      });
      setOutput(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatus("idle");
    }
  };

  const handleSubmit = async () => {
    setStatus("submitting");
    try {
      const { data } = await api.post(`/submission/submit/${id}`, { code, language });
      if(data.status === 'accepted') {
          toast.success("Verification Complete");
          if (isReviewMode || data.inVault) setShowRatingModal(true);
      } else toast.error("Verification Failed");
      
      setOutput(data.errorDetails ? [data.errorDetails] : [{ status: data.status, testCase: "Final" }]);
      setConsoleTab('result');
      refetchSubmissions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatus("idle");
    }
  };

  if (!problem) return <div className="h-screen bg-[#050505] flex items-center justify-center font-mono text-xs tracking-widest animate-pulse text-neutral-600">LOADING_KERNEL_ASSETS...</div>;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#050505] overflow-hidden">
      {showRatingModal && <RatingModal onRate={async (q) => {
          await api.post("/mastery/review", { problemId: id, quality: q });
          setShowRatingModal(false);
          router.push("/vault");
      }} />}
      
      <SubmissionModal isOpen={showSubmissionModal} onClose={() => setShowSubmissionModal(false)} submission={selectedSubmission} />

      <div className="h-12 border-b border-white/5 bg-[#0A0A0A] flex items-center px-4 justify-between shrink-0">
         <div className="flex items-center gap-4">
             <button onClick={() => router.push('/problems')} className="p-1.5 hover:bg-white/5 rounded-md text-neutral-400 hover:text-white transition-all"><ChevronLeft size={16} /></button>
             <div className="h-4 w-[1px] bg-white/10" />
             <h1 className="text-sm font-medium text-white">{problem.title}</h1>
         </div>
         <button onClick={() => setShowAI(!showAI)} className={cn("flex items-center gap-2 px-3 py-1 rounded text-xs transition-all", showAI ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]" : "text-neutral-500 hover:text-white")}><Sparkles size={14}/> AI Copilot</button>
      </div>

      <PanelGroup direction="horizontal" className="flex-1">
        
        {/* PANEL 1: CONTENT */}
        <Panel defaultSize={30} minSize={20} className="flex flex-col border-r border-white/5 bg-black">
          <div className="flex items-center h-10 border-b border-white/5 px-2 bg-[#09090b]">
            <button onClick={() => setActiveTab('description')} className={cn("px-4 h-full text-[11px] font-mono uppercase tracking-wider transition-all", activeTab === 'description' ? "text-accent border-b-2 border-accent" : "text-neutral-500")}>Description</button>
            <button onClick={() => setActiveTab('submissions')} className={cn("px-4 h-full text-[11px] font-mono uppercase tracking-wider transition-all", activeTab === 'submissions' ? "text-accent border-b-2 border-accent" : "text-neutral-500")}>Submissions</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {activeTab === 'description' ? (
                <div className="space-y-8">
                    <div className="prose prose-invert prose-sm max-w-none text-neutral-300">
                        <p className="leading-relaxed text-sm">{problem.description}</p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Example Data</h3>
                        {problem.visibleTestCases?.map((tc: any, i: number) => (
                            <div key={i} className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4 font-mono text-[11px]">
                                <div className="text-accent mb-2">CASE {i+1}</div>
                                <div className="grid grid-cols-[60px_1fr] gap-2"><span className="text-neutral-600">INPUT</span><span className="text-white bg-white/5 px-2 py-0.5 rounded">{tc.input}</span></div>
                                <div className="grid grid-cols-[60px_1fr] gap-2 mt-1"><span className="text-neutral-600">OUTPUT</span><span className="text-emerald-400 bg-emerald-400/5 px-2 py-0.5 rounded">{tc.output}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {submissions?.map((sub: any) => (
                        <div key={sub._id} onClick={() => { setSelectedSubmission(sub); setShowSubmissionModal(true); }} className="p-4 hover:bg-white/[0.02] cursor-pointer flex justify-between items-center group transition-all">
                            <div className={cn("text-[10px] font-bold uppercase tracking-widest", sub.status === 'accepted' ? 'text-emerald-500' : 'text-rose-500')}>{sub.status}</div>
                            <div className="text-[10px] text-neutral-600 font-mono">{new Date(sub.createdAt).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-white/5 hover:bg-accent/50" />

        {/* CENTER PANEL: IDE */}
        <Panel defaultSize={showAI ? 45 : 70} minSize={30}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} className="flex flex-col bg-[#09090b]">
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#0A0A0A]">
                 <div className="flex items-center gap-4">
                    <Code2 size={14} className="text-neutral-500" />
                    <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} className="bg-transparent text-xs text-neutral-300 outline-none cursor-pointer">
                        <option value="javascript" className="bg-[#111]">JavaScript</option>
                        <option value="cpp" className="bg-[#111]">C++</option>
                        <option value="python" className="bg-[#111]">Python</option>
                        <option value="java" className="bg-[#111]">Java</option>
                    </select>
                 </div>
                 <div className="flex gap-2">
                    <Button onClick={handleRun} disabled={status !== "idle"} size="sm" variant="outline" className="h-7 px-3 bg-white/5 text-[10px] uppercase font-bold tracking-widest">
                        {status === 'running' ? <Loader2 size={12} className="animate-spin"/> : <Play size={10} fill="currentColor" />} Run
                    </Button>
                    <Button onClick={handleSubmit} disabled={status !== "idle"} size="sm" className="h-7 px-3 bg-blue-600 hover:bg-blue-500 text-[10px] uppercase font-bold tracking-widest shadow-lg shadow-blue-900/20">
                        {status === 'submitting' ? <Loader2 size={12} className="animate-spin"/> : <Send size={10} />} Submit
                    </Button>
                 </div>
              </div>
              
              {/* FIXED EDITOR CONTAINER */}
              <div className="flex-1 bg-[#09090b] relative">
                <Editor 
                    height="100%" 
                    theme="zeroth-dark" // Now registered via beforeMount
                    beforeMount={handleEditorWillMount} // This is the sync fix
                    language={language === 'cpp' ? 'cpp' : language} 
                    value={code} 
                    onChange={(v) => setCode(v || "")} 
                    options={{ 
                        fontSize: 14, 
                        fontFamily: 'var(--font-mono)', 
                        minimap: { enabled: false }, 
                        padding: { top: 20 }, 
                        scrollBeyondLastLine: false,
                        automaticLayout: true
                    }} 
                />
              </div>
            </Panel>

            <PanelResizeHandle className="h-1 bg-white/5 hover:bg-accent/50" />

            {/* CONSOLE */}
            <Panel defaultSize={30} className="flex flex-col bg-[#050505]">
                <div className="h-9 border-b border-white/5 flex items-center px-4 bg-white/[0.02] gap-6">
                    <button onClick={() => setConsoleTab('testcase')} className={cn("text-[10px] font-mono uppercase pb-1 border-b-2 transition-all", consoleTab === 'testcase' ? "border-accent text-white" : "border-transparent text-neutral-600")}>Testcase</button>
                    <button onClick={() => setConsoleTab('result')} className={cn("text-[10px] font-mono uppercase pb-1 border-b-2 transition-all", consoleTab === 'result' ? "border-accent text-white" : "border-transparent text-neutral-600")}>Result</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
                    {consoleTab === 'testcase' ? (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                {testCases.map((_, i) => (
                                    <button key={i} onClick={() => setActiveTestCase(i)} className={cn("px-3 py-1 rounded text-[10px] border transition-all", activeTestCase === i ? "bg-white/10 text-white border-white/20" : "text-neutral-600 border-transparent")}>Case {i + 1}</button>
                                ))}
                                <button onClick={() => setTestCases([...testCases, ""])} className="p-1 text-neutral-600 hover:text-white"><Plus size={14}/></button>
                            </div>
                            <textarea value={testCases[activeTestCase]} onChange={(e) => { const n = [...testCases]; n[activeTestCase] = e.target.value; setTestCases(n); }} className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white h-20 outline-none focus:border-accent resize-none" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {status === 'running' ? <div className="text-accent animate-pulse flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Syncing Vectors...</div> : output.length === 0 ? <div className="text-neutral-700 italic">No output. Execution required.</div> : output.map((res, i) => (
                                <div key={i} className="animate-in fade-in slide-in-from-bottom-2">
                                    <div className={cn("font-bold text-xs mb-2", res.statusId === 3 ? "text-emerald-500" : "text-rose-500")}>{res.status.toUpperCase()}</div>
                                    <div className="space-y-1">
                                        <div className="grid grid-cols-[80px_1fr] gap-2"><span className="text-neutral-600 uppercase text-[9px]">Actual</span><span className="text-white bg-white/5 px-2 py-1 rounded">{res.actual || "null"}</span></div>
                                        <div className="grid grid-cols-[80px_1fr] gap-2"><span className="text-neutral-600 uppercase text-[9px]">Expected</span><span className="text-emerald-500/50 bg-emerald-500/5 px-2 py-1 rounded">{res.expected}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Panel>
          </PanelGroup>
        </Panel>

        {/* PANEL 3: AI COPILOT */}
        {showAI && (
            <>
                <PanelResizeHandle className="w-1 bg-white/5 hover:bg-purple-500/50 transition-all" />
                <Panel defaultSize={25} minSize={20}>
                    <AIChatPanel code={code} language={language} problem={problem} onClose={() => setShowAI(false)} />
                </Panel>
            </>
        )}
      </PanelGroup>
    </div>
  );
}