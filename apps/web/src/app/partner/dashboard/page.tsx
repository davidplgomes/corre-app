'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { getPartnerPlaces } from '@/lib/services/places';
import { getPartnerCoupons, getPartnerCouponStats } from '@/lib/services/coupons';
import { getEventsByCreator } from '@/lib/services/events';
import type { User, PartnerPlace, PartnerCoupon, Event } from '@/types';
import {
    Building2, MapPin, Tag, Calendar, BarChart3,
    LogOut, Plus, ArrowRight, ArrowUpRight
} from 'lucide-react';

export default function PartnerDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPlaces: 0,
        activeCoupons: 0,
        totalRedemptions: 0,
        upcomingEvents: 0,
    });
    const [places, setPlaces] = useState<PartnerPlace[]>([]);
    const [coupons, setCoupons] = useState<PartnerCoupon[]>([]);
    const [events, setEvents] = useState<Event[]>([]);

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

            if (userData?.role !== 'partner') {
                router.push('/login');
                return;
            }

            setUser(userData as User);

            try {
                const [placesData, couponsData, eventsData, couponStats] = await Promise.all([
                    getPartnerPlaces(session.user.id),
                    getPartnerCoupons(session.user.id),
                    getEventsByCreator(session.user.id),
                    getPartnerCouponStats(session.user.id),
                ]);

                setPlaces(placesData);
                setCoupons(couponsData);
                setEvents(eventsData);

                const upcomingEvents = eventsData.filter(e => new Date(e.event_datetime) > new Date());

                setStats({
                    totalPlaces: placesData.length,
                    activeCoupons: couponStats.activeCoupons,
                    totalRedemptions: couponStats.totalRedemptions,
                    upcomingEvents: upcomingEvents.length,
                });
            } catch (error) {
                console.error('Error fetching partner data:', error);
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
        { icon: MapPin, label: 'Places', href: '/partner/dashboard/places', count: stats.totalPlaces, desc: 'Your locations' },
        { icon: Tag, label: 'Coupons', href: '/partner/dashboard/coupons', count: stats.activeCoupons, desc: 'Active discounts' },
        { icon: Calendar, label: 'Events', href: '/partner/dashboard/events', count: stats.upcomingEvents, desc: 'Upcoming runs' },
        { icon: BarChart3, label: 'Analytics', href: '/partner/dashboard/analytics', count: null, desc: 'Performance data' },
    ];

    const statsData = [
        { label: 'REDEMPTIONS', value: stats.totalRedemptions },
        { label: 'ACTIVE COUPONS', value: stats.activeCoupons },
        { label: 'UPCOMING EVENTS', value: stats.upcomingEvents },
        { label: 'PLACES', value: stats.totalPlaces },
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
                                    src="/corre_logo.png"
                                    alt="CORRE"
                                    width={120}
                                    height={40}
                                    className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                            </Link>
                            <div className="h-6 w-px bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-[#FF5722]" />
                                <span className="text-xs font-mono font-bold tracking-[0.2em] text-white/60">PARTNER</span>
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
                    <p className="text-sm tracking-[0.3em] text-white/40 uppercase mb-4">
                        Welcome back, {user?.full_name?.split(' ')[0] || 'Partner'}
                    </p>
                    <h1 className="text-5xl lg:text-7xl font-black text-white italic tracking-tighter leading-[0.85]">
                        Partner Dashboard
                    </h1>
                    <div className="w-24 h-2 bg-[#FF5722] mt-6" />
                    <p className="text-lg text-gray-400 mt-6 max-w-xl">
                        Manage your places, coupons, and events to engage with the running community.
                    </p>
                </div>

                {/* Stats Row */}
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/20 flex-1" />
                        <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em]">YOUR STATS</h3>
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

                {/* Quick Actions */}
                <div className="mb-16 p-8 rounded-2xl border border-[#FF5722]/30 bg-gradient-to-r from-[#FF5722]/10 to-transparent">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black italic text-white mb-2">Quick Actions</h3>
                            <p className="text-gray-400">Create new content to engage with runners</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/partner/dashboard/coupons/new"
                                className="group inline-flex items-center gap-3 px-5 py-3 bg-[#FF5722] hover:bg-[#E64A19] rounded-xl text-white font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New Coupon
                                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>
                            <Link
                                href="/partner/dashboard/events/new"
                                className="group inline-flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium border border-white/10 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New Event
                            </Link>
                            <Link
                                href="/partner/dashboard/places/new"
                                className="group inline-flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium border border-white/10 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add Place
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/20 flex-1" />
                        <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em]">MANAGE</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {menuItems.map((item, i) => (
                            <Link
                                key={i}
                                href={item.href}
                                className="group p-6 rounded-2xl border border-white/10 bg-[#0A0A0A] hover:border-[#FF5722]/50 transition-all duration-500"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#FF5722]/10 transition-colors">
                                            <item.icon className="w-7 h-7 text-white/60 group-hover:text-[#FF5722] transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black italic text-white">{item.label}</h3>
                                            <p className="text-sm text-gray-500">{item.desc}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {item.count !== null && (
                                            <span className="text-2xl font-black text-white/20 group-hover:text-[#FF5722] transition-colors">{item.count}</span>
                                        )}
                                        <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-[#FF5722] group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Items */}
                <div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/20 flex-1" />
                        <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em]">RECENT</h3>
                    </div>

                    {places.length === 0 && coupons.length === 0 ? (
                        <div className="p-12 rounded-2xl border border-white/10 bg-[#0A0A0A] text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <Tag className="w-8 h-8 text-white/20" />
                            </div>
                            <p className="text-xl font-black italic text-white mb-2">No items yet</p>
                            <p className="text-gray-500 mb-6">Start by adding a place or creating a coupon</p>
                            <Link
                                href="/partner/dashboard/places/new"
                                className="inline-flex items-center gap-2 text-[#FF5722] hover:underline"
                            >
                                Get started <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid lg:grid-cols-2 gap-4">
                            {/* Places */}
                            {places.length > 0 && (
                                <div className="p-6 rounded-2xl border border-white/10 bg-[#0A0A0A]">
                                    <h4 className="text-sm font-mono font-bold text-white/40 tracking-[0.1em] mb-4">YOUR PLACES</h4>
                                    <div className="space-y-3">
                                        {places.slice(0, 3).map((place) => (
                                            <div key={place.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <MapPin className="w-4 h-4 text-[#FF5722]" />
                                                    <div>
                                                        <p className="text-sm text-white">{place.name}</p>
                                                        <p className="text-xs text-white/40">{place.address || 'No address'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${place.is_active ? 'bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                                    <span className="text-xs text-white/40">{place.is_active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Coupons */}
                            {coupons.length > 0 && (
                                <div className="p-6 rounded-2xl border border-white/10 bg-[#0A0A0A]">
                                    <h4 className="text-sm font-mono font-bold text-white/40 tracking-[0.1em] mb-4">YOUR COUPONS</h4>
                                    <div className="space-y-3">
                                        {coupons.slice(0, 3).map((coupon) => (
                                            <div key={coupon.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <Tag className="w-4 h-4 text-[#FF5722]" />
                                                    <div>
                                                        <p className="text-sm text-white font-mono">{coupon.code}</p>
                                                        <p className="text-xs text-white/40">{coupon.discount_percent}% off • {coupon.current_uses} uses</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${coupon.is_active ? 'bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                                                    <span className="text-xs text-white/40">{coupon.is_active ? 'Active' : 'Inactive'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
