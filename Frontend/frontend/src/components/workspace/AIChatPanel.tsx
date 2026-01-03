"use client";
import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { Send, Bot, User, Sparkles, X, Loader2, RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "ai";
    content: string;
}

interface AIChatProps {
    code: string;
    language: string;
    problem: any;
    lastError?: string;
    onClose: () => void;
}

export default function AIChatPanel({ code, language, problem, lastError, onClose }: AIChatProps) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "ai", content: `**Systems Online.**\nI have analyzed *${problem.title}*. \n\nHow can I help you optimize your solution?` }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            // Send rich context to Backend
            const { data } = await api.post("/ai/ask", {
                prompt: userMsg,
                code: code,
                problemContext: {
                    title: problem.title,
                    description: problem.description,
                    difficulty: problem.difficulty,
                    language: language
                },
                errorContext: lastError
            });

            setMessages(prev => [...prev, { role: "ai", content: data.reply }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: "ai", content: "⚠️ Connection to Neural Core failed. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-white/5 w-full font-sans">
            
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-purple-900/10">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                    <Sparkles size={14} /> ZEROTH AI v1.0
                </div>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><X size={14}/></button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                        {/* Avatar */}
                        <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                            m.role === "ai" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-white/10 text-white border border-white/10"
                        )}>
                            {m.role === "ai" ? <Bot size={14} /> : <User size={14} />}
                        </div>
                        
                        {/* Bubble */}
                        <div className={cn(
                            "max-w-[85%] text-xs leading-relaxed p-3 rounded-lg border",
                            m.role === "ai" 
                                ? "bg-[#111] border-white/5 text-neutral-300" 
                                : "bg-purple-600/10 border-purple-500/20 text-purple-100"
                        )}>
                            {/* Render Markdown for code blocks */}
                            <ReactMarkdown 
                                components={{
                                    code: ({node, ...props}) => <code className="bg-black/50 px-1 py-0.5 rounded text-yellow-500 font-mono" {...props} />
                                }}
                            >
                                {m.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                
                {loading && (
                    <div className="flex gap-3 animate-pulse">
                        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <Bot size={14} className="text-purple-400"/>
                        </div>
                        <div className="h-8 w-24 bg-[#111] rounded-lg border border-white/5 flex items-center px-3">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"/>
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-75"/>
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-150"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-[#050505]">
                <div className="relative group">
                    <input 
                        className="w-full bg-[#111] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none transition-all placeholder-neutral-600"
                        placeholder={lastError ? "Ask about the runtime error..." : "Ask a question about this problem..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
                {lastError && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-red-400 cursor-pointer hover:text-red-300 transition-colors" onClick={() => setInput("Explain this error: " + lastError)}>
                        <RefreshCcw size={10} /> Auto-debug last error
                    </div>
                )}
            </div>
        </div>
    );
}