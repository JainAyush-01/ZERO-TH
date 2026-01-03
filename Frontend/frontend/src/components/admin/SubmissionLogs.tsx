"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

export default function SubmissionLogs() {
  const [page, setPage] = useState(1);

  // Fetch with Pagination
  const { data, isLoading } = useQuery({
    queryKey: ["admin-submissions", page], // Refetch when page changes
    queryFn: async () => (await api.get(`/submission/all?page=${page}`)).data,
  });

  const submissions = data?.submissions || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  if (isLoading) return <div className="p-4 text-neutral-500 italic">Accessing Mainframe Logs...</div>;

  if (submissions.length === 0) {
      return (
          <div className="p-8 text-center text-neutral-500 border border-white/5 rounded-xl bg-[#0A0A0A]">
              <AlertTriangle className="mx-auto mb-2 opacity-50" />
              No submissions found.
          </div>
      );
  }

  return (
    <div className="space-y-4">
        {/* Table */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1.5fr_1fr_100px_120px] p-4 text-xs font-mono text-neutral-500 uppercase border-b border-white/5 bg-white/[0.02]">
            <div>User</div>
            <div>Problem</div>
            <div>Status</div>
            <div>Runtime</div>
            <div className="text-right">Time</div>
        </div>
        <div className="divide-y divide-white/5">
            {submissions.map((sub: any) => (
            <div key={sub._id} className="grid grid-cols-[1.5fr_1.5fr_1fr_100px_120px] p-4 items-center text-sm hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col">
                    <span className="text-white font-medium">{sub.userId?.firstName || <span className="text-red-400 italic">Deleted User</span>}</span>
                    <span className="text-[10px] text-neutral-600 font-mono">{sub.userId?.emailId || "N/A"}</span>
                </div>
                
                <div className="text-neutral-300 truncate pr-4">
                    {sub.problemId?.title || <span className="text-red-400 italic">Deleted Problem</span>}
                </div>

                <div className="flex items-center gap-2">
                    {sub.status === 'accepted' ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-xs border border-emerald-400/20">
                            <CheckCircle2 size={12} /> Accepted
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded text-xs border border-rose-400/20 capitalize">
                            <XCircle size={12} /> {sub.status}
                        </span>
                    )}
                </div>

                <div className="text-neutral-400 font-mono text-xs">{sub.runtime}ms</div>

                <div className="text-right text-neutral-600 text-xs font-mono">
                    {new Date(sub.createdAt).toLocaleString()}
                </div>
            </div>
            ))}
        </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center px-2">
            <span className="text-xs text-neutral-500 font-mono">
                Total Logs: <span className="text-white">{pagination.total}</span>
            </span>
            {pagination.pages > 1 && (
                <div className="flex gap-2">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs flex items-center px-2 text-neutral-500">
                        {page} / {pagination.pages}
                    </span>
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
    </div>
  );
}