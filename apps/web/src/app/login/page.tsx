'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { X, Loader2 } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const supabase = createClient();
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                setError('Unable to verify user role.');
                return;
            }

            if (userData?.role === 'admin') {
                router.push('/admin/dashboard');
            } else if (userData?.role === 'partner') {
                router.push('/partner/dashboard');
            } else {
                setError('Access denied. Invalid user role.');
                await supabase.auth.signOut();
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">

            {/* Background Grid - Same as Homepage */}
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />

            {/* Hero Background Image - Same as Homepage */}
            <div className="fixed inset-0">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute inset-0 blur-sm scale-105">
                    <Image
                        src="/hero.png"
                        alt=""
                        fill
                        className="object-cover"
                        priority
                        quality={100}
                        unoptimized
                    />
                </div>
                {/* Gradients to fade the image */}
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
                {/* Extra darkening for the modal area */}
                <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Glass Modal */}
            <div className="relative w-full max-w-[420px] z-10">
                {/* Outer glow */}
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/25 via-white/5 to-white/10 blur-[1px]" />

                {/* Glass Card - Apple Style */}
                <div
                    className="relative rounded-3xl p-8 shadow-2xl shadow-black/40 overflow-hidden"
                    style={{
                        background: 'rgba(20, 20, 22, 0.75)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {/* Inner highlight - top edge glow */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    {/* Inner highlight - subtle top gradient */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.05] via-transparent to-transparent pointer-events-none" />

                    {/* Close Button */}
                    <Link
                        href="/"
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                        <X className="w-4 h-4 text-white/70" />
                    </Link>

                    {/* Tabs */}
                    <div
                        className="flex rounded-full p-1 mb-8 w-fit"
                        style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        <div
                            className="px-5 py-2 rounded-full text-white text-sm font-medium"
                            style={{ background: 'rgba(255, 255, 255, 0.12)' }}
                        >
                            Sign in
                        </div>
                        <button className="px-5 py-2 rounded-full text-white/50 text-sm font-medium hover:text-white/70 transition-colors">
                            Sign up
                        </button>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-semibold text-white mb-6 relative z-10">
                        Welcome back
                    </h1>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                        {error && (
                            <div
                                className="text-red-400 px-4 py-3 rounded-xl text-sm"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                            placeholder="Enter your email"
                            required
                        />

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                            placeholder="Password"
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black py-4 rounded-xl font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>



                    {/* Footer */}
                    <p className="text-center text-xs text-white/40 mt-6 relative z-10">
                        By signing in, you agree to our{' '}
                        <a href="#" className="text-white/60 hover:text-white/80 transition-colors underline">
                            Terms & Service
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
