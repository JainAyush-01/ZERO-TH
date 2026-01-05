"use client";
import { motion } from "framer-motion";
import { Brain, Star } from "lucide-react";

interface RatingModalProps {
    onRate: (quality: number) => void;
}

export default function RatingModal({ onRate }: RatingModalProps) {
  const RATINGS = [
    { val: 0, label: "Forgot", color: "bg-red-500" },
    { val: 3, label: "Hard", color: "bg-orange-500" },
    { val: 4, label: "Good", color: "bg-yellow-500" },
    { val: 5, label: "Easy", color: "bg-emerald-500" },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#09090b] border border-white/10 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl"
      >
        <div className="mx-auto w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-4">
            <Brain size={24} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Memory Consolidation</h2>
        <p className="text-neutral-400 text-sm mb-8">
            How difficult was it to recall the solution logic?
        </p>

        <div className="grid grid-cols-2 gap-3">
            {RATINGS.map((r) => (
                <button
                    key={r.val}
                    onClick={() => onRate(r.val)}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/10 transition-all flex flex-col items-center gap-2 group"
                >
                    <div className={`w-2 h-2 rounded-full ${r.color}`} />
                    <span className="text-sm font-medium text-white group-hover:text-accent">{r.label}</span>
                </button>
            ))}
        </div>
      </motion.div>
    </div>
  );
}