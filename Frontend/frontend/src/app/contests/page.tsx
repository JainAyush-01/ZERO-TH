"use client";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Calendar, Clock, Trophy, Users, Play, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function ContestsList() {
  const router = useRouter();

  const { data: contests, isLoading } = useQuery({
    queryKey: ["all-contests"],
    queryFn: async () => (await api.get('/contest/all')).data,
    refetchInterval: 10000 // Refetch every 10 seconds to keep statuses updated
  });

  if (isLoading) {
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center text-neutral-500 animate-pulse">
            Loading Arenas...
        </div>
    );
  }

  const upcoming = contests?.filter((c: any) => c.status === 'upcoming') || [];
  const active = contests?.filter((c: any) => c.status === 'active') || [];
  const ended = contests?.filter((c: any) => c.status === 'ended') || [];

  return (
    <div className="min-h-screen bg-[#050505] pt-20 px-6 pb-20">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Competitive Arena</h1>
            <p className="text-neutral-400 text-lg max-w-2xl">
                Compete against other developers, solve complex algorithms under pressure, and climb the global leaderboard.
            </p>
        </div>

        {/* Active Contests (Featured) */}
        {active.length > 0 && (
            <div className="mb-12">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Now
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {active.map((contest: any) => (
                        <ContestCard key={contest._id} contest={contest} router={router} />
                    ))}
                </div>
            </div>
        )}

        {/* Upcoming Contests */}
        {upcoming.length > 0 && (
            <div className="mb-12">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                    <Clock className="text-amber-500" size={20} />
                    Upcoming Battles
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map((contest: any) => (
                        <ContestCard key={contest._id} contest={contest} router={router} />
                    ))}
                </div>
            </div>
        )}

        {/* Past Contests */}
        {ended.length > 0 && (
            <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                    <Trophy className="text-neutral-500" size={20} />
                    Past Arenas
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-70 hover:opacity-100 transition-opacity">
                    {ended.map((contest: any) => (
                        <ContestCard key={contest._id} contest={contest} router={router} />
                    ))}
                </div>
            </div>
        )}

        {(!contests || contests.length === 0) && (
             <div className="text-center p-12 border border-white/5 bg-[#0A0A0A] rounded-2xl">
                 <ShieldAlert className="mx-auto text-neutral-600 mb-4" size={40} />
                 <h3 className="text-white font-bold mb-2">No Arenas Found</h3>
                 <p className="text-neutral-500 text-sm">Check back later for new competitive events.</p>
             </div>
        )}

      </div>
    </div>
  );
}

function ContestCard({ contest, router }: { contest: any, router: any }) {

    // Format Date securely
    const startDate = new Date(contest.startTime);
    const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Duration
    const durationMs = new Date(contest.endTime).getTime() - new Date(contest.startTime).getTime();
    const durationHrs = Math.round(durationMs / (1000 * 60 * 60));

    return (
        <div
            onClick={() => router.push(`/contests/${contest._id}`)}
            className="group relative bg-[#0A0A0A] border border-white/5 p-6 rounded-2xl cursor-pointer hover:border-white/20 transition-all overflow-hidden"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl group-hover:bg-white/[0.05] transition-colors" />

            {/* Status Badge */}
            <div className="mb-4">
                <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider border",
                    contest.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    contest.status === 'upcoming' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    "bg-white/5 text-neutral-400 border-white/10"
                )}>
                    {contest.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    {contest.status === 'upcoming' && <Clock size={10} />}
                    {contest.status === 'ended' && <CheckCircle2 size={10} />}
                    {contest.status}
                </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-accent transition-colors">
                {contest.title}
            </h3>

            <div className="flex items-center gap-4 text-sm text-neutral-500 mb-6">
                <div className="flex items-center gap-1.5">
                    <Calendar size={14} /> {dateStr}
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={14} /> {durationHrs}h
                </div>
                {contest.participants && (
                    <div className="flex items-center gap-1.5">
                        <Users size={14} /> {contest.participants.length}
                    </div>
                )}
            </div>

            <Button
                variant="ghost"
                className={cn(
                    "w-full justify-between border",
                    contest.status === 'active'
                        ? "bg-white text-black hover:bg-neutral-200 border-transparent"
                        : "bg-white/5 text-white hover:bg-white/10 border-white/10"
                )}
            >
                {contest.status === 'active' ? "Enter Arena" : contest.status === 'upcoming' ? "View Details" : "View Results"}
                <Play size={14} />
            </Button>
        </div>
    )
}
