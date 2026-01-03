"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, FileCode, LayoutDashboard, ShieldPlus, Database, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth"; // Import Auth

// Component Imports
import CreateProblemForm from "@/components/admin/CreateProblemForm"; 
import CreateAdminForm from "@/components/admin/CreateAdminForm";
import CreateContestForm from "@/components/admin/CreateContestForm";
import AdminStats from "@/components/admin/AdminStats"; 
import UserManagement from "@/components/admin/UserManagement"; 
import ProblemManagement from "@/components/admin/ProblemManagement";
import SubmissionLogs from "@/components/admin/SubmissionLogs";

export default function AdminDashboard() {
  const { data: user } = useAuth();
  
  // Default tab based on role? (Optional optimization)
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "problems" | "submissions">("overview");
  const [modal, setModal] = useState<"none" | "createProblem" | "createAdmin" | "createContest">("none");

  if (!user) return null;

  // ROLE CHECKS
  const isAdmin = user.role === 'admin';
  const isCreator = user.role === 'creator' || isAdmin; // Admin implies Creator rights

  return (
    <div className="min-h-screen bg-[#050505] text-white flex pt-14">
      
      {/* SIDEBAR */}
      <div className="w-64 border-r border-white/5 bg-[#09090b] fixed h-full top-14 left-0 p-4 overflow-y-auto">
        
        <div className="space-y-1">
            <SidebarItem 
                icon={LayoutDashboard} 
                label="Overview" 
                active={activeTab === 'overview'} 
                onClick={() => setActiveTab('overview')} 
            />
            
            {/* ONLY ADMIN SEES USERS */}
            {isAdmin && (
                <SidebarItem 
                    icon={Users} 
                    label="User Registry" 
                    active={activeTab === 'users'} 
                    onClick={() => setActiveTab('users')} 
                />
            )}

            <SidebarItem 
                icon={FileCode} 
                label="Problem Modules" 
                active={activeTab === 'problems'} 
                onClick={() => setActiveTab('problems')} 
            />
            
            {/* ONLY ADMIN SEES GLOBAL LOGS */}
            {isAdmin && (
                <SidebarItem 
                    icon={Database} 
                    label="Global Logs" 
                    active={activeTab === 'submissions'} 
                    onClick={() => setActiveTab('submissions')} 
                />
            )}
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mb-4 px-3">
                Quick Actions
            </p>
            
            {/* CREATORS & ADMINS */}
            {isCreator && (
                <>
                    <Button onClick={() => setModal("createProblem")} className="w-full justify-start bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 mb-2">
                        <Plus size={14} className="mr-2" /> New Problem
                    </Button>
                    <Button onClick={() => setModal("createContest")} className="w-full justify-start bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 mb-2">
                        <Trophy size={14} className="mr-2" /> Create Contest
                    </Button>
                </>
            )}

            {/* ONLY ADMIN */}
            {isAdmin && (
                <Button onClick={() => setModal("createAdmin")} className="w-full justify-start bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20">
                    <ShieldPlus size={14} className="mr-2" /> Grant Role
                </Button>
            )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="ml-64 flex-1 p-8">
        
        {activeTab === 'overview' && (
            <div className="animate-in fade-in duration-500">
                <h1 className="text-2xl font-bold mb-6">System Overview</h1>
                <AdminStats onNavigate={(tab: any) => setActiveTab(tab)} />
            </div>
        )}

        {/* Protect Tab Content logic too */}
        {activeTab === 'users' && isAdmin && (
            <div className="animate-in fade-in duration-500">
                <h1 className="text-2xl font-bold mb-6">User Registry</h1>
                <UserManagement />
            </div>
        )}

        {activeTab === 'problems' && (
            <div className="animate-in fade-in duration-500">
                <ProblemManagement />
            </div>
        )}

        {activeTab === 'submissions' && isAdmin && (
            <div className="animate-in fade-in duration-500">
                <h1 className="text-2xl font-bold mb-6">Global Submission Logs</h1>
                <SubmissionLogs />
            </div>
        )}

      </div>

      {/* MODALS */}
      {modal === "createProblem" && <CreateProblemForm onClose={() => setModal("none")} />}
      {modal === "createAdmin" && <CreateAdminForm onClose={() => setModal("none")} />}
      {modal === "createContest" && <CreateContestForm onClose={() => setModal("none")} />}

    </div>
  );
}

// ... SidebarItem component
function SidebarItem({ icon: Icon, label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-accent text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
            )}
        >
            <Icon size={16} /> {label}
        </button>
    )
}