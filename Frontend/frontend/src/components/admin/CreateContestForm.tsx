"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { X, Calendar, Trophy, CheckSquare, Square, Hash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Define the structure for a selected problem
interface SelectedProblem {
    problemId: string;
    points: number;
}

export default function CreateContestForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: ""
  });
  
  // Store ID AND Points
  const [selectedProblems, setSelectedProblems] = useState<SelectedProblem[]>([]);

  // Fetch all problems (hidden & public)
  const { data: problems } = useQuery({
    queryKey: ["admin-raw-problems"],
    queryFn: async () => (await api.get("/problem/admin/all")).data
  });

  // Helper: Default points based on difficulty
  const getDefaultPoints = (diff: string) => {
      switch(diff) {
          case 'easy': return 20;
          case 'medium': return 40;
          case 'hard': return 80;
          default: return 10;
      }
  };

  // Logic: Add/Remove problem from selection
  const toggleProblem = (id: string, difficulty: string) => {
    const exists = selectedProblems.find(p => p.problemId === id);
    if (exists) {
        // Remove
        setSelectedProblems(prev => prev.filter(p => p.problemId !== id));
    } else {
        // Add with default points
        setSelectedProblems(prev => [...prev, { problemId: id, points: getDefaultPoints(difficulty) }]);
    }
  };

  // Logic: Update points for a selected problem
  const updatePoints = (id: string, newPoints: string) => {
      const points = parseInt(newPoints) || 0;
      setSelectedProblems(prev => prev.map(p => p.problemId === id ? { ...p, points } : p));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.startTime || !form.endTime) return toast.error("Missing fields");
    if (selectedProblems.length === 0) return toast.error("Select at least 1 problem");

    setLoading(true);
    try {
        await api.post("/contest/create", {
            ...form,
            problems: selectedProblems // Sends array of { problemId, points }
        });
        toast.success("Contest Scheduled Successfully");
        onClose();
    } catch (err: any) {
        toast.error(err.response?.data || "Failed to create contest");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#09090b] border border-white/10 w-full max-w-2xl h-[90vh] flex flex-col rounded-2xl shadow-2xl relative">
        
        {/* Header */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#111]">
            <div className="flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} />
                <h2 className="text-lg font-bold text-white">Initialize Event</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X size={20} className="text-neutral-400"/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#050505] space-y-8">
            
            {/* 1. Meta Data */}
            <div className="space-y-4">
                <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-wider border-b border-white/10 pb-2">Event Parameters</h3>
                <div className="space-y-2">
                    <label className="text-xs text-neutral-400">Contest Title</label>
                    <input className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none"
                        value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Weekly Challenge 101" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 flex items-center gap-2"><Calendar size={12}/> Start Time</label>
                        <input type="datetime-local" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none"
                            value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 flex items-center gap-2"><Calendar size={12}/> End Time</label>
                        <input type="datetime-local" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none"
                            value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-neutral-400">Description</label>
                    <textarea className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent outline-none h-24"
                        value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Rules and details..." />
                </div>
            </div>

            {/* 2. Problem Selector & Scorer */}
            <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                    <h3 className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Select Modules & Assign Points</h3>
                    <span className="text-xs text-accent">{selectedProblems.length} Selected</span>
                </div>
                
                <div className="grid gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {problems?.map((p: any) => {
                        const isSelected = selectedProblems.find(sp => sp.problemId === p._id);
                        return (
                            <div 
                                key={p._id} 
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                                    isSelected ? "bg-accent/5 border-accent/50" : "bg-[#111] border-white/5 hover:border-white/20"
                                )}
                            >
                                {/* Left Side: Click to Toggle */}
                                <div 
                                    className="flex items-center gap-4 flex-1 cursor-pointer"
                                    onClick={() => toggleProblem(p._id, p.difficulty)}
                                >
                                    {isSelected ? <CheckSquare size={18} className="text-accent shrink-0" /> : <Square size={18} className="text-neutral-600 shrink-0" />}
                                    <div className="flex flex-col">
                                        <span className={cn("text-sm font-medium", isSelected ? "text-white" : "text-neutral-400")}>{p.title}</span>
                                        <div className="flex gap-2 text-[10px] uppercase font-mono mt-1">
                                            <span className={cn(p.difficulty === 'easy' ? 'text-emerald-500' : p.difficulty === 'medium' ? 'text-amber-500' : 'text-rose-500')}>{p.difficulty}</span>
                                            <span className="text-neutral-600">|</span>
                                            <span className="text-neutral-500">{p.visibility}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Points Input (Only if Selected) */}
                                {isSelected && (
                                    <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-4">
                                        <label className="text-[10px] text-neutral-500 font-mono uppercase">Pts</label>
                                        <div className="relative w-16">
                                            <Hash size={10} className="absolute left-2 top-2.5 text-neutral-500 pointer-events-none"/>
                                            <input 
                                                type="number"
                                                value={isSelected.points}
                                                onChange={(e) => updatePoints(p._id, e.target.value)}
                                                className="w-full bg-black border border-white/20 rounded px-2 pl-5 py-1 text-xs text-white focus:border-accent outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="h-16 border-t border-white/10 bg-[#111] flex items-center justify-end px-6 gap-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-white text-black hover:bg-neutral-200">
                {loading ? "Scheduling..." : "Schedule Event"}
            </Button>
        </div>

      </div>
    </div>
  );
}