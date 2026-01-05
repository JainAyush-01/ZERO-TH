"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Brain, Clock, ChevronRight, Calendar, Activity, Flame, Tag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function VaultPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["vault"],
    queryFn: async () => (await api.get("/mastery/dashboard")).data
  });

  if (isLoading) return <div className="min-h-screen bg-[#050505] pt-24 text-center text-neutral-500">Accessing Neural Archive...</div>;

  const due = data?.due || [];
  const upcoming = data?.upcoming || [];
  const stats = data?.stats || { total: 0, health: 100, streak: 0, isActiveToday: false };

  // 🚀 CLIENT-SIDE GROUPING (BULLETPROOF VERSION)
  const groupedDue = due.reduce((acc: any, item: any) => {
      // 1. Safe Access: Check if problemId exists (deleted problems?)
      const tagString = item.problemId?.tags || ""; 
      
      // 2. Safe Split: Trim spaces, handle empty strings
      let tag = tagString.split(',')[0].trim();
      
      // 3. Fallback: If empty after trim, call it "General"
      if (!tag) tag = "General";
      
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(item);
      return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#050505] pt-24 px-6 md:px-12 max-w-6xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Brain size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white">Mastery Vault</h1>
                <p className="text-neutral-500 text-sm font-mono">Spaced Repetition System</p>
            </div>
        </div>

        <div className="flex gap-4">
            {/* Streak Widget */}
            <div className={cn("bg-[#0A0A0A] border px-6 py-3 rounded-xl flex items-center gap-3", stats.isActiveToday ? "border-orange-500/30 bg-orange-500/5" : "border-white/10")}>
                <Flame size={20} className={cn(stats.isActiveToday ? "text-orange-500 fill-orange-500" : "text-neutral-600")} />
                <div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Day Streak</div>
                    <div className={cn("text-xl font-bold", stats.isActiveToday ? "text-orange-400" : "text-neutral-400")}>{stats.streak}</div>
                </div>
            </div>
            
            {/* Health Widget */}
            <div className="bg-[#0A0A0A] border border-white/10 px-6 py-3 rounded-xl flex items-center gap-6">
                <div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono mb-1">Neural Health</div>
                    <div className={cn("text-xl font-bold", stats.health > 80 ? "text-emerald-500" : "text-yellow-500")}>
                        {stats.health}%
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: DUE TODAY (Grouped) */}
        <div className="lg:col-span-2 space-y-8">
            <h2 className="text-sm font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", due.length > 0 ? "bg-red-500" : "bg-emerald-500")} /> 
                {due.length > 0 ? `Action Required (${due.length})` : "All Caught Up"}
            </h2>

            {due.length === 0 ? (
                <div className="p-12 border border-white/5 bg-[#0A0A0A] rounded-2xl text-center">
                    <Activity className="mx-auto text-emerald-500 mb-4" size={32} />
                    <h3 className="text-white font-bold">Neural Pathways Optimized</h3>
                    <p className="text-neutral-500 text-sm mt-2">Come back tomorrow to maintain your streak.</p>
                </div>
            ) : (
                // 🚀 GROUP RENDERER
                Object.entries(groupedDue).map(([tag, items]: any) => (
                    <div key={tag} className="space-y-3">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                            <Tag size={14} className="text-accent" /> {tag} ({items.length})
                        </div>
                        <div className="grid gap-3">
                            {items.map((item: any) => (
                                <Link href={`/problems/${item.problemId._id}?review=true`} key={item._id}>
                                    <motion.div 
                                        whileHover={{ scale: 1.01 }}
                                        className="bg-[#0A0A0A] border border-white/10 p-5 rounded-xl flex justify-between items-center group"
                                    >
                                        <div>
                                            <h3 className="text-lg font-medium text-white group-hover:text-purple-400 transition-colors">
                                                {item.problemId.title}
                                            </h3>
                                            <div className="flex gap-2 mt-2">
                                                <span className={cn("text-[10px] uppercase px-2 py-0.5 rounded border", 
                                                    item.problemId.difficulty === 'easy' ? "text-emerald-500 border-emerald-500/20" : "text-amber-500 border-amber-500/20")}>
                                                    {item.problemId.difficulty}
                                                </span>
                                                <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                                                    <Clock size={10} /> Interval: {item.interval}d
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-neutral-600 group-hover:text-white" />
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* RIGHT: UPCOMING */}
        <div>
            <h2 className="text-sm font-mono text-neutral-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                <Calendar size={14} /> Upcoming Queue
            </h2>
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-2">
                {upcoming.map((item: any) => (
                    <div key={item._id} className="p-3 border-b border-white/5 last:border-0 flex justify-between items-center text-sm">
                        <span className="text-neutral-300 truncate max-w-[150px]">{item.problemId.title}</span>
                        <span className="text-neutral-600 font-mono text-xs">
                            {new Date(item.nextReviewDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                        </span>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}