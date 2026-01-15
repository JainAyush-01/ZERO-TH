"use client";
import { useState, useEffect } from 'react';
import Editor, { useMonaco } from "@monaco-editor/react";
import api from '@/lib/api';
import { Play, Zap, Trash2, ArrowLeft, Loader2, Keyboard, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const BOILERPLATES: Record<string, string> = {
  javascript: `// JavaScript Playground\nconsole.log('Hello ZEROTH');`,
  python: `# Python Playground\nname = input()\nprint(f"Hello {name}")`,
  cpp: `// C++ Playground\n#include <iostream>\nusing namespace std;\n\nint main() {\n    string s;\n    cin >> s;\n    cout << "Hello " << s << endl;\n    return 0;\n}`,
  java: `// Java Playground\nimport java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.next();\n        System.out.println("Hello " + s);\n    }\n}`
};

export default function Playground() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(BOILERPLATES["javascript"]);
  const [stdin, setStdin] = useState(""); // <--- NEW: State for input
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('nexus-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#050505',
          'editor.lineHighlightBackground': '#ffffff08',
        }
      });
      monaco.editor.setTheme('nexus-dark');
    }
  }, [monaco]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang] || "// Code goes here");
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      // 🚀 PASSING STDIN TO BACKEND
      const { data } = await api.post('/submission/playground', { 
        code, 
        language,
        stdin 
      });
      setOutput(data.output || data.stdout || data.stderr || "Code executed with no output.");
    } catch (err) {
      toast.error("Execution failed. Check network.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-6">
            <Link href="/" className="text-neutral-500 hover:text-white transition-colors">
                <ArrowLeft size={18} />
            </Link>
            <span className="text-sm font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" /> Playground
            </span>
            <select 
                value={language} 
                onChange={handleLanguageChange}
                className="bg-[#111] border border-white/10 rounded px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-accent"
            >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
            </select>
        </div>
        <button 
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold tracking-wide transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
            {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />} 
            {isRunning ? "Compiling..." : "Run Code"}
        </button>
      </div>

      {/* Main Workspace Group */}
      <PanelGroup direction="horizontal" className="flex-1">
        
        {/* LEFT: EDITOR */}
        <Panel defaultSize={60} minSize={30} className="relative border-r border-white/5 bg-[#050505]">
            <Editor
                height="100%"
                theme="nexus-dark"
                language={language === 'cpp' ? 'cpp' : language}
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: 'var(--font-mono)',
                    padding: { top: 24 },
                    scrollBeyondLastLine: false,
                    lineHeight: 22,
                }}
            />
        </Panel>

        <PanelResizeHandle className="w-1 bg-white/5 hover:bg-accent/50 transition-all" />

        {/* RIGHT: INPUT & OUTPUT SPLIT */}
        <Panel defaultSize={40} minSize={20}>
            <PanelGroup direction="vertical">
                
                {/* TOP: INPUT AREA */}
                <Panel defaultSize={40} minSize={10} className="flex flex-col bg-[#080808]">
                    <div className="h-10 border-b border-white/5 px-4 flex items-center gap-2 bg-white/[0.02]">
                        <Keyboard size={14} className="text-neutral-500" />
                        <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Input (Stdin)</span>
                    </div>
                    <textarea 
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        className="flex-1 p-4 bg-transparent text-neutral-300 font-mono text-sm resize-none outline-none placeholder:text-neutral-700"
                        placeholder="Type input here..."
                    />
                </Panel>

                <PanelResizeHandle className="h-1 bg-white/5 hover:bg-accent/50 transition-all" />

                {/* BOTTOM: OUTPUT AREA */}
                <Panel defaultSize={60} minSize={10} className="flex flex-col bg-[#050505]">
                    <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-neutral-500" />
                            <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">Output (Stdout)</span>
                        </div>
                        <button onClick={() => setOutput("")} className="text-neutral-600 hover:text-red-400 transition-colors">
                            <Trash2 size={14}/>
                        </button>
                    </div>
                    <pre className="flex-1 p-6 font-mono text-sm text-neutral-300 overflow-auto whitespace-pre-wrap leading-relaxed">
                        {output || <span className="text-neutral-800 italic">// Run code to generate output...</span>}
                    </pre>
                </Panel>

            </PanelGroup>
        </Panel>

      </PanelGroup>
    </div>
  );
}