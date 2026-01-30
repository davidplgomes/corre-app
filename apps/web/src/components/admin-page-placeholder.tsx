'use client';

import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';

interface AdminPagePlaceholderProps {
    title: string;
    description: string;
}

export default function AdminPagePlaceholder({ title, description }: AdminPagePlaceholderProps) {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#FF5722] selection:text-white pb-20">
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />

            <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/dashboard"
                            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-32 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8">
                    <Construction className="w-10 h-10 text-white/40" />
                </div>
                <h2 className="text-3xl font-black italic text-white mb-4">Under Construction</h2>
                <p className="text-white/60 max-w-md mx-auto mb-8">
                    {description}
                </p>
                <Link
                    href="/admin/dashboard"
                    className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                    Return to Dashboard
                </Link>
            </main>
        </div>
    );
}
