import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google"; 
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { Navbar } from "@/components/shared/Navbar"; // <--- Import this

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AlgoNexus | High-Performance Computational Interface",
  description: "Advanced algorithmic training ground.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-obsidian text-white selection:bg-accent selection:text-white`}
      >
        <Providers>
            {/* Background Texture */}
            <div className="fixed inset-0 z-[-1] bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
            
            <Navbar /> {/* <--- ADD THIS LINE */}
            
            <main className="pt-16 min-h-screen">
              {children}
            </main>
            
            <Toaster position="bottom-right" theme="dark" />
        </Providers>
      </body>
    </html>
  );
}