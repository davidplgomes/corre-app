import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, loading, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"

        // Industrial styles
        const variants = {
            default: "bg-[#FF5722] text-white hover:bg-[#F4511E] shadow-[0_0_20px_rgba(255,87,34,0.2)] border border-transparent",
            destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
            outline: "border border-white/10 bg-transparent hover:bg-white/5 text-white",
            secondary: "bg-white/10 text-white hover:bg-white/20 border border-white/5",
            ghost: "hover:bg-white/5 hover:text-white text-white/60",
            link: "text-white underline-offset-4 hover:underline",
        }

        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 tracking-wide",
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                {...props}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button }
