'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { getUserStats } from '@/lib/services/users';
import { getEventStats } from '@/lib/services/events';
import type { User } from '@/types';
import {
    Shield, Users, Building2, Calendar, MapPin, ShoppingBag,
    Trophy, FileText, BarChart3, LogOut, ChevronRight, ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalPartners: 0,
        totalEvents: 0,
        upcomingEvents: 0,
    });

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/login');
                return;
            }

            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (userData?.role !== 'admin') {
                router.push('/login');
                return;
            }

            setUser(userData as User);

            try {
                const [userStats, eventStats] = await Promise.all([
                    getUserStats(),
                    getEventStats(),
                ]);

                setStats({
                    totalUsers: userStats.totalUsers,
                    totalPartners: userStats.totalPartners,
                    totalEvents: eventStats.totalEvents,
                    upcomingEvents: eventStats.upcomingEvents,
                });
            } catch (error) {
                console.error('Error fetching admin stats:', error);
            }

            setLoading(false);
        };

        checkAuth();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#FF5722] animate-spin" />
            </div>
        );
    }

    const menuItems = [
        { icon: Users, label: 'Users', href: '/admin/dashboard/users', desc: 'Manage all users' },
        { icon: Building2, label: 'Partners', href: '/admin/dashboard/partners', desc: 'Business accounts' },
        { icon: Calendar, label: 'Events', href: '/admin/dashboard/events', desc: 'Moderate events' },
        { icon: MapPin, label: 'Runs', href: '/admin/dashboard/runs', desc: 'Run statistics' },
        { icon: ShoppingBag, label: 'Marketplace', href: '/admin/dashboard/marketplace', desc: 'Manage listings' },
        { icon: Trophy, label: 'Shop', href: '/admin/dashboard/shop', desc: 'Corre shop items' },
        { icon: FileText, label: 'Logs', href: '/admin/dashboard/logs', desc: 'Activity logs' },
        { icon: BarChart3, label: 'Analytics', href: '/admin/dashboard/analytics', desc: 'Platform insights' },
    ];

    const statsData = [
        { label: 'TOTAL USERS', value: stats.totalUsers },
        { label: 'ACTIVE PARTNERS', value: stats.totalPartners },
        { label: 'TOTAL EVENTS', value: stats.totalEvents },
        { label: 'UPCOMING', value: stats.upcomingEvents },
    ];

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#FF5722] selection:text-white">
            {/* Background Grid */}
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />

            {/* Header */}
            <header className="relative z-10 border-b border-white/10">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center gap-4 group">
                                <Image
                                    src="/logo.png"
                                    alt="CORRE"
                                    width={120}
                                    height={40}
                                    className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </Link>
                            <div className="h-6 w-px bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[#FF5722]" />
                                <span className="text-xs font-mono font-bold tracking-[0.2em] text-white/60">ADMIN</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-sm text-white/40 hidden md:block">{user?.email}</span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
                            >
                                <span className="hidden sm:inline">Logout</span>
                                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
                {/* Hero */}
                <div className="mb-16">
                    <h1 className="text-5xl lg:text-7xl font-black text-white italic tracking-tighter leading-[0.85]">
                        Admin Dashboard
                    </h1>
                    <div className="w-24 h-2 bg-[#FF5722] mt-6" />
                    <p className="text-lg text-gray-400 mt-6 max-w-xl">
                        Manage users, events, and platform settings.
                    </p>
                </div>

                {/* Stats Row */}
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/20 flex-1" />
                        <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em]">OVERVIEW</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {statsData.map((stat, i) => (
                            <div key={i} className="p-6 rounded-2xl border border-white/10 bg-[#0A0A0A] hover:border-white/20 transition-all duration-500">
                                <p className="text-xs font-mono font-bold text-white/40 tracking-[0.15em] mb-2">{stat.label}</p>
                                <p className="text-4xl font-black text-white tracking-tighter">{stat.value.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Menu Grid */}
                <div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/20 flex-1" />
                        <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em]">MANAGE</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {menuItems.map((item, i) => (
                            <Link
                                key={i}
                                href={item.href}
                                className="group p-6 rounded-2xl border border-white/10 bg-[#0A0A0A] hover:border-[#FF5722]/50 hover:bg-[#0A0A0A] transition-all duration-500"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#FF5722]/10 transition-colors">
                                        <item.icon className="w-6 h-6 text-white/60 group-hover:text-[#FF5722] transition-colors" />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#FF5722] group-hover:translate-x-1 transition-all" />
                                </div>
                                <h3 className="text-lg font-black italic text-white mb-1">{item.label}</h3>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="mt-16">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/20 flex-1" />
                        <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em]">RECENT</h3>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <div className="p-6 rounded-2xl border border-white/10 bg-[#0A0A0A]">
                            <h4 className="text-sm font-mono font-bold text-white/40 tracking-[0.1em] mb-4">LATEST ACTIVITY</h4>
                            <div className="space-y-3">
                                {[
                                    { action: 'New user registered', detail: 'john@example.com', time: '2 min ago' },
                                    { action: 'Event created', detail: 'Phoenix Park Morning Run', time: '15 min ago' },
                                    { action: 'Partner approved', detail: 'Coffee & Miles', time: '1 hour ago' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                        <div>
                                            <p className="text-sm text-white">{item.action}</p>
                                            <p className="text-xs text-white/40">{item.detail}</p>
                                        </div>
                                        <span className="text-xs text-white/30 font-mono">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl border border-white/10 bg-[#0A0A0A]">
                            <h4 className="text-sm font-mono font-bold text-white/40 tracking-[0.1em] mb-4">SYSTEM STATUS</h4>
                            <div className="space-y-3">
                                {[
                                    { name: 'API Server', status: 'Operational' },
                                    { name: 'Database', status: 'Operational' },
                                    { name: 'Auth Service', status: 'Operational' },
                                ].map((service, i) => (
                                    <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                        <span className="text-sm text-white">{service.name}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                            <span className="text-xs text-white/40">{service.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
