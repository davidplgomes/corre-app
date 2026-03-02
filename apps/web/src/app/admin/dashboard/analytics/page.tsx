'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    CartesianGrid,
} from 'recharts';
import { TrendingUp, Users, Activity, DollarSign, ArrowUpRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type TimeRange = '7d' | '30d' | '90d';

type Metrics = {
    totalUsers: number;
    newUsers: number;
    totalRuns: number;
    totalRevenue: number;
    avgRunDistance: number;
    userGrowthRate: number;
};

type GrowthPoint = {
    date: string;
    users: number;
    runs: number;
};

type WeeklyRunPoint = {
    day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    runs: number;
};

type RoleDistributionPoint = {
    name: 'Users' | 'Partners' | 'Admins';
    value: number;
    fill: string;
};

type UserTimelineRow = {
    created_at: string;
};

type RunRow = {
    distance_km: number | null;
    created_at: string;
};

type RoleRow = {
    role: string | null;
};

type SubscriptionRow = {
    plan_id: string | null;
    status: string | null;
};

type TransactionRow = {
    amount: number | null;
};

type StripeProduct = {
    priceId: string;
    amount: number;
};

const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing']);

function parseDays(range: TimeRange): number {
    if (range === '7d') return 7;
    if (range === '90d') return 90;
    return 30;
}

function buildGrowthSeries(
    daysAgo: number,
    usersInRange: UserTimelineRow[],
    runs: RunRow[]
): GrowthPoint[] {
    const growthData: GrowthPoint[] = [];
    const bucketSize = daysAgo >= 90 ? 7 : daysAgo >= 30 ? 2 : 1;
    let cumulativeUsers = 0;

    for (let i = daysAgo; i >= 0; i -= bucketSize) {
        const bucketStart = new Date();
        bucketStart.setHours(0, 0, 0, 0);
        bucketStart.setDate(bucketStart.getDate() - i);

        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketEnd.getDate() + bucketSize);

        const usersInBucket = usersInRange.filter((user) => {
            const ts = new Date(user.created_at).getTime();
            return ts >= bucketStart.getTime() && ts < bucketEnd.getTime();
        }).length;

        const runsInBucket = runs.filter((run) => {
            const ts = new Date(run.created_at).getTime();
            return ts >= bucketStart.getTime() && ts < bucketEnd.getTime();
        }).length;

        cumulativeUsers += usersInBucket;
        growthData.push({
            date: bucketStart.toLocaleDateString('en-IE', { month: 'short', day: 'numeric' }),
            users: cumulativeUsers,
            runs: runsInBucket,
        });
    }

    return growthData;
}

function buildWeeklyRunPattern(runs: RunRow[]): WeeklyRunPoint[] {
    const weekdayCounts: Record<WeeklyRunPoint['day'], number> = {
        Mon: 0,
        Tue: 0,
        Wed: 0,
        Thu: 0,
        Fri: 0,
        Sat: 0,
        Sun: 0,
    };

    runs.forEach((run) => {
        const day = new Date(run.created_at).toLocaleDateString('en-IE', {
            weekday: 'short',
        }) as WeeklyRunPoint['day'];

        if (weekdayCounts[day] !== undefined) {
            weekdayCounts[day] += 1;
        }
    });

    return [
        { day: 'Mon', runs: weekdayCounts.Mon },
        { day: 'Tue', runs: weekdayCounts.Tue },
        { day: 'Wed', runs: weekdayCounts.Wed },
        { day: 'Thu', runs: weekdayCounts.Thu },
        { day: 'Fri', runs: weekdayCounts.Fri },
        { day: 'Sat', runs: weekdayCounts.Sat },
        { day: 'Sun', runs: weekdayCounts.Sun },
    ];
}

function computeMrrEur(subscriptions: SubscriptionRow[], products: StripeProduct[]): number {
    const amountByPriceId = new Map<string, number>(
        products.map((product) => [product.priceId, Number(product.amount || 0)])
    );

    const mrrCents = subscriptions.reduce((total, subscription) => {
        const status = (subscription.status || '').toLowerCase();
        if (!ACTIVE_SUB_STATUSES.has(status)) return total;

        const planId = subscription.plan_id || '';
        return total + (amountByPriceId.get(planId) || 0);
    }, 0);

    return mrrCents / 100;
}

function sumTransactionsEur(rows: TransactionRow[]): number {
    return rows.reduce((total, row) => total + (Number(row.amount || 0) || 0), 0) / 100;
}

