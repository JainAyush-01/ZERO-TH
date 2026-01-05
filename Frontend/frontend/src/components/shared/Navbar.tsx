"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Terminal, ChevronRight } from "lucide-react";
import { UserMenu } from "./UserMenu"; 

export const Navbar = () => {
  const { data: user, isLoading } = useAuth(); 

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-white/5 rounded-md border border-white/10 group-hover:border-accent/50 transition-colors">
            <Terminal size={16} className="text-accent" />
          </div>
          <span className="font-mono font-bold text-sm tracking-tight text-white">
            ZERO<span className="text-accent">//TH</span>
          </span>
        </Link>

        {/* NAVIGATION */}
        <div className="flex items-center gap-6">
          {isLoading ? (
            <div className="h-8 w-24 bg-white/5 animate-pulse rounded-full" />
          ) : user ? (
            <>
                {/* DESKTOP MENU */}
                <div className="hidden md:flex items-center gap-6 text-xs font-mono">
                    <Link href="/problems" className="text-neutral-400 hover:text-white transition-colors">
                        MODULES
                    </Link>
                    <Link href="/contests" className="text-neutral-400 hover:text-white transition-colors">
                        CONTESTS
                    </Link>
                    {/* 🚀 ADDED VAULT HERE */}
                    <Link href="/vault" className="text-neutral-400 hover:text-white transition-colors">
                        VAULT
                    </Link>
                    <Link href="/leaderboard" className="text-neutral-400 hover:text-white transition-colors">
                        LEADERBOARD
                    </Link>
                    <Link href="/discuss" className="text-neutral-400 hover:text-white transition-colors">
                        COMMUNITY
                    </Link>
                    <Link href="/interview" className="text-neutral-400 hover:text-white transition-colors">
                        INTERVIEW
                    </Link>
                    <Link href="/playground" className="text-neutral-400 hover:text-white transition-colors">
                        PLAYGROUND
                    </Link>
                </div>
                
                {/* USER DROPDOWN */}
                <UserMenu />
            </>
          ) : (
            /* GUEST STATE */
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-xs h-8 text-neutral-400 hover:text-white">
                    Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" className="text-xs h-8 px-4 bg-white text-black hover:bg-white/90 hover:text-black shadow-none border-none">
                  Initialize <ChevronRight size={12} className="ml-1" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};