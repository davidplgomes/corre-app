'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, CartesianGrid
} from 'recharts';
import {
    TrendingUp, Users, Activity, DollarSign, ArrowUpRight,
    ArrowDownRight, Download, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAnalyticsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [metrics, setMetrics] = useState({
        totalUsers: 0,
        newUsers: 0,
        totalRuns: 0,
        totalRevenue: 0,
        avgRunDistance: 0,
        userGrowthRate: 0
    });
    const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
    const [runActivityData, setRunActivityData] = useState<any[]>([]);
    const [roleDistribution, setRoleDistribution] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        checkAuth();
        fetchAnalytics();
    }, [timeRange]);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (userData?.role !== 'admin') {
            router.push('/');
        }
    };

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
            const dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - daysAgo);

            const rangeStartIso = dateFilter.toISOString();

            // Fetch basic counts and source series
            const [usersRes, newUsersRes, newUsersTimelineRes, runsRes, subsRes, plansRes, usersWithRolesRes] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', rangeStartIso),
                supabase.from('users').select('created_at').gte('created_at', rangeStartIso),
                supabase.from('runs').select('distance_km, created_at').gte('created_at', rangeStartIso),
                supabase.from('subscriptions').select('plan_id, status'),
                supabase.from('plans').select('id, price'),
                supabase.from('users').select('role'),
            ]);

            if (usersRes.error) throw usersRes.error;
            if (newUsersRes.error) throw newUsersRes.error;
            if (newUsersTimelineRes.error) throw newUsersTimelineRes.error;
            if (runsRes.error) throw runsRes.error;
            if (subsRes.error) throw subsRes.error;
            if (plansRes.error) throw plansRes.error;
            if (usersWithRolesRes.error) throw usersWithRolesRes.error;

            // Calculate revenue
            let revenue = 0;
            if (subsRes.data && plansRes.data) {
                const priceMap = new Map(plansRes.data.map(p => [p.id, Number(p.price)]));
                revenue = subsRes.data.reduce((acc, sub) => {
                    if (sub.status === 'active') return acc + (priceMap.get(sub.plan_id) || 0);
                    return acc;
                }, 0);
            }

            // Calculate avg run distance
            const runs = runsRes.data || [];
            const usersInRange = newUsersTimelineRes.data || [];
            const avgDistance = runs.length > 0
                ? runs.reduce((acc, r) => acc + Number(r.distance_km || 0), 0) / runs.length
                : 0;

            setMetrics({
                totalUsers: usersRes.count || 0,
                newUsers: newUsersRes.count || 0,
                totalRuns: runs.length,
                totalRevenue: revenue,
                avgRunDistance: Math.round(avgDistance * 10) / 10,
                userGrowthRate: usersRes.count ? Math.round((newUsersRes.count || 0) / usersRes.count * 100) : 0
            });

            // Fetch role distribution
            const usersWithRoles = usersWithRolesRes.data;
            if (usersWithRoles) {
                const roleCounts = usersWithRoles.reduce((acc: any, u) => {
                    acc[u.role] = (acc[u.role] || 0) + 1;
                    return acc;
                }, {});
                setRoleDistribution([
                    { name: 'Users', value: roleCounts.user || 0, fill: '#666' },
                    { name: 'Partners', value: roleCounts.partner || 0, fill: '#FF5722' },
                    { name: 'Admins', value: roleCounts.admin || 0, fill: '#fff' }
                ]);
            }

            // Growth chart from real timeline (bucketed for readability)
            const growthData: Array<{ date: string; users: number; runs: number }> = [];
            const bucketSize = daysAgo >= 90 ? 7 : daysAgo >= 30 ? 2 : 1;
            let cumulativeUsers = 0;
            for (let i = daysAgo; i >= 0; i -= bucketSize) {
                const bucketStart = new Date();
                bucketStart.setHours(0, 0, 0, 0);
                bucketStart.setDate(bucketStart.getDate() - i);

                const bucketEnd = new Date(bucketStart);
                bucketEnd.setDate(bucketEnd.getDate() + bucketSize);

                const usersInBucket = usersInRange.filter((u) => {
                    const ts = new Date(u.created_at).getTime();
                    return ts >= bucketStart.getTime() && ts < bucketEnd.getTime();
                }).length;

                const runsInBucket = runs.filter((r) => {
                    const ts = new Date(r.created_at).getTime();
                    return ts >= bucketStart.getTime() && ts < bucketEnd.getTime();
                }).length;

                cumulativeUsers += usersInBucket;
                growthData.push({
                    date: bucketStart.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' }),
                    users: cumulativeUsers,
                    runs: runsInBucket,
                });
            }
            setUserGrowthData(growthData);

            // Weekly activity pattern from real run dates
            const weekdayCounts: Record<string, number> = {
                Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0,
            };
            runs.forEach((run) => {
                const day = new Date(run.created_at).toLocaleDateString('en-IE', { weekday: 'short' });
                if (weekdayCounts[day] !== undefined) weekdayCounts[day] += 1;
            });

            setRunActivityData([
                { day: 'Mon', runs: weekdayCounts.Mon },
                { day: 'Tue', runs: weekdayCounts.Tue },
                { day: 'Wed', runs: weekdayCounts.Wed },
                { day: 'Thu', runs: weekdayCounts.Thu },
                { day: 'Fri', runs: weekdayCounts.Fri },
                { day: 'Sat', runs: weekdayCounts.Sat },
                { day: 'Sun', runs: weekdayCounts.Sun },
            ]);

        } catch (error) {
            console.error('Analytics fetch error:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Analytics & Insights</h2>
                    <p className="text-white/40 text-sm">Platform performance and growth metrics.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 md:flex-none ${timeRange === range
                                ? 'bg-[#FF5722] text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-white/40" />
                        <span className="text-xs font-bold uppercase text-white/40">Total Users</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{metrics.totalUsers.toLocaleString()}</span>
                        <span className="text-xs text-green-500 flex items-center">
                            <ArrowUpRight className="w-3 h-3" /> {metrics.userGrowthRate}%
                        </span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-white/40" />
                        <span className="text-xs font-bold uppercase text-white/40">New Users</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{metrics.newUsers.toLocaleString()}</span>
                        <span className="text-xs text-white/40">last {timeRange}</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-white/40" />
                        <span className="text-xs font-bold uppercase text-white/40">Total Runs</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{metrics.totalRuns.toLocaleString()}</span>
                        <span className="text-xs text-white/40">avg {metrics.avgRunDistance}km</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-white/40" />
                        <span className="text-xs font-bold uppercase text-white/40">MRR</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                            {metrics.totalRevenue.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}
                        </span>
                    </div>
                </GlassCard>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-12 gap-6">
                {/* User Growth Chart */}
                <GlassCard className="col-span-8 p-6">
                    <h3 className="text-sm font-bold text-white uppercase mb-4">User & Activity Growth</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={userGrowthData}>
                                <defs>
                                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#FF5722" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#FF5722" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                                <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#FF5722" strokeWidth={2} fill="url(#userGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Role Distribution */}
                <GlassCard className="col-span-4 p-6">
                    <h3 className="text-sm font-bold text-white uppercase mb-4">User Roles</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={roleDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        {roleDistribution.map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.fill }} />
                                <span className="text-xs text-white/60">{r.name}: {r.value}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Weekly Activity Pattern */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Weekly Activity Pattern</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={runActivityData} barSize={40}>
                            <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                            <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            <Bar dataKey="runs" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]}>
                                {runActivityData.map((entry, index) => (
                                    <Cell key={index} fill={index === 5 || index === 6 ? '#FF5722' : 'rgba(255,255,255,0.2)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>
        </div>
    );
}
