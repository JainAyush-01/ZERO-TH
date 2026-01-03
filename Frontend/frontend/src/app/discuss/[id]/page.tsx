"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export default function PostDetail() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => (await api.get(`/forum/${id}`)).data
  });

  const commentMutation = useMutation({
    mutationFn: async () => await api.post(`/forum/${id}/comment`, { content: comment }),
    onSuccess: () => {
        setComment("");
        queryClient.invalidateQueries({ queryKey: ["post", id] });
        toast.success("Comment added");
    }
  });

  if (isLoading) return <div className="h-screen bg-[#050505] flex items-center justify-center text-neutral-500">Loading Transmission...</div>;
  if (!data) return <div className="h-screen bg-[#050505] text-white">Post not found</div>;

  const { post, comments } = data;

  return (
    <div className="min-h-screen bg-[#050505] pt-20 px-6 pb-20">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to Community
        </button>

        {/* Post Content */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 mb-8">
            <div className="flex gap-2 mb-4">
                {post.tags.map((t: string) => (
                    <span key={t} className="text-[10px] uppercase font-bold tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">{t}</span>
                ))}
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">{post.title}</h1>
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono mb-8 border-b border-white/5 pb-6">
                <span>@{post.author.firstName}</span>
                <span>•</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                {post.content}
            </div>
        </div>

        {/* Comments Section */}
        <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <MessageSquare size={18} /> {comments.length} Comments
            </h3>
            
            <div className="space-y-4">
                {comments.map((c: any, i: number) => (
                    <div key={i} className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-neutral-400 shrink-0">
                            {c.author.firstName[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-white">{c.author.firstName}</span>
                                <span className="text-[10px] text-neutral-600">{new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-neutral-400">{c.content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Add Comment Box */}
        <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-xl sticky bottom-6 shadow-2xl">
            <div className="flex gap-4">
                <input 
                    className="flex-1 bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-accent outline-none"
                    placeholder="Add to the discussion..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && commentMutation.mutate()}
                />
                <button 
                    onClick={() => commentMutation.mutate()}
                    disabled={commentMutation.isPending || !comment.trim()}
                    className="px-4 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}