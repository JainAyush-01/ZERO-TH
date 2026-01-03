"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2 } from "lucide-react";

export default function UserManagement() {
  const queryClient = useQueryClient();
  
  // Fetch Users
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/admin-api/users")).data,
  });

  const users = data?.users || [];

  // Ban Mutation
  const banMutation = useMutation({
    mutationFn: async (id: string) => await api.put(`/admin-api/users/ban/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    }
  });

  // Role Change Mutation
  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: string }) => 
        await api.put(`/admin-api/users/role/${id}`, { role }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        toast.success("Role updated successfully");
    },
    onError: (err: any) => {
        toast.error(err.response?.data || "Failed to update role");
    }
  });

  const handleRoleChange = (userId: string, newRole: string) => {
      roleMutation.mutate({ id: userId, role: newRole });
  };

  if (isLoading) return <div className="p-4 text-neutral-500 italic flex items-center gap-2"><Loader2 className="animate-spin" size={14}/> Loading Registry...</div>;

  return (
    <div className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-visible"> {/* overflow-visible needed for dropdowns */}
      <div className="grid grid-cols-[1.5fr_1.5fr_1fr_100px] p-4 text-xs font-mono text-neutral-500 uppercase border-b border-white/5 bg-white/[0.02]">
        <div>Identity</div>
        <div>Email</div>
        <div>System Role</div>
        <div className="text-right">Action</div>
      </div>
      <div className="divide-y divide-white/5">
        {users.map((u: any) => (
          <div key={u._id} className="grid grid-cols-[1.5fr_1.5fr_1fr_100px] p-4 items-center text-sm hover:bg-white/[0.02] transition-colors">
            
            {/* Identity */}
            <div className="flex items-center gap-3 text-white">
                <div className={cn("w-2 h-2 rounded-full", u.isBanned ? "bg-red-500" : "bg-emerald-500")} />
                <span className="font-medium">{u.firstName}</span>
            </div>

            {/* Email */}
            <div className="text-neutral-400 font-mono text-xs truncate pr-4">{u.emailId}</div>

            {/* Role Dropdown */}
            <div className="relative">
                <div className="relative inline-block group">
                    <select 
                        className={cn(
                            "appearance-none bg-transparent border rounded-md py-1 pl-3 pr-8 text-xs font-medium cursor-pointer outline-none transition-colors",
                            u.role === 'admin' ? "border-purple-500/30 text-purple-400 bg-purple-500/5" :
                            u.role === 'creator' ? "border-accent/30 text-accent bg-accent/5" :
                            u.role === 'tester' ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" :
                            "border-white/10 text-neutral-400 bg-white/5"
                        )}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        disabled={roleMutation.isPending}
                    >
                        <option value="user" className="bg-[#111] text-neutral-400">User</option>
                        <option value="creator" className="bg-[#111] text-accent">Creator</option>
                        <option value="tester" className="bg-[#111] text-yellow-500">Tester</option>
                        <option value="admin" className="bg-[#111] text-purple-400">Admin</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
            </div>

            {/* Actions */}
            <div className="text-right">
                {u.role !== 'admin' && (
                    <Button 
                        size="sm" 
                        variant={u.isBanned ? "outline" : "danger"} 
                        onClick={() => banMutation.mutate(u._id)}
                        className="h-7 text-[10px] uppercase tracking-wider px-3"
                    >
                        {u.isBanned ? "Unban" : "Ban"}
                    </Button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}