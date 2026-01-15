"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Editor, { useMonaco } from "@monaco-editor/react";
import { 
    Mic, MicOff, Video, VideoOff, Layout, PhoneOff, Code2, 
    Copy, Check, Lock, Play, Trash2, Loader2, RefreshCcw, 
    Keyboard, Terminal, ChevronDown 
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

const SOCKET_URL = "https://zero-th.onrender.com";
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
  
  const [isHost, setIsHost] = useState(false);
  const [viewMode, setViewMode] = useState<"face" | "code">("face");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(BOILERPLATES["javascript"]);
  const [stdin, setStdin] = useState(""); 
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  const [copied, setCopied] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoResetKey, setVideoResetKey] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]); 
  const hasJoined = useRef(false); 
  const monaco = useMonaco();

  // --- SAFE ERROR HELPER ---
  const safeToastError = (err: any, fallback: string) => {
    console.error(err);
    const message = err?.response?.data?.message || err?.message || fallback;
    toast.error(typeof message === 'string' ? message : fallback);
  };

  const cleanupMedia = useCallback(() => {
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
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

  const processIceQueue = useCallback(async () => {
      if(!peerRef.current || peerRef.current.signalingState === "closed") return;
      while(iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if(candidate) {
              try {
                  await peerRef.current.addIceCandidate(candidate);
              } catch (e) { console.error("ICE Buffer Error:", e); }
          }
      }
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream) => {
    if (peerRef.current) peerRef.current.close();
    const peer = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = peer;

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
        setStatus("Connected P2P");
        setRemoteStream(event.streams[0]);
        setVideoResetKey(k => k + 1);
    };

    peer.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
            socketRef.current.emit("ice_candidate", { roomId, payload: event.candidate });
        }
    };

    return peer;
  }, [roomId]);

  const initiateCall = useCallback(async (stream: MediaStream) => {
      if (!socketRef.current) return;
      setStatus("Calling Peer...");
      try {
        const peer = createPeerConnection(stream);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socketRef.current.emit("offer", { roomId, payload: offer });
      } catch (e) {
          safeToastError(e, "Handshake Initiation Failed");
      }
  }, [roomId, createPeerConnection]);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (hasJoined.current || !user || !roomId) return; 
    hasJoined.current = true;

    const init = async () => {
      try {
        setStatus("Accessing Media...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        setStatus("Connecting...");
        socketRef.current = io(SOCKET_URL);
        socketRef.current.emit("join_interview", { roomId, userId: user._id });

        // --- HANDLED SOCKET LISTENERS ---
        socketRef.current.on("role_assigned", ({ isHost }: { isHost: boolean }) => {
            setIsHost(isHost);
            if (isHost) toast.success("Interviewer Mode Active");
        });

        socketRef.current.on("user_joined", () => {
            if (localStreamRef.current) initiateCall(localStreamRef.current); 
        });

        socketRef.current.on("offer", async (offer) => {
            try {
                if (!localStreamRef.current || peerRef.current?.signalingState !== "stable") return;
                setStatus("Receiving Call...");
                const peer = createPeerConnection(localStreamRef.current);
                await peer.setRemoteDescription(offer);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socketRef.current?.emit("answer", { roomId, payload: answer });
                await processIceQueue();
            } catch (e) { console.error("Offer Error:", e); }
        });

        socketRef.current.on("answer", async (answer) => {
            try {
                if (peerRef.current?.signalingState === "have-local-offer") {
                    setStatus("Connected P2P");
                    await peerRef.current.setRemoteDescription(answer);
                    await processIceQueue();
                }
            } catch (e) { console.error("Answer Error:", e); }
        });

        socketRef.current.on("ice_candidate", async (candidate) => {
            if (peerRef.current?.remoteDescription && peerRef.current.signalingState !== "closed") {
                try { await peerRef.current.addIceCandidate(candidate); } 
                catch (e) { }
            } else { iceCandidatesQueue.current.push(candidate); }
        });

        socketRef.current.on("user_disconnected", () => {
            setStatus("Peer Disconnected");
            setRemoteStream(null);
            if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        });

        socketRef.current.on("code_update", (newCode: string) => setCode(newCode));
        socketRef.current.on("layout_update", (mode: "face" | "code") => setViewMode(mode));
        socketRef.current.on("language_update", (lang: string) => setLanguage(lang));
        socketRef.current.on("output_update", (out: string) => setOutput(out));
        socketRef.current.on("stdin_update", (s: string) => setStdin(s));

      } catch (err) {
        safeToastError(err, "Hardware Access Failed");
        setStatus("Media Error");
      }
    };

    init();
    return () => cleanupMedia();
  }, [roomId, user, cleanupMedia, createPeerConnection, initiateCall, processIceQueue]);

  // Video Re-attachment
  useEffect(() => {
      const timer = setTimeout(() => {
          if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
      }, 150);
      return () => clearTimeout(timer);
  }, [viewMode, videoResetKey, remoteStream]);

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
          const { data } = await api.post('/submission/playground', { code, language, stdin });
          const result = data.output || data.stdout || data.stderr;
          setOutput(result);
          socketRef.current?.emit("output_sync", { roomId, output: result });
      } catch (err) { safeToastError(err, "Execution Failed"); } finally { setIsRunning(false); }
  };

  const copyRoomId = () => {
      navigator.clipboard.writeText(String(roomId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Room ID copied");
  };

  return (
    <div className="h-screen bg-[#050505] flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="h-16 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${status.includes("Connected") ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
            <span className="text-xs font-mono text-neutral-400 max-w-[150px] truncate">{status}</span>
            <button onClick={copyRoomId} className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-neutral-400 transition-colors">
                {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>} 
                <span className="font-mono max-w-[100px] truncate">{roomId}</span>
            </button>
        </div>

        <div className="flex bg-black p-1 rounded-lg border border-white/10">
            {isHost ? (
                <>
                    <button onClick={() => handleLayoutChange('face')} className={cn("px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2", viewMode === 'face' ? "bg-white text-black" : "text-neutral-500")}>Face-to-Face</button>
                    <button onClick={() => handleLayoutChange('code')} className={cn("px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2", viewMode === 'code' ? "bg-white text-black" : "text-neutral-500")}>IDE Mode</button>
                </>
            ) : (
                <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-neutral-500 font-mono"><Lock size={12} /> SYNCED_VIEW</div>
            )}
        </div>

        <div className="flex items-center gap-3">
            <button onClick={() => { cleanupMedia(); router.push('/'); }} className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors ml-4"><PhoneOff size={18} /></button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 relative">
        {viewMode === 'face' ? (
            <div className="grid grid-cols-2 h-full gap-4 p-4">
                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video key={`l-${videoResetKey}`} ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-md font-mono">LOCAL_NODE</div>
                </div>
                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video key={`r-${videoResetKey}`} ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-md font-mono">PEER_NODE</div>
                    {!remoteStream && <div className="absolute inset-0 flex items-center justify-center text-neutral-600 font-mono text-xs animate-pulse">WAITING_FOR_UPLINK...</div>}
                </div>
            </div>
        ) : (
            <PanelGroup direction="horizontal" className="h-full">
                <Panel defaultSize={75} className="flex flex-col">
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={65} className="flex flex-col bg-[#09090b]">
                            <div className="h-12 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <Code2 size={14} className="text-neutral-500" />
                                    <select value={language} onChange={handleLanguageChange} className="bg-transparent text-xs text-neutral-300 outline-none">
                                        <option value="javascript">JavaScript</option>
                                        <option value="cpp">C++</option>
                                        <option value="python">Python</option>
                                    </select>
                                </div>
                                <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50">
                                    {isRunning ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} fill="currentColor" />} RUN_VECTORS
                                </button>
                            </div>
                            <div className="flex-1 relative">
                                 <Editor height="100%" theme="vs-dark" language={language === 'cpp' ? 'cpp' : language} value={code} onChange={handleCodeChange} options={{ fontSize: 14, fontFamily: 'var(--font-mono)', minimap: { enabled: false } }} />
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-1 bg-white/5 hover:bg-accent/40 transition-all" />
                        <Panel defaultSize={35} className="flex bg-[#050505] border-t border-white/5">
                            <div className="flex-1 border-r border-white/5 flex flex-col">
                                <div className="h-8 border-b border-white/5 flex items-center px-4 bg-white/[0.02] gap-2"><Keyboard size={12} className="text-neutral-500"/><span className="text-[10px] font-mono text-neutral-500 uppercase">Input</span></div>
                                <textarea value={stdin} onChange={(e) => { setStdin(e.target.value); socketRef.current?.emit("stdin_change", { roomId, stdin: e.target.value }); }} className="flex-1 bg-transparent p-4 text-xs text-neutral-300 font-mono outline-none resize-none" placeholder="Type input here..." />
                            </div>
                            <div className="flex-1 flex flex-col bg-[#080808]">
                                <div className="h-8 border-b border-white/5 flex items-center px-4 bg-white/[0.02] gap-2"><Terminal size={12} className="text-neutral-500"/><span className="text-[10px] font-mono text-neutral-500 uppercase">Output</span></div>
                                <pre className="flex-1 p-4 text-xs text-neutral-300 font-mono overflow-auto whitespace-pre-wrap">{output || "// NO_DATA"}</pre>
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
                <PanelResizeHandle className="w-1 bg-white/5 hover:bg-accent/40 transition-all" />
                <Panel defaultSize={25} minSize={20} className="bg-[#09090b] flex flex-col p-3 gap-3 border-l border-white/10">
                    <div className="h-44 bg-black rounded-xl border border-white/10 relative overflow-hidden">
                        <video key={`r-sm-${videoResetKey}`} ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">PEER</div>
                    </div>
                    <div className="h-44 bg-black rounded-xl border border-white/10 relative overflow-hidden">
                        <video key={`l-sm-${videoResetKey}`} ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">LOCAL</div>
                    </div>
                </Panel>
            </PanelGroup>
        )}
      </div>
    </div>
  );
}