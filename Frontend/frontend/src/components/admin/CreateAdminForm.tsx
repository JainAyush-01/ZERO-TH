"use client";
import { useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Mail, User, Lock, X } from "lucide-react";

export default function CreateAdminForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    emailId: "",
    password: "",
    role: "admin" // Hardcoded as per requirement
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/user/admin/register", formData);
      toast.success("New Admin Initialized Successfully");
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#09090b] border border-white/10 w-full max-w-md p-6 rounded-2xl shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X size={20}/></button>
        
        <div className="mb-6 flex items-center gap-3">
            <div className="p-3 bg-accent/10 rounded-lg text-accent"><Shield size={24} /></div>
            <div>
                <h2 className="text-xl font-bold text-white">Grant System Role</h2>
                <p className="text-xs text-neutral-500">Create a new root-level user.</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-500">Identity Name</label>
            <div className="relative">
                <User size={14} className="absolute left-3 top-3 text-neutral-500" />
                <input 
                    required
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:border-accent outline-none transition-colors"
                    placeholder="e.g. Architect"
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-500">Email Protocol</label>
            <div className="relative">
                <Mail size={14} className="absolute left-3 top-3 text-neutral-500" />
                <input 
                    required
                    type="email"
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:border-accent outline-none transition-colors"
                    placeholder="admin@zeroth.io"
                    onChange={(e) => setFormData({...formData, emailId: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-500">Security Key</label>
            <div className="relative">
                <Lock size={14} className="absolute left-3 top-3 text-neutral-500" />
                <input 
                    required
                    type="password"
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:border-accent outline-none transition-colors"
                    placeholder="••••••••"
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-500">System Privilege</label>
            <div className="relative">
                <select 
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:border-accent outline-none appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                    <option value="admin">Admin (God Mode)</option>
                    <option value="creator">Creator (Problem Setter)</option>
                    <option value="tester">Tester (QA)</option>
                </select>
                {/* Arrow Icon */}
                <div className="absolute right-3 top-3 pointer-events-none text-neutral-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
            </div>
          </div>

          <div className="pt-2">
            <Button disabled={loading} className="w-full bg-white text-black hover:bg-neutral-200">
                {loading ? "Processing..." : "Grant Privileges"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}