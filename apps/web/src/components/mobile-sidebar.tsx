"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileSidebarProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
    side?: "left" | "right"
}

export function MobileSidebar({ isOpen, onClose, children, className, side = "left" }: MobileSidebarProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = "unset"
        }
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [isOpen])

    if (!mounted) return null

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: side === "left" ? "-100%" : "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: side === "left" ? "-100%" : "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className={cn(
                            "fixed top-0 bottom-0 z-50 w-[280px] bg-[#1c1c1e] shadow-2xl lg:hidden border-r border-white/10",
                            side === "left" ? "left-0" : "right-0",
                            className
                        )}
                    >
                        {/* Close Button Mobile - Optional, usually handled within content or backdrop click */}
                        <div className="absolute top-4 right-4 z-50 lg:hidden">
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="h-full overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    )
}
