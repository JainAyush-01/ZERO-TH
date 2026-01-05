"use client";
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
    firstName: string;
    solvedCount: number;
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
                {/* 🚀 CHANGED GRID: From 4 cols to 3 cols */}
                <div className="grid grid-cols-[80px_1fr_100px] p-4 text-xs font-mono text-neutral-500 uppercase tracking-wider border-b border-white/5">
                    <div className="text-center">Rank</div>
                    <div>User</div>
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
                                // 🚀 CHANGED GRID here too
                                className="grid grid-cols-[80px_1fr_100px] p-4 items-center hover:bg-white/[0.02] transition-colors group"
                            >
                                <div className="text-center flex justify-center">
                                    {i === 0 ? <Trophy size={18} className="text-yellow-500" /> :
                                     i === 1 ? <Medal size={18} className="text-slate-400" /> :
                                     i === 2 ? <Medal size={18} className="text-amber-700" /> :
                                     <span className="text-neutral-500 font-mono">#{i + 1}</span>
                                    }
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                        {user.firstName[0].toUpperCase()}
                                    </div>
                                    <div className="text-sm font-medium text-white group-hover:text-accent transition-colors capitalize">
                                        {user.firstName}
                                    </div>
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