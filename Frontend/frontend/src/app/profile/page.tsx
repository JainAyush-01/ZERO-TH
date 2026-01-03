"use client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/profile/StatsCard";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const { data: user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: history } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
        const { data } = await api.get('/submission/history');
        return Array.isArray(data) ? data : [];
    },
    enabled: !!user 
  });

  const handleDeleteAccount = async () => {
    // Basic confirmation dialog
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    try {
        await api.delete("/user/profile/Delete");
        toast.success("Account deleted successfully");
        
        // Clear local state and redirect
        queryClient.setQueryData(["auth-user"], null);
        router.push("/");
    } catch (err) {
        toast.error("Failed to delete account");
    }
  };

  if (!user) return <div className="min-h-screen bg-[#050505]" />;

  return (
    <div className="min-h-screen bg-[#050505] pt-24 px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end gap-6 mb-12"
        >
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white to-neutral-400 flex items-center justify-center text-black text-3xl font-bold">
                {user.firstName ? user.firstName[0].toUpperCase() : "U"}
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white mb-1 capitalize">{user.firstName}</h1>
                <p className="text-neutral-500 font-mono text-sm">{user.emailId}</p>
            </div>
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Left: Stats */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <StatsCard 
                    solved={user.stats?.solved || 0} 
                    total={user.stats?.total || 0} 
                    attempted={user.stats?.attempted || 0} 
                />
            </motion.div>

            {/* Right: History */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 min-h-[300px]"
            >
                <h3 className="text-sm font-mono text-neutral-500 uppercase tracking-wider mb-6">Recent Activity</h3>
                <div className="space-y-1">
                    {history?.map((sub: any, i:number) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-2 h-2 rounded-full", sub.status === 'accepted' ? "bg-emerald-500" : "bg-rose-500")} />
                                <div>
                                    <div className="text-sm text-white font-medium group-hover:text-accent transition-colors line-clamp-1">
                                        {sub.problemId?.title || "Unknown Problem"}
                                    </div>
                                    <div className="text-xs text-neutral-500 font-mono">{new Date(sub.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="text-xs font-mono text-neutral-600 uppercase">
                                {sub.language}
                            </div>
                        </div>
                    ))}
                    {(!history || history.length === 0) && (
                        <div className="text-neutral-600 italic text-sm mt-10 text-center">No recent activity recorded.</div>
                    )}
                </div>
            </motion.div>
        </div>

        {/* DANGER ZONE */}
        <div className="border border-red-900/20 bg-red-900/5 rounded-xl p-6">
            <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
                <AlertTriangle size={18} /> Danger Zone
            </h3>
            <p className="text-neutral-400 text-sm mb-6">
                Deleting your account is irreversible. All your submission history and progress will be permanently erased from the System Core.
            </p>
            <button 
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500 hover:text-white transition-all"
            >
                Delete Account
            </button>
        </div>

      </div>
    </div>
  );
}