"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Editor, { useMonaco } from "@monaco-editor/react";
import { Mic, MicOff, Video, VideoOff, Layout, PhoneOff, Code2, Copy, Check, Lock, Play, Trash2, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};

const BOILERPLATES: Record<string, string> = {
  javascript: `// JavaScript Interview\nconsole.log('Hello Candidate');`,
  python: `# Python Interview\nprint("Hello Candidate")`,
  cpp: `// C++ Interview\n#include <iostream>\n\nint main() {\n    std::cout << "Hello Candidate" << std::endl;\n    return 0;\n}`,
  java: `// Java Interview\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Candidate");\n    }\n}`
};

export default function InterviewRoom() {
  const { id: roomId } = useParams();
  const { data: user } = useAuth();
  const router = useRouter();
  
  // State
  const [isHost, setIsHost] = useState(false);
  const [viewMode, setViewMode] = useState<"face" | "code">("face");
  
  // IDE State
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(BOILERPLATES["javascript"]);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Media State
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  const [copied, setCopied] = useState(false);
  
  // Stream State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  // 🔥 FIX: Render Keys to force video element updates
  const [videoResetKey, setVideoResetKey] = useState(0);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  // DOM Refs (for direct attachment)
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]); 
  const hasJoined = useRef(false); 
  const monaco = useMonaco();

  // --- CLEANUP ---
  const cleanupMedia = useCallback(() => {
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
              track.stop();
              track.enabled = false;
          });
          localStreamRef.current = null;
      }
      if (peerRef.current) {
          peerRef.current.close();
          peerRef.current = null;
      }
      if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
      }
  }, []);

  const processIceQueue = async () => {
      if(!peerRef.current) return;
      while(iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if(candidate) {
              try {
                  await peerRef.current.addIceCandidate(candidate);
              } catch (e) { console.error("Error adding buffered ICE:", e); }
          }
      }
  };

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    if (hasJoined.current || !user) return; 
    hasJoined.current = true;

    const init = async () => {
      try {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());

        setStatus("Accessing Media...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        localStreamRef.current = stream;
        setLocalStream(stream);

        setStatus("Connecting to Server...");
        socketRef.current = io(SOCKET_URL);
        socketRef.current.emit("join_interview", { roomId, userId: user._id });

        // --- LISTENERS ---
        socketRef.current.on("role_assigned", ({ isHost }: { isHost: boolean }) => {
            setIsHost(isHost);
            if (isHost) toast.success("You are the Host");
        });

        socketRef.current.on("user_joined", () => {
            toast.info("Peer joined - Connecting...");
            // 🔥 AUTOMATICALLY TRIGGER "RETRY CONNECTION" LOGIC
            // We wait 1s to ensure the other person's socket is fully ready
            setTimeout(() => {
                if (localStreamRef.current) initiateCall(localStreamRef.current);
            }, 1000);
        });

        socketRef.current.on("offer", async (offer) => {
            setStatus("Receiving Call...");
            const peer = createPeerConnection(stream);
            await peer.setRemoteDescription(offer);
            
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            
            socketRef.current?.emit("answer", { roomId, payload: answer });
            await processIceQueue();
        });

        socketRef.current.on("answer", async (answer) => {
            if (peerRef.current?.signalingState !== "have-local-offer") return;
            setStatus("Connected P2P");
            await peerRef.current.setRemoteDescription(answer);
            await processIceQueue();
        });

        socketRef.current.on("ice_candidate", async (candidate) => {
            if (peerRef.current && peerRef.current.remoteDescription) {
                try {
                    await peerRef.current.addIceCandidate(candidate);
                } catch (e) { console.error("ICE Error", e); }
            } else {
                iceCandidatesQueue.current.push(candidate);
            }
        });

        socketRef.current.on("user_disconnected", () => {
            setStatus("Peer Disconnected");
            setRemoteStream(null);
            remoteStreamRef.current = null;
            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }
        });

        // Sync Features
        socketRef.current.on("code_update", (newCode: string) => setCode(newCode));
        socketRef.current.on("layout_update", (mode: "face" | "code") => setViewMode(mode));
        socketRef.current.on("language_update", (lang: string) => setLanguage(lang));
        socketRef.current.on("output_update", (out: string) => setOutput(out));

      } catch (err) {
        console.error("Init Error:", err);
        toast.error("Media Access Failed");
        setStatus("Media Error");
      }
    };

    init();

    return () => cleanupMedia();
  }, [roomId, user, cleanupMedia]);

  // --- 2. VIDEO ATTACHMENT (With Keys for Force Refresh) ---
  useEffect(() => {
      // Small timeout to allow DOM to paint with new Keys
      const timer = setTimeout(() => {
          if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.play().catch(() => {});
          }
          if (remoteVideoRef.current && remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current;
              remoteVideoRef.current.play().catch(() => {});
          }
      }, 100);
      return () => clearTimeout(timer);
  }, [viewMode, videoResetKey, localStream]); // Trigger on Key Change

  // Monaco Theme
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('nexus-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#050505', 'editor.lineHighlightBackground': '#ffffff08' } });
      monaco.editor.setTheme('nexus-dark');
    }
  }, [monaco]);

  const createPeerConnection = (stream: MediaStream) => {
    if (peerRef.current) peerRef.current.close();

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = peer;

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
        setStatus("Connected P2P");
        const incomingStream = event.streams[0];
        
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
        
        // 🔥 FORCE UI REFRESH
        setVideoResetKey(prev => prev + 1);
    };

    peer.onicecandidate = (event) => {
        if (event.candidate) socketRef.current?.emit("ice_candidate", { roomId, payload: event.candidate });
    };

    return peer;
  };

  const initiateCall = async (stream: MediaStream) => {
      setStatus("Calling Peer...");
      try {
        const peer = createPeerConnection(stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current?.emit("offer", { roomId, payload: offer });
      } catch (e) { console.error("Call Error:", e); }
  };

  // --- ACTIONS ---
  const handleLayoutChange = (mode: "face" | "code") => {
      if (!isHost) return;
      setViewMode(mode);
      socketRef.current?.emit("layout_change", { roomId, mode, userId: user?._id });
  };
  const handleCodeChange = (value: string | undefined) => {
      const newCode = value || "";
      setCode(newCode);
      socketRef.current?.emit("code_change", { roomId, code: newCode });
  };
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = e.target.value;
      setLanguage(newLang);
      const newBoilerplate = BOILERPLATES[newLang];
      setCode(newBoilerplate);
      socketRef.current?.emit("language_change", { roomId, language: newLang });
      socketRef.current?.emit("code_change", { roomId, code: newBoilerplate });
  };
  const handleRun = async () => {
      setIsRunning(true);
      try {
          const { data } = await api.post('/submission/playground', { code, language });
          const result = data.output || data.stdout || data.stderr;
          setOutput(result);
          socketRef.current?.emit("output_sync", { roomId, output: result });
      } catch (err) { toast.error("Execution Failed"); } finally { setIsRunning(false); }
  };
  const copyRoomId = () => {
      navigator.clipboard.writeText(roomId as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Room ID copied");
  };
  const toggleMic = () => {
    if (localStreamRef.current) {
        const track = localStreamRef.current.getAudioTracks()[0];
        track.enabled = !track.enabled;
        setMicOn(track.enabled);
    }
  };
  const toggleCam = () => {
    if (localStreamRef.current) {
        const track = localStreamRef.current.getVideoTracks()[0];
        track.enabled = !track.enabled;
        setCamOn(track.enabled);
    }
  };
  const handleLeave = () => {
      cleanupMedia();
      router.push('/');
  };

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      
      {/* TOP BAR */}
      <div className="h-16 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${status.includes("Connected") ? "bg-emerald-500 animate-pulse" : status === "Media Error" ? "bg-red-500" : "bg-yellow-500"}`} />
            <span className="text-sm font-mono text-neutral-400 max-w-[150px] truncate">{status}</span>
            <button onClick={copyRoomId} className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-neutral-400 transition-colors">
                {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>} 
                <span className="font-mono max-w-[80px] truncate">{roomId}</span>
            </button>
            {isHost && !status.includes("Connected") && (
                <button onClick={() => localStreamRef.current && initiateCall(localStreamRef.current)} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded transition-colors" title="Retry Connection">
                    <RefreshCcw size={14} />
                </button>
            )}
        </div>

        <div className="flex bg-black p-1 rounded-lg border border-white/10">
            {isHost ? (
                <>
                    <button onClick={() => handleLayoutChange('face')} className={`px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'face' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}><Layout size={14} /> Face-to-Face</button>
                    <button onClick={() => handleLayoutChange('code')} className={`px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2 ${viewMode === 'code' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}><Code2 size={14} /> IDE Mode</button>
                </>
            ) : (
                <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-neutral-500"><Lock size={12} /> Syncing View</div>
            )}
        </div>

        <div className="flex items-center gap-3">
            <button onClick={toggleMic} className={`p-3 rounded-full transition-colors ${micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
            <button onClick={toggleCam} className={`p-3 rounded-full transition-colors ${camOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}>{camOn ? <Video size={18} /> : <VideoOff size={18} />}</button>
            <button onClick={handleLeave} className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors ml-4"><PhoneOff size={18} /></button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 relative">
        {viewMode === 'face' && (
            <div className="grid grid-cols-2 h-full gap-4 p-4">
                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    {/* 🔥 KEY: This key forces React to delete and recreate the video element when reset */}
                    <video key={`local-${videoResetKey}`} ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-md">You</div>
                </div>
                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video key={`remote-${videoResetKey}`} ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-md">Candidate</div>
                    {!remoteStream && <div className="absolute inset-0 flex items-center justify-center text-neutral-500">Peer Offline</div>}
                </div>
            </div>
        )}

        {viewMode === 'code' && (
            <div className="flex h-full">
                <div className="flex-1 flex flex-col border-r border-white/5">
                    {/* IDE Toolbar */}
                    <div className="h-12 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <select value={language} onChange={handleLanguageChange} className="bg-[#111] border border-white/10 rounded px-3 py-1 text-xs text-neutral-300 focus:outline-none focus:border-accent">
                                <option value="javascript">JavaScript</option><option value="python">Python</option><option value="cpp">C++</option><option value="java">Java</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                             {/* Added Re-connect button to IDE mode just in case */}
                             {isHost && !status.includes("Connected") && (
                                <button onClick={() => localStreamRef.current && initiateCall(localStreamRef.current)} className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded transition-colors" title="Retry Connection">
                                    <RefreshCcw size={12} />
                                </button>
                             )}
                            <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all disabled:opacity-50">
                                {isRunning ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} fill="currentColor" />} Run Code
                            </button>
                        </div>
                    </div>
                    {/* Editor & Output */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 relative">
                            <Editor height="100%" theme="nexus-dark" language={language === 'cpp' ? 'cpp' : language} value={code} onChange={handleCodeChange} options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 20 }, fontFamily: 'var(--font-mono)' }} />
                        </div>
                        <div className="h-[30%] bg-[#080808] border-t border-white/5 flex flex-col">
                            <div className="h-8 border-b border-white/5 px-4 flex items-center justify-between bg-white/[0.02]">
                                <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">Shared Output</span>
                                <button onClick={() => setOutput("")} className="text-neutral-600 hover:text-red-400 transition-colors"><Trash2 size={12}/></button>
                            </div>
                            <pre className="flex-1 p-4 font-mono text-xs text-neutral-300 overflow-auto whitespace-pre-wrap">{output || <span className="text-neutral-700 italic">// Run code to see output...</span>}</pre>
                        </div>
                    </div>
                </div>

                {/* Video Sidebar */}
                <div className="w-64 bg-[#09090b] flex flex-col p-2 gap-2 border-l border-white/10">
                    <div className="h-40 bg-black rounded-lg overflow-hidden border border-white/10 relative">
                        <video key={`remote-sm-${videoResetKey}`} ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/50 px-2 rounded">Peer</div>
                        {!remoteStream && <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs">Offline</div>}
                    </div>
                    <div className="h-40 bg-black rounded-lg overflow-hidden border border-white/10 relative">
                        <video key={`local-sm-${videoResetKey}`} ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/50 px-2 rounded">You</div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}