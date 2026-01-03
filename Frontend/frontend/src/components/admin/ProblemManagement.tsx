"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

export default function ProblemManagement() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch Problems (Limit 10 per page default in backend)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-problems", page],
    queryFn: async () => (await api.get(`/problem/fetchAllProblem?page=${page}&limit=10`)).data,
  });

  const problems = data?.problems || [];
  const pagination = data?.pagination || { pages: 1, total: 0 };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/problem/delete/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-problems"] });
      toast.success("Module deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  if (isLoading) return <div className="text-neutral-500 italic p-4">Scanning Modules...</div>;

  return (
    <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Content Modules</h1>
            <span className="text-xs text-neutral-500 font-mono">Page {page} of {pagination.pages}</span>
        </div>

        {/* List */}
        <div className="grid gap-3">
            {problems.map((p: any) => (
                <div key={p._id} className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex justify-between items-center group hover:border-white/10 transition-colors">
                    <div>
                        <h3 className="font-medium text-white">{p.title}</h3>
                        <div className="flex gap-3 text-[10px] text-neutral-500 mt-1 uppercase font-mono tracking-wider">
                            <span className={p.difficulty === 'easy' ? 'text-emerald-500' : p.difficulty === 'medium' ? 'text-amber-500' : 'text-rose-500'}>
                                {p.difficulty}
                            </span>
                            <span className="text-neutral-700">|</span>
                            <span>{p.tags}</span>
                        </div>
                    </div>
                    <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => deleteMutation.mutate(p._id)} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
            <div className="flex justify-center gap-4 mt-4">
                <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        )}
    </div>
  );
}