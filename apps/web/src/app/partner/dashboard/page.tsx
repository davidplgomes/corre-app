'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { ArrowUpRight, MapPin, Calendar, Tag, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getPartnerPlaces } from '@/lib/services/places';
import { getPartnerCoupons, getPartnerCouponStats } from '@/lib/services/coupons';
import { getEventsByCreator } from '@/lib/services/events';
import type { PartnerPlace, PartnerCoupon, Event } from '@/types';

export default function PartnerDashboardPage() {
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalPlaces: 0,
        activeCoupons: 0,
        totalRedemptions: 0,
        upcomingEvents: 0,
        places: [] as PartnerPlace[],
        coupons: [] as PartnerCoupon[],
        events: [] as Event[],
        activityChart: [] as any[]
    });

    // Mock Activity Data for Chart (replace with real analytics if available)
    const mockActivityData = [
        { time: 'Mon', val: 12 }, { time: 'Tue', val: 18 }, { time: 'Wed', val: 45 },
        { time: 'Thu', val: 28 }, { time: 'Fri', val: 55 }, { time: 'Sat', val: 42 },
        { time: 'Sun', val: 60 },
    ];

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) return;

                const [placesData, couponsData, eventsData, couponStats] = await Promise.all([
                    getPartnerPlaces(session.user.id),
                    getPartnerCoupons(session.user.id),
                    getEventsByCreator(session.user.id),
                    getPartnerCouponStats(session.user.id),
                ]);

                const upcomingEvents = eventsData.filter(e => new Date(e.event_datetime) > new Date());

                setData({
                    totalPlaces: placesData.length,
                    activeCoupons: couponStats.activeCoupons,
                    totalRedemptions: couponStats.totalRedemptions,
                    upcomingEvents: upcomingEvents.length,
                    places: placesData,
                    coupons: couponsData,
                    events: eventsData,
                    activityChart: mockActivityData // Use real data when available
                });
            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
                toast.error("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [timeRange]);

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header: Clean & Functional */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight uppercase mb-2">
                        Overview
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white/40">{new Date().toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' })} • Partner Portal</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-4 w-full lg:w-auto">
                    <button
                        onClick={() => {
                            const newRange = timeRange === '7d' ? '30d' : '7d';
                            setTimeRange(newRange);
                            toast.info(`Switched to Last ${newRange === '7d' ? '7' : '30'} Days view`);
                        }}
                        className="h-10 flex-1 lg:flex-none px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2 active:scale-95 duration-100"
                    >
                        <Calendar className="w-4 h-4 text-white/60" />
                        <span>Last {timeRange === '7d' ? '7' : '30'} Days</span>
                    </button>
                    <Link href="/partner/dashboard/coupons/new" className="flex-1 lg:flex-none">
                        <button
                            className="h-10 w-full px-4 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 transform duration-100"
                        >
                            Create Coupon
                        </button>
                    </Link>
                </div>
            </div>

            {/* Top Row: Key Metrics */}
            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid lg:grid-cols-4 gap-4 md:gap-6">
                <Link href="/partner/dashboard/coupons" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full relative overflow-hidden group cursor-pointer hover:border-[#FF5722]/30 transition-all">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100" />
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Total Redemptions</p>
                                <Tag className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">
                                {data.totalRedemptions}
                            </h3>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-[#FF5722] text-xs font-bold mb-1">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Views</span>
                                <span className="text-white/20 font-medium">Analytics</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-[70%] bg-[#FF5722] rounded-full" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <Link href="/partner/dashboard/coupons" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full cursor-pointer hover:border-white/20 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Active Coupons</p>
                                <Activity className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{data.activeCoupons}</h3>
                        </div>
                        <div className="h-10 flex items-end gap-1">
                            {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
                                <div key={i} className="flex-1 bg-white/20 rounded-t-sm hover:bg-[#FF5722] transition-colors" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </GlassCard>
                </Link>

                <Link href="/partner/dashboard/events" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full cursor-pointer hover:border-white/20 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Upcoming Events</p>
                                <Calendar className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{data.upcomingEvents}</h3>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 text-[#FF5722] text-xs font-bold mb-1">
                                <ArrowUpRight className="w-3 h-3" />
                                <span>Upcoming</span>
                            </div>

                        </div>
                    </GlassCard>
                </Link>

                <Link href="/partner/dashboard/places" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full cursor-pointer hover:border-white/20 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Total Places</p>
                                <MapPin className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{data.totalPlaces}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                <div className="flex-1 bg-[#FF5722] rounded-full" />
                                <div className="flex-1 bg-[#FF5722] rounded-full" />
                                <div className="w-2 bg-white/20 rounded-full" />
                            </div>
                        </div>
                        <p className="text-xs text-white/30 mt-1">Manage locations</p>
                    </GlassCard>
                </Link>
            </div>

            {/* Middle Row: Activity & Top Items */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:h-[400px]">

                {/* Main Activity Chart - 70% Width on Desktop */}
                <GlassCard className="w-full lg:col-span-8 p-6 flex flex-col h-[300px] lg:h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Engagement</h3>
                            <p className="text-xs text-white/40 font-medium mt-1">Interactions with your coupons and events.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-[#FF5722]/10 text-[#FF5722] text-[10px] font-bold uppercase tracking-wider">Redemptions</span>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.activityChart}>
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FF5722" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#FF5722" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#FF5722' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="val"
                                    stroke="#FF5722"
                                    strokeWidth={3}
                                    fill="url(#chartGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Top Coupons/Places List */}
                <div className="w-full lg:col-span-4 h-full min-h-[400px] flex flex-col gap-6">
                    <GlassCard className="flex-1 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white uppercase">Your Places</h3>
                            <Link href="/partner/dashboard/places" className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">View All</Link>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2">
                            {data.places.slice(0, 3).map((place) => (
                                <div key={place.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[#FF5722]">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white truncate w-24">{place.name}</p>
                                            <p className="text-[10px] text-white/40 truncate w-24">{place.address}</p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${place.is_active ? 'bg-[#22c55e]' : 'bg-white/20'}`} />
                                </div>
                            ))}
                            {data.places.length === 0 && <p className="text-xs text-white/40 text-center py-4">No places added yet.</p>}
                        </div>
                    </GlassCard>

                    <GlassCard className="flex-1 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-white uppercase">Active Coupons</h3>
                            <Link href="/partner/dashboard/coupons" className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">View All</Link>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2">
                            {data.coupons.slice(0, 3).map((coupon) => (
                                <div key={coupon.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-[#FF5722]">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white truncate w-24">{coupon.code}</p>
                                            <p className="text-[10px] text-white/40">{coupon.discount_percent}% Off</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-white/60 font-mono">{coupon.current_uses} uses</span>
                                </div>
                            ))}
                            {data.coupons.length === 0 && <p className="text-xs text-white/40 text-center py-4">No active coupons.</p>}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Bottom Row: Recent Events */}
            <div className="grid grid-cols-1 gap-6">
                <GlassCard className="p-0 flex flex-col">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase">Upcoming Events</h3>
                        <Link href="/partner/dashboard/events">
                            <button className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">View Schedule</button>
                        </Link>
                    </div>
                    <div className="flex-1 p-2">
                        {data.events.length > 0 ? data.events.slice(0, 3).map((event, i) => (
                            <Link key={i} href="/partner/dashboard/events" className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center font-bold text-white/40 group-hover:text-white group-hover:bg-[#FF5722] transition-all">
                                        {new Date(event.event_datetime).getDate()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white group-hover:text-[#FF5722] transition-colors">{event.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs text-white/40 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(event.event_datetime).toLocaleDateString('en-IE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs text-white/40 flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location_name || 'TBA'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`block px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider mb-1 w-fit ml-auto ${event.event_type === 'run' ? 'bg-[#FF5722]/10 text-[#FF5722]' : 'bg-white/5 text-white/40'
                                        }`}>
                                        {event.event_type}
                                    </span>
                                </div>
                            </Link>
                        )) : (
                            <div className="p-8 text-center text-white/40 text-xs text-center border-t border-white/5">
                                No scheduled events found.
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
