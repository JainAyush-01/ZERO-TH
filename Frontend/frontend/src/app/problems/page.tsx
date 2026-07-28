"use client";
import { useState, useEffect } from 'react';
import { useProblems } from '@/hooks/use-problems'; 
import { useDebounce } from '@/hooks/use-debounce'; 
import { useAuth } from "@/hooks/use-auth"; // <--- 1. Import Auth
import { useRouter } from 'next/navigation'; // <--- 2. Import Router
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SpotlightCard } from '@/components/ui/spotlight-card'; 
import { ArrowUpRight, Search, ChevronLeft, ChevronRight, AlertCircle, RefreshCcw, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function ProblemPage() {
  const router = useRouter();
  const { data: user, isLoading: authLoading } = useAuth(); // <--- 3. Check User
  
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500); 
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  // 4. Pass 'enabled' to prevent 401 Error
  const { data, isLoading: dataLoading, isError, refetch } = useProblems({
      page,
      search: debouncedSearch,
      difficulty,
      category,
      enabled: !!user // Only fetch if user exists
  });


  // 5. AUTHENTICATION GUARD
  // If auth is done loading, and there is no user, show "Access Denied" or Redirect
  if (!authLoading && !user) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6">
            <div className="bg-white/5 p-6 rounded-full border border-white/10">
                <Lock size={40} className="text-neutral-400" />
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
                <p className="text-neutral-400">You must be logged in to access the modules.</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={() => router.push('/login')} className="px-8">
                    Login
                </Button>
                <Button onClick={() => router.push('/register')} variant="outline">
                    Initialize ID
                </Button>
            </div>
        </div>
      );
  }

  // 6. Normal Error Handling (Server Crash)
  if (isError) return (
    <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center bg-[#050505]">
        <div className="bg-red-500/10 p-4 rounded-full mb-4"><AlertCircle size={40} className="text-red-500" /></div>
        <h2 className="text-xl font-bold text-white mb-2">System Error</h2>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 transition-colors">
            <RefreshCcw size={16} /> Retry Connection
        </button>
    </div>
  );

  // 7. Loading State (Auth OR Data)
  if (authLoading || dataLoading) {
     return (
        <div className="min-h-screen pt-24 px-6 md:px-12 max-w-[1400px] mx-auto bg-[#050505]">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 pb-6 border-b border-white/5 gap-6">
                <div className="h-10 w-40 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => (<div key={i} className="h-48 bg-white/5 rounded-xl border border-white/5 animate-pulse" />))}
            </div>
        </div>
     );
  }

  const problems = data?.problems || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  return (
    <div className="min-h-screen pt-24 px-6 md:px-12 max-w-[1400px] mx-auto bg-[#050505] pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 pb-6 border-b border-white/5 gap-6">
        <div className="flex-1 w-full md:max-w-2xl">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">Modules</h1>
                <p className="text-neutral-500 font-mono text-xs mb-6">Select a computational problem to begin optimization.</p>
            </motion.div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-neutral-500"/></div>
                    <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-lg bg-[#0A0A0A] text-neutral-200 focus:border-accent outline-none transition-all" placeholder="Search algorithms..." value={search} onChange={(e) => {setSearch(e.target.value); setPage(1);}} />
                </div>
                <select value={difficulty} onChange={(e) => {setDifficulty(e.target.value); setPage(1);}} className="px-4 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-lg text-sm text-neutral-300 focus:border-accent outline-none cursor-pointer">
                    <option value="all" className="bg-[#111]">All Difficulties</option>
                    <option value="easy" className="bg-[#111]">Easy</option>
                    <option value="medium" className="bg-[#111]">Medium</option>
                    <option value="hard" className="bg-[#111]">Hard</option>
                </select>
                <select value={category} onChange={(e) => {setCategory(e.target.value); setPage(1);}} className="px-4 py-2.5 bg-[#0A0A0A] border border-white/10 rounded-lg text-sm text-neutral-300 focus:border-accent outline-none cursor-pointer">
                    <option value="all" className="bg-[#111]">All Topics</option>
                    <option value="Array" className="bg-[#111]">Array</option>
                    <option value="DP" className="bg-[#111]">Dynamic Programming</option>
                    <option value="Tree" className="bg-[#111]">Tree</option>
                </select>
            </div>
        </div>
        
        {/* Module Counter */}
        <div className="text-right hidden md:block">
            <div className="text-2xl font-bold text-white">{pagination.total}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Available</div>
        </div>
      </div>

      {/* GRID SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
        {problems.length === 0 ? (
            <div className="col-span-full py-20 text-center text-neutral-500 italic">No modules match your search parameters.</div>
        ) : (
            problems.map((prob: any, i:number) => (
                <ProblemCard key={prob._id} problem={prob} index={i} />
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
    </div>
  );
}

// Card Component
const ProblemCard = ({ problem, index }: { problem: any; index: number }) => {
  return (
    <Link href={`/problems/${problem._id}`} className="block h-full">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="h-full">
        <SpotlightCard className="h-full group hover:border-white/20 bg-[#0A0A0A]">
            <div className="p-6 flex flex-col h-full relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn("px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider", problem.difficulty === 'easy' ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : problem.difficulty === 'medium' ? "text-amber-400 border-amber-400/20 bg-amber-400/5" : "text-rose-400 border-rose-400/20 bg-rose-400/5")}>{problem.difficulty}</div>
                    <ArrowUpRight className="text-neutral-600 group-hover:text-white transition-colors" size={16} />
                </div>
                <h3 className="text-lg font-medium text-neutral-200 group-hover:text-white transition-colors mb-2 line-clamp-2">{problem.title}</h3>
                <div className="mt-auto pt-4 flex flex-wrap gap-2">
                    {problem.tags.split(',').slice(0, 2).map((tag:string) => (<span key={tag} className="text-[10px] text-neutral-500 font-mono bg-white/5 px-2 py-1 rounded">{tag}</span>))}
                </div>
            </div>
        </SpotlightCard>
      </motion.div>
    </Link>
  );
};