export default function AdminAnalyticsPage() {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [metrics, setMetrics] = useState<Metrics>({
        totalUsers: 0,
        newUsers: 0,
        totalRuns: 0,
        totalRevenue: 0,
        avgRunDistance: 0,
        userGrowthRate: 0,
    });
    const [userGrowthData, setUserGrowthData] = useState<GrowthPoint[]>([]);
    const [runActivityData, setRunActivityData] = useState<WeeklyRunPoint[]>([]);
    const [roleDistribution, setRoleDistribution] = useState<RoleDistributionPoint[]>([]);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                setLoading(true);

                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;
                if (!session) {
                    router.push('/login');
                    return;
                }

                const { data: actor, error: actorError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (actorError) throw actorError;
                if (!actor || actor.role !== 'admin') {
                    router.push('/');
                    return;
                }

                const daysAgo = parseDays(timeRange);
                const rangeStart = new Date();
                rangeStart.setDate(rangeStart.getDate() - daysAgo);
                const rangeStartIso = rangeStart.toISOString();

                const [
                    usersRes,
                    newUsersRes,
                    newUsersTimelineRes,
                    runsRes,
                    usersWithRolesRes,
                    subscriptionsRes,
                    productsRes,
                    transactionsRes,
                ] = await Promise.all([
                    supabase.from('users').select('id', { count: 'exact', head: true }),
                    supabase
                        .from('users')
                        .select('id', { count: 'exact', head: true })
                        .gte('created_at', rangeStartIso),
                    supabase
                        .from('users')
                        .select('created_at')
                        .gte('created_at', rangeStartIso),
                    supabase
                        .from('runs')
                        .select('distance_km, created_at')
                        .gte('created_at', rangeStartIso),
                    supabase.from('users').select('role'),
                    supabase.from('subscriptions').select('plan_id, status'),
                    supabase.functions.invoke('stripe-sync-products'),
                    supabase
                        .from('transactions')
                        .select('amount')
                        .eq('status', 'succeeded')
                        .gte('created_at', rangeStartIso),
                ]);

                if (usersRes.error) throw usersRes.error;
                if (newUsersRes.error) throw newUsersRes.error;
                if (newUsersTimelineRes.error) throw newUsersTimelineRes.error;
                if (runsRes.error) throw runsRes.error;
                if (usersWithRolesRes.error) throw usersWithRolesRes.error;

                const runs = (runsRes.data || []) as RunRow[];
                const usersInRange = (newUsersTimelineRes.data || []) as UserTimelineRow[];
                const usersWithRoles = (usersWithRolesRes.data || []) as RoleRow[];

                let revenue = 0;

                if (!subscriptionsRes.error) {
                    const subscriptions = (subscriptionsRes.data || []) as SubscriptionRow[];
                    const stripeProducts = Array.isArray(productsRes.data)
                        ? (productsRes.data as StripeProduct[])
                        : [];
                    revenue = computeMrrEur(subscriptions, stripeProducts);
                }

                if (revenue <= 0 && !transactionsRes.error) {
                    revenue = sumTransactionsEur((transactionsRes.data || []) as TransactionRow[]);
                }

                const avgDistance = runs.length > 0
                    ? runs.reduce((total, run) => total + Number(run.distance_km || 0), 0) / runs.length
                    : 0;

                setMetrics({
                    totalUsers: usersRes.count || 0,
                    newUsers: newUsersRes.count || 0,
                    totalRuns: runs.length,
                    totalRevenue: revenue,
                    avgRunDistance: Number(avgDistance.toFixed(1)),
                    userGrowthRate: usersRes.count
                        ? Math.round(((newUsersRes.count || 0) / usersRes.count) * 100)
                        : 0,
                });

                const roleCounts = usersWithRoles.reduce<Record<string, number>>((counts, user) => {
                    const role = user.role || 'user';
                    counts[role] = (counts[role] || 0) + 1;
                    return counts;
                }, {});

                setRoleDistribution([
                    { name: 'Users', value: roleCounts.user || 0, fill: '#666' },
                    { name: 'Partners', value: roleCounts.partner || 0, fill: '#FF5722' },
                    { name: 'Admins', value: roleCounts.admin || 0, fill: '#fff' },
                ]);

                setUserGrowthData(buildGrowthSeries(daysAgo, usersInRange, runs));
                setRunActivityData(buildWeeklyRunPattern(runs));
            } catch (error) {
                console.error('Analytics fetch error:', error);
                toast.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        void loadAnalytics();
    }, [router, supabase, timeRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 md:flex-none ${
                                timeRange === range
                                    ? 'bg-[#FF5722] text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

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

            <div className="grid grid-cols-12 gap-6">
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
                                    contentStyle={{
                                        backgroundColor: 'rgba(20,20,20,0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                    }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#FF5722" strokeWidth={2} fill="url(#userGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

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
                                    contentStyle={{
                                        backgroundColor: 'rgba(20,20,20,0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        {roleDistribution.map((role, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.fill }} />
                                <span className="text-xs text-white/60">
                                    {role.name}: {role.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-white uppercase mb-4">Weekly Activity Pattern</h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={runActivityData} barSize={40}>
                            <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                            <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(20,20,20,0.9)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                }}
                            />
                            <Bar dataKey="runs" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]}>
                                {runActivityData.map((_, index) => (
                                    <Cell
                                        key={index}
                                        fill={index === 5 || index === 6 ? '#FF5722' : 'rgba(255,255,255,0.2)'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>
        </div>
    );
}
