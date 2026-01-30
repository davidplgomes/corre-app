import React from 'react';

type BadgeVariant = 'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const variants = {
        default: 'bg-[#FF5722] text-white border-transparent',
        outline: 'bg-transparent text-white border-white/20',
        secondary: 'bg-white/10 text-white border-transparent hover:bg-white/20',
        destructive: 'bg-red-500/20 text-red-500 border-red-500/20',
        success: 'bg-green-500/20 text-green-500 border-green-500/20',
        warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20',
        info: 'bg-blue-500/20 text-blue-500 border-blue-500/20',
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
