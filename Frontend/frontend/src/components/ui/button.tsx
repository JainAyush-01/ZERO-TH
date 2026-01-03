import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon"; // <--- Added size support
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // 1. Base Styles (Layout & Animation)
          "relative inline-flex items-center justify-center overflow-hidden font-mono font-medium tracking-tight transition-all duration-200 rounded-lg group disabled:opacity-50 disabled:pointer-events-none select-none",
          
          // 2. Size Variants
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-6 py-2 text-sm",
          size === "lg" && "px-8 py-3 text-base",
          size === "icon" && "h-9 w-9 p-0",

          // 3. Color Variants
          variant === "primary" && "bg-accent text-white hover:bg-accent/90 shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-transparent",
          variant === "ghost" && "bg-transparent text-neutral-400 hover:text-white hover:bg-white/5",
          variant === "outline" && "bg-transparent border border-white/10 text-white hover:bg-white/5",
          variant === "danger" && "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30",
          
          className
        )}
        {...props}
      >
        {/* Optional: Add a subtle shine effect for primary buttons */}
        {variant === "primary" && (
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
        )}
        
        <span className="relative z-10 flex items-center gap-2">
          {props.children}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };