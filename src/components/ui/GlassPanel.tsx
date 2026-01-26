import { cn } from "@/lib/cn";
import { HTMLAttributes, forwardRef } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "hoverable";
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    // Base Glass Styles
                    "rounded-xl border border-white/10 bg-panel",
                    "backdrop-blur-xl shadow-2xl transition-all duration-500",
                    "relative overflow-hidden group/glass",

                    // Inner Highlight Ring (Subtle 3D effect)
                    "before:absolute before:inset-0 before:pointer-events-none before:rounded-xl before:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]",
                    
                    // Scanline / Noise Effect (Subtle CSS pattern)
                    "after:absolute after:inset-0 after:pointer-events-none after:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] after:bg-[length:100%_4px,3px_100%] after:opacity-[0.05] after:mix-blend-overlay",

                    // Hover State
                    variant === "hoverable" && [
                        "hover:bg-white/[0.04] hover:border-white/20 hover:shadow-indigo-500/10 cursor-pointer",
                        "hover:-translate-y-1 hover:scale-[1.01]"
                    ],

                    className
                )}
                {...props}
            >
                {/* Glowing Corner Highlight on Hover */}
                {variant === "hoverable" && (
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full opacity-0 group-hover/glass:opacity-100 transition-opacity duration-700 pointer-events-none" />
                )}
                
                <div className="relative z-10">{children}</div>
            </div>
        );
    }
);

GlassPanel.displayName = "GlassPanel";
