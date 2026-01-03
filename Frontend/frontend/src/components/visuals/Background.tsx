"use client";

export const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-obsidian text-white selection:bg-accent selection:text-white">
      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
      
      {/* Mesh Gradient Blob */}
      <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
    </div>
  );
};