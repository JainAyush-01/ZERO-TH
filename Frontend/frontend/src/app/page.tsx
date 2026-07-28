"use client";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Terminal, Cpu, Zap, Shield, Globe, ChevronRight, Code2, Database } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { SpotlightCard } from "@/components/ui/spotlight-card"; // Reusing your component

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div ref={containerRef} className="relative bg-[#050505] selection:bg-accent/30 overflow-hidden">
      
      {/* GLOBAL BACKGROUND NOISE */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px]" />
         <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* SECTION 1: HERO (Full Screen) */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6 border-b border-white/5">
        <motion.div style={{ opacity, scale }} className="text-center max-w-4xl mx-auto z-10">
            
            {/* System Badge */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                    System Online v2.4
                </span>
            </motion.div>

            {/* Main Title */}
            <h1 className="text-6xl md:text-9xl font-bold tracking-tighter text-white mb-6 leading-[0.9]">
                ZERO<span className="text-accent">//</span>TH
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-neutral-500 font-mono mb-10 max-w-2xl mx-auto leading-relaxed">
                The computational interface for elite engineers. <br/>
                <span className="text-neutral-400">Compile. Benchmark. Optimize.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/problems">
                    <Button className="h-14 px-8 text-base bg-white text-black hover:bg-neutral-200 rounded-none font-bold tracking-wide min-w-[200px]">
                        ENTER SYSTEM <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </Link>
                <Link href="/register">
                    <Button variant="ghost" className="h-14 px-8 text-base text-neutral-400 hover:text-white border border-white/10 hover:bg-white/5 rounded-none font-mono min-w-[200px]">
                        INITIALIZE_ID
                    </Button>
                </Link>
            </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-neutral-600 flex flex-col items-center gap-2"
        >
            <span className="text-[10px] uppercase tracking-widest">Scroll to Explore</span>
            <ChevronRight className="rotate-90 w-4 h-4" />
        </motion.div>
      </section>

      {/* SECTION 2: SCROLLING TICKER */}
      <div className="border-y border-white/5 bg-[#0A0A0A] overflow-hidden py-3 relative z-20">
        <div className="flex animate-marquee whitespace-nowrap">
            {Array(20).fill("").map((_, i) => (
                <div key={i} className="flex items-center gap-8 mx-4 text-xs font-mono text-neutral-600 uppercase tracking-widest">
                    <span>High Performance Runtime</span>
                    <span className="text-accent">///</span>
                    <span>Docker Isolated</span>
                    <span className="text-accent">///</span>
                    <span>Redis Cached</span>
                    <span className="text-accent">///</span>
                </div>
            ))}
        </div>
      </div>

      {/* SECTION 3: BENTO GRID FEATURES */}
      <section className="py-32 px-6 max-w-[1400px] mx-auto relative z-10">
        <div className="mb-20">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">System Architecture</h2>
            <p className="text-neutral-500 max-w-xl text-lg">
                Built on a microservices infrastructure designed for sub-millisecond latency and execution safety.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Large */}
            <div className="md:col-span-2">
                <SpotlightCard className="h-full min-h-[300px] bg-charcoal/50">
                    <div className="p-8 h-full flex flex-col justify-between relative z-10">
                        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-6 text-accent border border-accent/20">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Piston Execution Engine</h3>
                            <p className="text-neutral-400 max-w-lg">
                                Code is executed in isolated Docker containers via the Piston API, ensuring security while maintaining high-performance execution speeds for C++, Java, Python, and JS.
                            </p>
                        </div>
                    </div>
                </SpotlightCard>
            </div>

            {/* Feature 2: Tall */}
            <div className="md:row-span-2">
                <SpotlightCard className="h-full min-h-[400px] bg-charcoal/50">
                     <div className="p-8 h-full flex flex-col relative z-10">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 text-purple-400 border border-purple-500/20">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Real-time Telemetry</h3>
                        <p className="text-neutral-400 mb-8">
                            Instant feedback on runtime complexity, memory usage, and test case validation.
                        </p>
                        
                        {/* Mock Graph Visual */}
                        <div className="mt-auto h-40 flex items-end gap-1 pb-4 border-b border-white/5">
                            {[40, 70, 45, 90, 65, 85, 40, 60].map((h, i) => (
                                <div key={i} className="flex-1 bg-white/10 hover:bg-accent transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>
                </SpotlightCard>
            </div>

            {/* Feature 3 */}
            <div className="">
                <SpotlightCard className="h-full min-h-[250px] bg-charcoal/50">
                    <div className="p-8 relative z-10">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/20">
                            <Shield size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Secure Sandbox</h3>
                        <p className="text-neutral-400 text-sm">
                            Ephemeral environments that teardown instantly after execution.
                        </p>
                    </div>
                </SpotlightCard>
            </div>

             {/* Feature 4 */}
             <div className="">
                <SpotlightCard className="h-full min-h-[250px] bg-charcoal/50">
                    <div className="p-8 relative z-10">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4 text-amber-400 border border-amber-500/20">
                            <Database size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Redis Caching</h3>
                        <p className="text-neutral-400 text-sm">
                            Rate limiting and session management powered by in-memory key-value stores.
                        </p>
                    </div>
                </SpotlightCard>
            </div>
        </div>
      </section>

      {/* SECTION 4: CODE PREVIEW */}
      <section className="py-32 border-y border-white/5 bg-[#080808] relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                    Optimized for <br/> <span className="text-accent">Speed & Precision.</span>
                </h2>
                <p className="text-neutral-400 text-lg">
                    The Monaco Editor provides a VS Code-like experience directly in your browser. With syntax highlighting for multiple languages and smart autocomplete.
                </p>
                
                <div className="flex gap-4">
                    <div className="flex flex-col gap-2">
                        <h4 className="text-white font-bold text-3xl">4+</h4>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Languages</p>
                    </div>
                    <div className="w-[1px] bg-white/10 h-12" />
                    <div className="flex flex-col gap-2">
                        <h4 className="text-white font-bold text-3xl">&lt;50ms</h4>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Latency</p>
                    </div>
                    <div className="w-[1px] bg-white/10 h-12" />
                    <div className="flex flex-col gap-2">
                        <h4 className="text-white font-bold text-3xl">99.9%</h4>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider">Uptime</p>
                    </div>
                </div>
            </div>

            {/* Mock Editor Visual */}
            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0C0C0C] shadow-2xl relative group">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#111]">
                    <div className="w-3 h-3 rounded-full bg-red-500/20" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20" />
                    <div className="ml-4 px-3 py-0.5 rounded-full bg-white/5 text-[10px] text-neutral-400 font-mono">
                        main.cpp
                    </div>
                </div>
                <div className="p-6 font-mono text-sm leading-relaxed overflow-hidden">
                    <div className="text-purple-400">#include <span className="text-emerald-400">&lt;iostream&gt;</span></div>
                    <div className="text-purple-400">using namespace <span className="text-neutral-200">std;</span></div>
                    <br />
                    <div className="text-blue-400">int <span className="text-yellow-400">main</span><span className="text-neutral-300">() {"{"}</span></div>
                    <div className="pl-4 text-neutral-400">// Initialize system core</div>
                    <div className="pl-4 text-neutral-200">System.init<span className="text-neutral-500">(</span><span className="text-emerald-400">&quot;ZEROTH&quot;</span><span className="text-neutral-500">);</span></div>
                    <br/>
                    <div className="pl-4 text-purple-400">return <span className="text-orange-400">0</span>;</div>
                    <div className="text-neutral-300">{"}"}</div>
                </div>
                
                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-accent/20 blur-[80px] group-hover:bg-accent/30 transition-colors pointer-events-none" />
            </div>

        </div>
      </section>

      {/* SECTION 5: FOOTER */}
      <footer className="py-12 border-t border-white/5 bg-[#050505] relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <Terminal size={20} className="text-white" />
                <span className="font-mono font-bold text-lg text-white tracking-tighter">
                    ZERO<span className="text-accent">//</span>TH
                </span>
            </div>
            
            <div className="flex gap-8 text-sm text-neutral-500">
                <Link href="#" className="hover:text-white transition-colors">Privacy Protocol</Link>
                <Link href="#" className="hover:text-white transition-colors">System Status</Link>
                <Link href="#" className="hover:text-white transition-colors">Source Code</Link>
            </div>

            <div className="text-xs text-neutral-600 font-mono">
                © 2025 ZEROTH INC. SYSTEM_ID: 884-X
            </div>
        </div>
      </footer>

    </div>
  );
}