"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User as UserIcon, Trophy, ChevronDown, Zap, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner"; // Import Toast

export const UserMenu = () => {
  const { data: user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  if (!user) return null;

const handleLogout = async () => {
    try {
      // 1. Call Backend
      await api.post("/user/logout");
      
      // 2. Clear Cache
      queryClient.setQueryData(["auth-user"], null); 
      
      // 3. Success & Redirect
      toast.success("Disconnected");
      window.location.href = "/"; // Force refresh to clear all state
      
    } catch (err) {
      // If backend fails, force logout on client anyway
      queryClient.setQueryData(["auth-user"], null);
      window.location.href = "/";
    }
  };

  return (
    <div className="relative z-50" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      {/* Trigger Button */}
      <button className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
            {user.firstName ? user.firstName[0].toUpperCase() : "U"}
        </div>
        <span className="text-xs font-mono text-neutral-300 group-hover:text-white transition-colors max-w-[100px] truncate">
            {user.firstName}
        </span>
        <ChevronDown size={12} className={`text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-64 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header Stats */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-neutral-500 font-mono uppercase">Status</span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 rounded uppercase">Online</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 p-2 rounded border border-white/5 text-center">
                        <Trophy size={14} className="mx-auto text-yellow-500 mb-1" />
                        <div className="text-lg font-bold text-white leading-none">{user.problemSolved?.length || 0}</div>
                        <div className="text-[10px] text-neutral-500">Solved</div>
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-white/5 text-center">
                        <Zap size={14} className="mx-auto text-accent mb-1" />
                        <div className="text-lg font-bold text-white leading-none">
                             {(user.problemSolved?.length || 0) > 10 ? "Pro" : "Novice"}
                        </div>
                        <div className="text-[10px] text-neutral-500">Rank</div>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <div className="p-1">
                {['admin', 'creator', 'tester'].includes(user.role) && (
                    <>
                        <button onClick={() => router.push('/admin')} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors text-left font-medium">
                            <Shield size={14} /> System Console
                        </button>
                        <div className="h-[1px] bg-white/5 my-1" />
                    </>
                )}

                <button onClick={() => router.push('/profile')} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                    <UserIcon size={14} /> Profile Settings
                </button>
                <div className="h-[1px] bg-white/5 my-1" />
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-left">
                    <LogOut size={14} /> Disconnect
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};