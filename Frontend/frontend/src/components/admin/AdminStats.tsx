"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Users, FileCode, Database, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth"; // <--- Import Auth

interface AdminStatsProps {
  onNavigate?: (tab: "users" | "problems" | "submissions") => void;
}

export default function AdminStats({ onNavigate }: AdminStatsProps) {
  const { data: user } = useAuth(); // <--- Get current user
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => (await api.get("/admin-api/stats")).data,
  });

  if (!data || !user) return <div className="text-neutral-500">Loading Telemetry...</div>;

  const isAdmin = user.role === 'admin';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      
      {/* 1. TOTAL USERS (Admin Only) */}
      {isAdmin && (
          <StatCard 
            icon={Users} 
            label="Total Users" 
            value={data.users} 
            onClick={() => onNavigate && onNavigate('users')} 
          />
      )}

      {/* 2. PROBLEMS (Visible to All) */}
      <StatCard 
        icon={FileCode} 
        label="Modules" 
        value={data.problems} 
        onClick={() => onNavigate && onNavigate('problems')} 
      />

      {/* 3. SUBMISSIONS (Admin Only) */}
      {isAdmin && (
          <StatCard 
            icon={Database} 
            label="Submissions" 
            value={data.submissions} 
            onClick={() => onNavigate && onNavigate('submissions')} 
          />
      )}
      
      {/* 4. SYSTEM STATUS (Visible to All) */}
      <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl cursor-default">
        <div className="flex items-center gap-2 mb-2 text-neutral-500 text-xs uppercase tracking-wider">
            <Activity size={14} className="text-emerald-500" /> System Status
        </div>
        <div className="text-xl font-bold text-white">{data.status}</div>
      </div>
    </div>
  );
}

// ... StatCard component remains the same
function StatCard({ icon: Icon, label, value, onClick }: any) {
  return (
    <div 
        onClick={onClick}
        className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl cursor-pointer hover:border-accent/50 hover:bg-white/[0.02] transition-all group"
    >
      <div className="flex items-center gap-2 mb-2 text-neutral-500 text-xs uppercase tracking-wider group-hover:text-accent transition-colors">
        <Icon size={14} /> {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}