"use client";
import { useState, useEffect } from 'react';
import Editor, { useMonaco } from "@monaco-editor/react";
import api from '@/lib/api';
import { Play, Zap, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// 1. Define Boilerplates
const BOILERPLATES: Record<string, string> = {
  javascript: `// JavaScript Playground\nconsole.log('Hello ZEROTH');`,
  python: `# Python Playground\nprint("Hello ZEROTH")`,
  cpp: `// C++ Playground\n#include <iostream>\n\nint main() {\n    std::cout << "Hello ZEROTH" << std::endl;\n    return 0;\n}`,
  java: `// Java Playground\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello ZEROTH");\n    }\n}`
};

export default function Playground() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(BOILERPLATES["javascript"]);
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

  // 2. Handle Language Change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(BOILERPLATES[newLang] || "// Code goes here");
  };

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const { data } = await api.post('/submission/playground', { code, language });
      setOutput(data.output || data.stdout || data.stderr);
    } catch (err) {
      toast.error("Execution failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
            <Link href="/" className="text-neutral-500 hover:text-white transition-colors">
                <ArrowLeft size={18} />
            </Link>
            <span className="text-sm font-bold text-white flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" /> Playground
            </span>
            <select 
                value={language} 
                onChange={handleLanguageChange} // <--- UPDATED HANDLER
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
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold tracking-wide transition-all disabled:opacity-50"
        >
            {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />} 
            {isRunning ? "Running..." : "Run Code"}
        </button>
      </div>

      {/* Editor & Console Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 relative border-r border-white/5">
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
                }}
            />
        </div>
        
        <div className="h-[30%] md:h-full md:w-[40%] bg-[#080808] flex flex-col border-t md:border-t-0 border-white/5">
            <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-white/[0.02]">
                <span className="text-xs text-neutral-500 font-mono uppercase tracking-wider">Standard Output</span>
                <button onClick={() => setOutput("")} className="text-neutral-600 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>
            </div>
            <pre className="flex-1 p-6 font-mono text-sm text-neutral-300 overflow-auto whitespace-pre-wrap leading-relaxed">
                {output || <span className="text-neutral-700 italic">// Run code to see output...</span>}
            </pre>
        </div>
      </div>
    </div>
  );
}