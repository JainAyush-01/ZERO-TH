"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquarePlus, MessageCircle, Eye, ChevronUp, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import CreatePostModal from "@/components/discuss/CreatePostModal";

const CATEGORIES = ["All", "Interview Experience", "System Design", "General", "Compensation", "Career"];

export default function DiscussPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [page, setPage] = useState(1); // Track Page
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Posts with Pagination
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["posts", activeCategory, page], // Refetch when page/category changes
    queryFn: async () => {
        const { data } = await api.get(`/forum/all?tag=${activeCategory}&page=${page}`);
        return data; // Returns { posts: [], pagination: {} }
    },
    // Reset page to 1 if category changes (handled manually below or via effect, but this keeps cache clean)
  });

  const posts = data?.posts || [];
  const pagination = data?.pagination || { pages: 1, total: 0 };

  const handleCategoryChange = (cat: string) => {
      setActiveCategory(cat);
      setPage(1); // Reset to page 1 on filter change
  };

  return (
    <div className="min-h-screen bg-[#050505] pt-24 px-6 md:px-12 max-w-6xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/10 pb-8 gap-6">
        <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Community <span className="text-accent">Hub</span></h1>
            <p className="text-neutral-500 text-sm font-mono">Discuss algorithms, share interview experiences, and optimize your career.</p>
        </div>
        <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-neutral-200 rounded-lg font-bold transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
            <MessageSquarePlus size={18} /> New Discussion
        </button>
      </div>

      {/* Categories / Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(cat => (
            <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={cn(
                    "px-4 py-2 rounded-full text-xs font-mono border transition-all",
                    activeCategory === cat 
                        ? "bg-accent/10 border-accent text-accent" 
                        : "bg-[#0A0A0A] border-white/10 text-neutral-400 hover:border-white/30 hover:text-white"
                )}
            >
                {cat}
            </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="grid gap-4 mb-12">
        {isLoading ? (
            <div className="text-center py-20 text-neutral-500 animate-pulse">Loading discussions...</div>
        ) : posts.length === 0 ? (
            <div className="text-center py-20 text-neutral-600 italic">No discussions found in this frequency. Be the first to transmit.</div>
        ) : (
            posts.map((post: any, i:number) => (
                <Link key={post._id} href={`/discuss/${post._id}`}>
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-[#0A0A0A] border border-white/5 p-6 rounded-xl hover:border-white/20 transition-all group relative overflow-hidden"
                    >
                        {/* Hover Glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="space-y-2">
                                <div className="flex gap-2 mb-2">
                                    {post.tags.map((t: string) => (
                                        <span key={t} className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-white/5 px-2 py-0.5 rounded">{t}</span>
                                    ))}
                                </div>
                                <h3 className="text-lg font-medium text-white group-hover:text-accent transition-colors">{post.title}</h3>
                                <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono mt-2">
                                    <span className="flex items-center gap-1"><Hash size={12}/> {post.author.firstName}</span>
                                    <span className="flex items-center gap-1">• {new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 text-neutral-500">
                                <div className="text-center">
                                    <div className="flex items-center gap-1 text-white font-bold"><ChevronUp size={14} className="text-emerald-500"/> {post.upvotes.length}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center gap-1 hover:text-white transition-colors"><MessageCircle size={16}/> {post.commentsCount}</div>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center gap-1"><Eye size={16}/> {post.views}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </Link>
            ))
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-4">
            <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-mono text-neutral-400">
                Page <span className="text-white">{page}</span> of <span className="text-white">{pagination.pages}</span>
            </span>

            <button 
                disabled={page === pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      )}

      {isCreating && <CreatePostModal onClose={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); refetch(); }} />}
    </div>
  );
}