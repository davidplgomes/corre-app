import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    variant?: 'default' | 'highlight'
}

export function GlassCard({ children, className, variant = 'default', ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "rounded-[24px] overflow-hidden relative transition-all duration-300",
                // Base Material
                "bg-[#1c1c1e]/60 backdrop-blur-[50px] saturate-[180%]",
                // Border - Extremely subtle, uniform
                "border border-white/[0.08]",
                // Shadow - Soft, diffuse
                "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]",
                // Inner lighting (top highlight)
                "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}
