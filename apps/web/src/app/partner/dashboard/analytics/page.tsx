'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/glass-card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Users, Eye, MousePointerClick, Loader2 } from 'lucide-react';
import { getPartnerScopeIdsByUserId } from '@/lib/services/partners';

type DailySeries = {
    date: string;
    redemptions: number;
    newCoupons: number;
};

type TierSeries = {
    tier: string;
    count: number;
};

type Summary = {
    totalRedemptions: number;
    totalCoupons: number;
    activeCoupons: number;
    upcomingEvents: number;
    totalPlaces: number;
};

type CouponRow = {
    id: string;
    is_active: boolean;
    created_at: string;
};

type CouponRedemptionRow = {
    id: string;
    coupon_id: string;
    redeemed_at: string;
    user_id: string | null;
};

type EventRow = {
    id: string;
    event_datetime: string;
};

function buildLast7DaysSeries(redemptionDates: string[], couponDates: string[]): DailySeries[] {
    const series: DailySeries[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(now.getDate() - i);

        const next = new Date(d);
        next.setDate(d.getDate() + 1);

        const label = d.toLocaleDateString('en-US', { weekday: 'short' });

        const redemptions = redemptionDates.filter((v) => {
            const t = new Date(v).getTime();
            return t >= d.getTime() && t < next.getTime();
        }).length;

        const newCoupons = couponDates.filter((v) => {
            const t = new Date(v).getTime();
            return t >= d.getTime() && t < next.getTime();
        }).length;

        series.push({ date: label, redemptions, newCoupons });
    }

    return series;
}

export default function PartnerAnalyticsPage() {
    const supabase = useMemo(() => createClient(), []);
    const [chartsMounted, setChartsMounted] = useState(false);

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<Summary>({
        totalRedemptions: 0,
        totalCoupons: 0,
        activeCoupons: 0,
        upcomingEvents: 0,
        totalPlaces: 0,
    });
    const [trafficData, setTrafficData] = useState<DailySeries[]>([]);
    const [tierData, setTierData] = useState<TierSeries[]>([]);

    useEffect(() => {
        setChartsMounted(true);
    }, []);

    useEffect(() => {
        const loadAnalytics = async () => {
            setLoading(true);
            try {
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;
                const session = sessionData.session;
                if (!session) return;

                const userId = session.user.id;
                const partnerScopeIds = await getPartnerScopeIdsByUserId(userId);

                const { data: partnerData, error: partnerError } = await supabase
                    .from('partners')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle();
                if (partnerError) throw partnerError;

                const partnerId = partnerData?.id || null;

                const { data: coupons, error: couponsError } = await supabase
                    .from('partner_coupons')
                    .select('id, is_active, created_at')
                    .in('partner_id', partnerScopeIds);
                if (couponsError) throw couponsError;

                const couponRows = (coupons || []) as CouponRow[];
                const couponIds = couponRows.map((coupon) => coupon.id);

                const [redemptionsRes, eventsRes, placesRes] = await Promise.all([
                    couponIds.length > 0
                        ? supabase
                            .from('coupon_redemptions')
                            .select('id, coupon_id, redeemed_at, user_id')
                            .in('coupon_id', couponIds)
                        : Promise.resolve({ data: [], error: null }),
                    supabase
                        .from('events')
                        .select('id, event_datetime')
                        .eq('creator_id', userId),
                    partnerId
                        ? supabase.from('partner_places').select('id', { count: 'exact', head: true }).eq('partner_id', partnerId)
                        : Promise.resolve({ count: 0, error: null } as { count: number | null; error: null }),
                ]);

                if (redemptionsRes.error) throw redemptionsRes.error;
                if (eventsRes.error) throw eventsRes.error;
                if (placesRes.error) throw placesRes.error;

                const redemptions = (redemptionsRes.data || []) as CouponRedemptionRow[];
                const events = (eventsRes.data || []) as EventRow[];

                const upcomingEvents = events.filter((e) => new Date(e.event_datetime) > new Date()).length;
                const activeCoupons = couponRows.filter((coupon) => coupon.is_active).length;

                setSummary({
                    totalRedemptions: redemptions.length,
                    totalCoupons: couponRows.length,
                    activeCoupons,
                    upcomingEvents,
                    totalPlaces: placesRes.count || 0,
                });

                setTrafficData(
                    buildLast7DaysSeries(
                        redemptions.map((r) => r.redeemed_at),
                        couponRows.map((coupon) => coupon.created_at)
                    )
                );

                const redeemedUserIds = Array.from(
                    new Set(
                        redemptions
                            .map((r) => r.user_id as string | null)
                            .filter((v): v is string => Boolean(v))
                    )
                );

                if (redeemedUserIds.length === 0) {
                    setTierData([]);
                } else {
                    const { data: usersData, error: usersError } = await supabase
                        .from('users')
                        .select('membership_tier')
                        .in('id', redeemedUserIds);
                    if (usersError) throw usersError;

                    const buckets: Record<string, number> = {};
                    (usersData || []).forEach((u) => {
                        const tier = u.membership_tier || 'unknown';
                        buckets[tier] = (buckets[tier] || 0) + 1;
                    });

                    const ranked = Object.entries(buckets)
                        .sort((a, b) => b[1] - a[1])
                        .map(([tier, count]) => ({ tier: tier.toUpperCase(), count }))
                        .slice(0, 5);

                    setTierData(ranked);
                }
            } catch (error) {
                console.error('Error loading partner analytics:', error);
                toast.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        void loadAnalytics();
    }, [supabase]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Analytics</h1>
                <p className="text-white/40">Live performance metrics from your partner data</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Total Redemptions</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{summary.totalRedemptions}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <Eye className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#22c55e] text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>Live</span>
                        <span className="text-white/20 font-medium">coupon usage count</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Active Coupons</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{summary.activeCoupons}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <MousePointerClick className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#22c55e] text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>{summary.totalCoupons}</span>
                        <span className="text-white/20 font-medium">total coupons</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Upcoming Events</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{summary.upcomingEvents}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#FF5722] text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>{summary.totalPlaces}</span>
                        <span className="text-white/20 font-medium">registered places</span>
                    </div>
                </GlassCard>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Traffic Chart */}
                <GlassCard className="lg:col-span-2 p-6 flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-6">Last 7 Days Activity</h3>
                    <div className="flex-1 w-full min-h-0">
                        {chartsMounted ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trafficData}>
                                    <defs>
                                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#FF5722" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#FF5722" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        itemStyle={{ color: '#FF5722' }}
                                    />
                                    <Area type="monotone" dataKey="redemptions" stroke="#FF5722" strokeWidth={3} fill="url(#viewsGradient)" />
                                    <Area type="monotone" dataKey="newCoupons" stroke="#fff" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full" />
                        )}
                    </div>
                </GlassCard>

                {/* Demographics */}
                <GlassCard className="p-6 flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-6">Redeemer Tier Mix</h3>
                    <div className="flex-1 w-full min-h-0">
                        {tierData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-white/40">
                                No redemption data yet
                            </div>
                        ) : (
                            chartsMounted ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={tierData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="tier" type="category" axisLine={false} tickLine={false} tick={{ fill: '#fff', fontSize: 12 }} width={70} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="count" fill="#333" radius={[0, 4, 4, 0]} barSize={28}>
                                            {tierData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#FF5722' : 'rgba(255,255,255,0.1)'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full w-full" />
                            )
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
