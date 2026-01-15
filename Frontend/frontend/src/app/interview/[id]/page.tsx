"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Editor, { useMonaco } from "@monaco-editor/react";
import { Mic, MicOff, Video, VideoOff, Layout, PhoneOff, Code2, Copy, Check, Lock, Play, Trash2, Loader2, RefreshCcw, Keyboard, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/api";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

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
  cpp: `// C++ Interview\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a;\n    cin >> a;\n    cout << "Value: " << a << endl;\n    return 0;\n}`,
  java: `// Java Interview\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Candidate");\n    }\n}`
};

export default function InterviewRoom() {
  const { id: roomId } = useParams();
  const { data: user } = useAuth();
  const router = useRouter();
  
  // --- STATE ---
  const [isHost, setIsHost] = useState(false);
  const [viewMode, setViewMode] = useState<"face" | "code">("face");
  
  // IDE State
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(BOILERPLATES["javascript"]);
  const [stdin, setStdin] = useState(""); // <--- NEW: Input State
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
  const [videoResetKey, setVideoResetKey] = useState(0); 

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
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

  const processIceQueue = useCallback(async () => {
      if(!peerRef.current) return;
      while(iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if(candidate) {
              try {
                  await peerRef.current.addIceCandidate(candidate);
              } catch (e) { console.error("ICE Buffer Error:", e); }
          }
      }
  }, []);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    if (hasJoined.current || !user || !roomId) return; 
    hasJoined.current = true;

    const init = async () => {
      try {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());

        setStatus("Accessing Media...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        localStreamRef.current = stream;
        setLocalStream(stream);

        setStatus("Connecting to Server...");
        socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current.emit("join_interview", { roomId, userId: user._id });

        // --- LISTENERS ---
        socketRef.current.on("role_assigned", ({ isHost }: { isHost: boolean }) => {
            setIsHost(isHost);
            if (isHost) toast.success("You are the Host");
        });

        socketRef.current.on("user_joined", () => {
            toast.info("Peer joined");
            setTimeout(() => {
                if (localStreamRef.current) initiateCall(localStreamRef.current);
            }, 1500);
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
            if (peerRef.current) {
                peerRef.current.close();
                peerRef.current = null;
            }
        });

        // Sync Features
        socketRef.current.on("code_update", (c: string) => setCode(c));
        socketRef.current.on("layout_update", (m: "face" | "code") => setViewMode(m));
        socketRef.current.on("language_update", (l: string) => setLanguage(l));
        socketRef.current.on("output_update", (o: string) => setOutput(o));
        // NEW: Sync Input
        socketRef.current.on("stdin_update", (s: string) => setStdin(s));

      } catch (err) {
        console.error("Init Error:", err);
        toast.error("Media Access Failed");
        setStatus("Media Error");
      }
    };

    init();

    return () => cleanupMedia();
  }, [roomId, user, cleanupMedia]);

  // --- 2. FORCE VIDEO ATTACHMENT ---
  useEffect(() => {
      const attachMedia = () => {
          if (localVideoRef.current && localStream) {
              localVideoRef.current.srcObject = localStream;
              localVideoRef.current.play().catch(() => {});
          }
          if (remoteVideoRef.current && remoteStream) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(() => {});
          }
      };
      const timer = setTimeout(attachMedia, 100);
      return () => clearTimeout(timer);
  }, [viewMode, videoResetKey, localStream, remoteStream]);

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
        setRemoteStream(event.streams[0]);
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
  
  // NEW: Input Handler with Sync
  const handleStdinChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setStdin(val);
      socketRef.current?.emit("stdin_change", { roomId, stdin: val });
  };

  const handleRun = async () => {
      setIsRunning(true);
      try {
          const { data } = await api.post('/submission/playground', { 
              code, 
              language, 
              stdin // Pass the custom input to backend
          });
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
    if (localStream) {
        const track = localStream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        setMicOn(track.enabled);
    }
  };
  const toggleCam = () => {
    if (localStream) {
        const track = localStream.getVideoTracks()[0];
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
      {/* HEADER (Same as before) */}
      <div className="h-16 border-b border-white/10 bg-[#09090b] flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${status.includes("Connected") ? "bg-emerald-500 animate-pulse" : "bg-yellow-500"}`} />
            <span className="text-sm font-mono text-neutral-400 max-w-[150px] truncate">{status}</span>
            <button onClick={copyRoomId} className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-neutral-400 transition-colors">
                {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>} 
                <span className="font-mono max-w-[80px] truncate">{roomId}</span>
            </button>
            {isHost && !status.includes("Connected") && (
                <button onClick={() => localStream && initiateCall(localStream)} className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded transition-colors" title="Retry Connection">
                    <RefreshCcw size={14} />
                </button>
            )}
        </div>
        <div className="flex bg-black p-1 rounded-lg border border-white/10">
            {isHost ? (
                <>
                    <button onClick={() => handleLayoutChange('face')} className={cn("px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2", viewMode === 'face' ? "bg-white text-black" : "text-neutral-500 hover:text-white")}><Layout size={14} /> Face-to-Face</button>
                    <button onClick={() => handleLayoutChange('code')} className={cn("px-4 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-2", viewMode === 'code' ? "bg-white text-black" : "text-neutral-500 hover:text-white")}><Code2 size={14} /> IDE Mode</button>
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
        {viewMode === 'face' ? (
            <div className="grid grid-cols-2 h-full gap-4 p-4">
                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video key={`local-f-${videoResetKey}`} ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-md">You</div>
                </div>
                <div className="relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    <video key={`remote-f-${videoResetKey}`} ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded text-xs text-white backdrop-blur-md">Candidate</div>
                    {!remoteStream && <div className="absolute inset-0 flex items-center justify-center text-neutral-500">Peer Offline</div>}
                </div>
            </div>
        ) : (
            <PanelGroup direction="horizontal" className="h-full">
                <Panel defaultSize={75} className="flex flex-col">
                    <PanelGroup direction="vertical">
                        {/* Editor Panel */}
                        <Panel defaultSize={65} className="flex flex-col bg-[#09090b]">
                            <div className="h-12 border-b border-white/5 bg-[#0A0A0A] flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <select value={language} onChange={handleLanguageChange} className="bg-[#111] border border-white/10 rounded px-3 py-1 text-xs text-neutral-300 focus:outline-none focus:border-accent">
                                        <option value="javascript">JavaScript</option><option value="python">Python</option><option value="cpp">C++</option><option value="java">Java</option>
                                    </select>
                                </div>
                                <button onClick={handleRun} disabled={isRunning} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all disabled:opacity-50">
                                    {isRunning ? <Loader2 size={12} className="animate-spin"/> : <Play size={12} fill="currentColor" />} Run Code
                                </button>
                            </div>
                            <div className="flex-1 relative">
                                <Editor height="100%" theme="nexus-dark" language={language === 'cpp' ? 'cpp' : language} value={code} onChange={handleCodeChange} options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 20 }, fontFamily: 'var(--font-mono)' }} />
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-1 bg-white/5 hover:bg-accent/40 transition-all" />
                        
                        {/* 🔥 SPLIT CONSOLE: INPUT / OUTPUT */}
                        <Panel defaultSize={35} className="flex bg-[#050505] border-t border-white/5">
                            {/* LEFT: INPUT */}
                            <div className="flex-1 border-r border-white/5 flex flex-col">
                                <div className="h-8 border-b border-white/5 flex items-center px-4 bg-white/[0.02] gap-2">
                                    <Keyboard size={12} className="text-neutral-500"/>
                                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-bold">Standard Input (Stdin)</span>
                                </div>
                                <textarea 
                                    value={stdin} 
                                    onChange={handleStdinChange} // Uses the sync handler
                                    className="flex-1 bg-transparent p-4 text-xs text-neutral-300 font-mono outline-none resize-none custom-scrollbar focus:bg-white/[0.02] transition-colors" 
                                    placeholder="// Enter input here (e.g. 5 10)..." 
                                />
                            </div>
                            
                            {/* RIGHT: OUTPUT */}
                            <div className="flex-1 flex flex-col bg-[#080808]">
                                <div className="h-8 border-b border-white/5 flex items-center px-4 bg-white/[0.02] justify-between">
                                    <div className="flex items-center gap-2">
                                        <Terminal size={12} className="text-neutral-500"/>
                                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-bold">Standard Output</span>
                                    </div>
                                    <button onClick={() => setOutput("")} className="p-1 hover:bg-white/10 rounded transition-colors text-neutral-500 hover:text-red-400"><Trash2 size={10}/></button>
                                </div>
                                <pre className="flex-1 p-4 text-xs text-emerald-500/90 font-mono overflow-auto whitespace-pre-wrap">{output || "// No output yet."}</pre>
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
                
                <PanelResizeHandle className="w-1 bg-white/5 hover:bg-accent/40 transition-all" />
                
                {/* Right Sidebar (Videos) */}
                <Panel defaultSize={25} minSize={20} className="bg-[#09090b] flex flex-col p-3 gap-3 border-l border-white/10">
                    <div className="h-44 bg-black rounded-xl border border-white/10 relative overflow-hidden shadow-xl">
                        <video key={`r-sm-${videoResetKey}`} ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">Peer</div>
                        {!remoteStream && <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs">Offline</div>}
                    </div>
                    <div className="h-44 bg-black rounded-lg overflow-hidden border border-white/10 relative">
                        <video key={`l-sm-${videoResetKey}`} ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">You</div>
                    </div>
                </Panel>
            </PanelGroup>
        )}
      </div>
    </div>
  );
}