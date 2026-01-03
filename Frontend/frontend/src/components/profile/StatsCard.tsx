"use client";
import { motion } from "framer-motion";

interface StatsProps {
    solved: number;
    total: number;
    attempted: number;
}

export const StatsCard = ({ solved, total, attempted }: StatsProps) => {
  // Calculate percentage for the circle
  const percentage = total > 0 ? (solved / total) * 100 : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
        <h3 className="text-sm font-mono text-neutral-500 uppercase tracking-wider mb-6">Progress Analytics</h3>
        
        <div className="flex items-center gap-8">
            {/* 1. The Donut Chart */}
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="#262626"
                        strokeWidth="8"
                        fill="transparent"
                    />
                    {/* Progress Circle (Animated) */}
                    <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="#fff"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeLinecap="round"
                    />
                </svg>
                
                {/* Text in Middle */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{solved}</span>
                    <span className="text-[10px] text-neutral-500 uppercase">Solved</span>
                </div>
            </div>

            {/* 2. Text Details */}
            <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-neutral-400">Total Problems</span>
                    <span className="text-white font-mono">{total}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                    <span className="text-neutral-400">Attempted</span>
                    <span className="text-white font-mono">{attempted}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400">Completion</span>
                    <span className="text-white font-mono">{percentage.toFixed(1)}%</span>
                </div>
            </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-[50px] group-hover:bg-white/10 transition-colors" />
    </div>
  );
};