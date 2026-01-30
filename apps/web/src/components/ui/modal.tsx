"use client"

import * as React from "react"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    children: React.ReactNode
    className?: string
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    className
}: ModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted) return null
    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content */}
            <div className={`relative w-full max-w-lg transform rounded-2xl border border-white/10 bg-[#0F0F0F] p-6 text-left shadow-2xl transition-all ${className || ""}`}>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {description && (
                    <p className="text-sm text-white/60 mb-6 font-medium">
                        {description}
                    </p>
                )}

                <div className="mt-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
