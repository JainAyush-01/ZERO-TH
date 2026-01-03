"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Video, Users, Keyboard } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api"; 

export default function InterviewLobby() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    setLoading(true);
    try {
        // CALL BACKEND
        const { data } = await api.post('/interview/create');
        // Redirect WITHOUT ?host=true (Server decides who is host)
        router.push(`/interview/${data.roomId}`);
    } catch (err) {
        toast.error("Failed to create room");
    } finally {
        setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!roomId) return;
    // Guests don't get the host flag
    router.push(`/interview/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-[#09090b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Left Side */}
        <div className="p-12 flex flex-col justify-between bg-gradient-to-br from-[#111] to-black border-r border-white/5">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-accent mb-6">
                    <Video size={12} /> Live Environment
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Technical <br/> Interview <span className="text-neutral-600">Core</span></h1>
                <p className="text-neutral-400 text-sm leading-relaxed">
                    Peer-to-peer latency-free environment. <br/>
                    Real-time code synchronization. <br/>
                    Isolated execution runtime.
                </p>
            </div>
            <div className="flex gap-4 text-neutral-600">
                <Users size={20} />
                <Keyboard size={20} />
            </div>
        </div>

        {/* Right Side */}
        <div className="p-12 flex flex-col justify-center gap-8">
            <div className="space-y-4">
                <h3 className="text-white font-medium">Start New Session</h3>
                <Button onClick={createRoom} className="w-full h-12 bg-white text-black hover:bg-neutral-200 text-sm font-bold">
                    Generate Room ID (Host)
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-white/10" />
                <span className="text-xs text-neutral-600 font-mono uppercase">OR</span>
                <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            <div className="space-y-4">
                <h3 className="text-white font-medium">Join Existing</h3>
                <div className="flex gap-2">
                    <input 
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="Paste Room ID..."
                        className="flex-1 bg-[#111] border border-white/10 rounded-lg px-4 text-sm text-white focus:border-accent outline-none font-mono"
                    />
                    <Button onClick={joinRoom} variant="outline" className="h-12 border-white/10 hover:bg-white/5">
                        Join
                    </Button>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}