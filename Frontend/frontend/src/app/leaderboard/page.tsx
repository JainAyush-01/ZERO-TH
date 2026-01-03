"use client";
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
    firstName: string;
    emailId: string;
    solvedCount: number;
    role: string;
}

export default function LeaderboardPage() {
  const { data: users, isLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ['leaderboard'],
    queryFn: async () => (await api.get('/user/leaderboard')).data
  });

  return (
    <div className="min-h-screen bg-[#050505] pt-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 mb-6">
                    <Crown size={14} /> Global Rankings
                </div>
                <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Hall of Fame</h1>
                <p className="text-neutral-500">Elite engineers ranked by algorithmic mastery.</p>
            </motion.div>

            {/* Table */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[60px_2fr_1fr_1fr] p-4 text-xs font-mono text-neutral-500 uppercase tracking-wider border-b border-white/5">
                    <div className="text-center">Rank</div>
                    <div>User</div>
                    <div className="text-center">Role</div>
                    <div className="text-right">Solved</div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-neutral-500">Retrieving data...</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {users?.map((user, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="grid grid-cols-[60px_2fr_1fr_1fr] p-4 items-center hover:bg-white/[0.02] transition-colors group"
                            >
                                <div className="text-center flex justify-center">
                                    {i === 0 ? <Trophy size={18} className="text-yellow-500" /> :
                                     i === 1 ? <Medal size={18} className="text-slate-400" /> :
                                     i === 2 ? <Medal size={18} className="text-amber-700" /> :
                                     <span className="text-neutral-500 font-mono">#{i + 1}</span>
                                    }
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                        {user.firstName[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white group-hover:text-accent transition-colors">{user.firstName}</div>
                                        <div className="text-[10px] text-neutral-600 font-mono">{user.emailId}</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className={cn("text-[10px] px-2 py-0.5 rounded border uppercase", 
                                        user.role === 'admin' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-white/5 text-neutral-500 border-white/5")}>
                                        {user.role}
                                    </span>
                                </div>
                                <div className="text-right font-mono text-white text-sm">
                                    {user.solvedCount}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}   