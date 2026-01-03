"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { Calendar, Clock, Trophy, Lock, Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ContestArena() {
  const { id } = useParams();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["contest", id],
    queryFn: async () => (await api.get(`/contest/${id}`)).data,
    refetchInterval: 1000 // Poll every second to check start time
  });

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
            // If status changed (e.g. upcoming -> active), refetch to get problems
            if (data.contest.status === 'upcoming') refetch();
        } else {
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Loading Arena...</div>;

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
    <div className="min-h-screen bg-[#050505] pt-20 px-6">
        <div className="max-w-5xl mx-auto">
            
            {/* Header / Timer */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 mb-6 font-mono text-xs uppercase tracking-widest">
                    {contest.status === 'upcoming' ? "Starts In" : contest.status === 'active' ? "Time Remaining" : "Event Ended"}
                </div>
                <div className="text-6xl font-bold text-white font-mono tracking-tight mb-4">
                    {timeLeft}
                </div>
                <h1 className="text-2xl font-medium text-neutral-400">{contest.title}</h1>
            </div>

            {/* PROBLEM LIST (Only visible if active/ended) */}
            {contest.status === 'upcoming' ? (
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
                            <Button 
                                onClick={() => router.push(`/contests/${contest._id}/${p._id}`)} // Routes to normal workspace for now
                                className="bg-white text-black hover:bg-neutral-200"
                            >
                                Solve <Play size={14} className="ml-2"/>
                            </Button>
                        </div>
                    ))}
                </div>
            )}

        </div>
    </div>
  );
}