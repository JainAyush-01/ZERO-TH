"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth"; 
import api from "@/lib/api";
import { Calendar, Clock, Trophy, Lock, Play, AlertTriangle, List, Medal, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ContestArena() {
  const { id } = useParams();
  const router = useRouter();
  const { data: user } = useAuth();
  
  const [timeLeft, setTimeLeft] = useState("");
  const [activeTab, setActiveTab] = useState<'problems' | 'leaderboard'>('problems');

  // 1. Fetch Contest Info (Capture 'error' object)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["contest", id],
    queryFn: async () => (await api.get(`/contest/${id}`)).data,
    refetchInterval: 5000,
    retry: 1 // Don't retry forever if it's a 404
  });

  // 2. Fetch Leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["contest-rank", id],
    queryFn: async () => (await api.get(`/contest/${id}/leaderboard`)).data,
    enabled: activeTab === 'leaderboard' || !!user,
    refetchInterval: 10000 
  });

  // 3. Calculate "My Rank"
  const myRankIndex = leaderboard?.findIndex((p: any) => p.userId === user?._id);
  const myRank = myRankIndex !== -1 && myRankIndex !== undefined ? myRankIndex + 1 : "-";
  const myScore = myRankIndex !== -1 && myRankIndex !== undefined ? leaderboard[myRankIndex].score : 0;

  // Countdown Logic
  useEffect(() => {
    if (!data?.contest) return;
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(data.contest.startTime).getTime();
        const end = new Date(data.contest.endTime).getTime();
        
        let target = start;
        if (data.contest.status === 'active') target = end;

        const distance = target - now;
        
        if (distance < 0) {
            setTimeLeft("00:00:00");
        } else {
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // --- IMPROVED ERROR HANDLING ---
  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500 animate-pulse">Loading Arena...</div>;

  if (isError) {
      const err = error as any;
      // If 404 (Not Found) OR 500 (Invalid ID), show the clean "Not Found" UI
      const isNotFound = err.response?.status === 404 || err.response?.status === 500;
      
      return (
          <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white/5 p-6 rounded-full mb-6">
                  {isNotFound ? (
                      <Trophy className="text-neutral-600" size={48} /> 
                  ) : (
                      <AlertTriangle className="text-red-500" size={48} />
                  )}
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-3">
                  {isNotFound ? "Contest Unavailable" : "Connection Issue"}
              </h1>
              
              <p className="text-neutral-400 mb-8 max-w-md text-lg">
                  {isNotFound 
                      ? "This contest does not exist or has been removed from the schedule." 
                      : "We couldn't connect to the arena server. Please check your internet."}
              </p>
              
              <Button 
                onClick={() => router.push('/contests')} 
                className="bg-white text-black hover:bg-neutral-200 px-8 py-6 text-base rounded-full"
              >
                  Browse Active Events
              </Button>
          </div>
      );
  }

  const { contest, isRegistered } = data;

  if (!isRegistered) {
      return (
          <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
              <Lock size={48} className="text-neutral-600 mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Restricted Access</h1>
              <p className="text-neutral-400 mb-6">You must register for this event to enter the arena.</p>
              <Button onClick={() => router.push('/contests')}>Back to Events</Button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#050505] pt-20 px-6 pb-20">
        <div className="max-w-5xl mx-auto">
            
            {/* Header / Timer */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 mb-6 font-mono text-xs uppercase tracking-widest">
                    {contest.status === 'upcoming' ? "Starts In" : contest.status === 'active' ? "Time Remaining" : "Event Ended"}
                </div>
                <div className="text-6xl font-bold text-white font-mono tracking-tight mb-4">
                    {timeLeft}
                </div>
                <h1 className="text-2xl font-medium text-neutral-400">{contest.title}</h1>
            </div>

            {/* MY RANK WIDGET */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-neutral-400">
                        <Trophy size={16} className="text-yellow-500" /> <span className="text-xs uppercase tracking-wider">My Rank</span>
                    </div>
                    <div className="text-xl font-bold text-white">#{myRank}</div>
                </div>
                <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-neutral-400">
                        <Medal size={16} className="text-emerald-500" /> <span className="text-xs uppercase tracking-wider">My Score</span>
                    </div>
                    <div className="text-xl font-bold text-white">{myScore}</div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex justify-center mb-8">
                <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setActiveTab('problems')}
                        className={cn("px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2", activeTab === 'problems' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300")}
                    >
                        <List size={16} /> Problems
                    </button>
                    <button 
                        onClick={() => setActiveTab('leaderboard')}
                        className={cn("px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2", activeTab === 'leaderboard' ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300")}
                    >
                        <Medal size={16} /> Live Rank
                    </button>
                </div>
            </div>

            {/* TAB: PROBLEMS */}
            {activeTab === 'problems' && (
                contest.status === 'upcoming' ? (
                    <div className="text-center p-12 border border-white/5 bg-[#0A0A0A] rounded-2xl">
                        <Trophy className="mx-auto text-yellow-500/50 mb-4" size={40} />
                        <h3 className="text-white font-bold mb-2">The Arena is Locked</h3>
                        <p className="text-neutral-500 text-sm">Problems will be decrypted when the timer hits zero.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {contest.problems.map((p: any, i: number) => (
                            <div key={p._id} className="bg-[#0A0A0A] border border-white/5 p-6 rounded-xl flex justify-between items-center group hover:border-accent/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="text-lg font-mono text-neutral-500 font-bold w-8">{String.fromCharCode(65 + i)}</div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">{p.title}</h3>
                                        <span className={cn("text-xs px-2 py-0.5 rounded border uppercase", 
                                            p.difficulty === 'easy' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" :
                                            p.difficulty === 'medium' ? "text-amber-500 border-amber-500/20 bg-amber-500/10" :
                                            "text-rose-500 border-rose-500/20 bg-rose-500/10"
                                        )}>
                                            {p.difficulty}
                                        </span>
                                    </div>
                                </div>
                                <Button onClick={() => router.push(`/contests/${contest._id}/${p._id}`)} className="bg-white text-black hover:bg-neutral-200">
                                    Solve <Play size={14} className="ml-2"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* TAB: LEADERBOARD */}
            {activeTab === 'leaderboard' && (
                <div className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[60px_1fr_100px_100px] p-4 text-xs font-mono text-neutral-500 uppercase border-b border-white/5">
                        <div className="text-center">#</div>
                        <div>User</div>
                        <div className="text-center">Score</div>
                        <div className="text-right">Penalty</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {leaderboard?.map((p: any, i: number) => (
                            <div key={i} className={cn("grid grid-cols-[60px_1fr_100px_100px] p-4 items-center transition-colors", 
                                p.userId === user?._id ? "bg-accent/10 border-l-2 border-accent" : "hover:bg-white/[0.02]"
                            )}>
                                <div className="text-center font-mono text-neutral-500">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                </div>
                                <div className="text-white font-medium flex flex-col">
                                    <span className="flex items-center gap-2">
                                        {p.name} 
                                        {p.userId === user?._id && <span className="text-[10px] bg-accent text-white px-1.5 rounded">YOU</span>}
                                    </span>
                                    <span className="text-[10px] text-neutral-600 font-mono">{p.email}</span>
                                </div>
                                <div className="text-center text-accent font-bold">{p.score}</div>
                                <div className="text-right text-neutral-500 font-mono">{p.timePenalty}m</div>
                            </div>
                        ))}
                        {(!leaderboard || leaderboard.length === 0) && (
                            <div className="p-8 text-center text-neutral-500 italic">Leaderboard is empty. Be the first to solve!</div>
                        )}
                    </div>
                </div>
            )}

        </div>
    </div>
  );
}