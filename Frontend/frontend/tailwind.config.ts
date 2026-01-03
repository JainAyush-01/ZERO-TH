import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#050505", // Main background
        charcoal: "#0F0F10", // Secondary background
        border: "rgba(255,255,255,0.08)",
        glass: "rgba(255,255,255,0.03)",
        accent: {
          DEFAULT: "#3B82F6", // Electric Blue
          glow: "rgba(59, 130, 246, 0.5)"
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      backgroundImage: {
        'noise': "url('/noise.png')", // You need a noise png in /public
      }
    },
  },
  plugins: [],
};
export default config;