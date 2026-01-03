"use client";
import { useState } from "react";
import api from "@/lib/api";
import { X, PenTool } from "lucide-react";
import { toast } from "sonner";

export default function CreatePostModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("General");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if(!title || !content) return toast.error("Title and content required");
    setLoading(true);
    try {
        await api.post("/forum/create", { title, content, tags: [tag] });
        toast.success("Discussion started");
        onSuccess();
    } catch(err) {
        toast.error("Failed to post");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#09090b] border border-white/10 w-full max-w-2xl rounded-2xl p-6 relative shadow-2xl">
            <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X size={20}/></button>
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <PenTool size={20} className="text-accent"/> Start Discussion
            </h2>

            <div className="space-y-4">
                <input 
                    className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-accent outline-none text-lg font-medium placeholder-neutral-600"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                
                <select 
                    className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-neutral-300 focus:border-accent outline-none"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                >
                    <option>General</option>
                    <option>Interview Experience</option>
                    <option>System Design</option>
                    <option>Compensation</option>
                    <option>Career</option>
                </select>

                <textarea 
                    className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-neutral-300 focus:border-accent outline-none h-40 resize-none placeholder-neutral-600 font-mono"
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-neutral-400 hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading}
                        className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Publishing..." : "Publish"}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}