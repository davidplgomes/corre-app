'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, ArrowRight, Zap, Users, ShoppingBag, Database, Activity, Server, MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import DashboardLocations from '@/components/admin/dashboard-locations';

type DashboardEvent = {
    id: string;
    title: string;
    event_datetime: string;
    location_name: string | null;
    event_type: string;
    points_value: number;
};

type ActivityPoint = {
    time: string;
    val: number;
};

type RevenuePoint = {
    day: string;
    revenue: number;
    orders: number;
};

function buildActivityChart(runs: Array<{ started_at?: string | null; created_at?: string | null }>): ActivityPoint[] {
    const buckets = [
        { label: '00:00', from: 0, to: 4 },
        { label: '04:00', from: 4, to: 8 },
        { label: '08:00', from: 8, to: 12 },
        { label: '12:00', from: 12, to: 16 },
        { label: '16:00', from: 16, to: 20 },
        { label: '20:00', from: 20, to: 24 },
    ];

    return buckets.map((bucket) => {
        const val = runs.filter((run) => {
            const source = run.started_at || run.created_at;
            if (!source) return false;
            const hour = new Date(source).getHours();
            return hour >= bucket.from && hour < bucket.to;
        }).length;

        return { time: bucket.label, val };
    });
}

function buildRevenueChart(
    txns: Array<{ created_at?: string | null; amount?: number | null }>
): RevenuePoint[] {
    const now = new Date();
    const output: RevenuePoint[] = [];

    for (let i = 6; i >= 0; i -= 1) {
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        dayStart.setDate(now.getDate() - i);

        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const daily = txns.filter((txn) => {
            if (!txn.created_at) return false;
            const ts = new Date(txn.created_at).getTime();
            return ts >= dayStart.getTime() && ts < dayEnd.getTime();
        });

        output.push({
            day: dayStart.toLocaleDateString('en-IE', { weekday: 'short' }),
            revenue: daily.reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0) / 100,
            orders: daily.length,
        });
    }

    return output;
}

function calculateChangePercent(current: number, previous: number): number {
    if (previous <= 0) {
        return current > 0 ? 100 : 0;
    }
    return ((current - previous) / previous) * 100;
}

export default function AdminDashboardPage() {
    const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
    const [isGenerating, setIsGenerating] = useState(false);
    const [data, setData] = useState({
        totalUsers: 0,
        newUsers: 0,
        activeRunners: 0,
        revenue: 0,
        avgLatency: '1m 24s',
        systemHealth: 0,
        activeRunnersChangePct: 0,
        revenueChangePct: 0,
        signupChangePct: 0,
        events: [] as DashboardEvent[],
        revenueChart: [] as RevenuePoint[],
        activityChart: [] as ActivityPoint[]
    });

    const supabase = createClient();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const startedAt = performance.now();
                const periodDays = timeRange === '7d' ? 7 : 30;
                const dateFilter = new Date();
                dateFilter.setDate(dateFilter.getDate() - periodDays);
                const dateFilterIso = dateFilter.toISOString();

                const previousWindowStart = new Date();
                previousWindowStart.setDate(previousWindowStart.getDate() - periodDays * 2);
                const previousWindowStartIso = previousWindowStart.toISOString();

                const nowIso = new Date().toISOString();

                const [
                    totalUsersRes,
                    newUsersRes,
                    previousNewUsersRes,
                    runsRes,
                    previousRunsRes,
                    txnsRes,
                    previousTxnsRes,
                    eventsRes,
                ] = await Promise.all([
                    supabase.from('users').select('id', { count: 'exact', head: true }),
                    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', dateFilterIso),
                    supabase
                        .from('users')
                        .select('id', { count: 'exact', head: true })
                        .gte('created_at', previousWindowStartIso)
                        .lt('created_at', dateFilterIso),
                    supabase.from('runs').select('id, started_at, created_at').gte('created_at', dateFilterIso),
                    supabase
                        .from('runs')
                        .select('id', { count: 'exact', head: true })
                        .gte('created_at', previousWindowStartIso)
                        .lt('created_at', dateFilterIso),
                    supabase
                        .from('transactions')
                        .select('amount, created_at')
                        .eq('status', 'succeeded')
                        .gte('created_at', dateFilterIso),
                    supabase
                        .from('transactions')
                        .select('amount')
                        .eq('status', 'succeeded')
                        .gte('created_at', previousWindowStartIso)
                        .lt('created_at', dateFilterIso),
                    supabase
                        .from('events')
                        .select('id, title, event_datetime, location_name, event_type, points_value')
                        .gte('event_datetime', nowIso)
                        .order('event_datetime', { ascending: true })
                        .limit(5),
                ]);

                if (totalUsersRes.error) throw totalUsersRes.error;
                if (newUsersRes.error) throw newUsersRes.error;
                if (previousNewUsersRes.error) throw previousNewUsersRes.error;
                if (runsRes.error) throw runsRes.error;
                if (previousRunsRes.error) throw previousRunsRes.error;
                if (txnsRes.error) throw txnsRes.error;
                if (previousTxnsRes.error) throw previousTxnsRes.error;
                if (eventsRes.error) throw eventsRes.error;

                const runs = runsRes.data || [];
                const txns = txnsRes.data || [];
                const previousTxns = previousTxnsRes.data || [];
                const events = (eventsRes.data || []) as DashboardEvent[];

                const revenue = txns
                    ? txns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / 100
                    : 0;
                const previousRevenue = previousTxns
                    ? previousTxns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / 100
                    : 0;

                const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
                const systemHealth = Math.max(90, 100 - Math.min(10, latencyMs / 250));

                setData(prev => ({
                    ...prev,
                    totalUsers: totalUsersRes.count || 0,
                    newUsers: newUsersRes.count || 0,
                    activeRunners: runs.length,
                    revenue,
                    avgLatency: `${latencyMs}ms`,
                    systemHealth: Number(systemHealth.toFixed(1)),
                    activeRunnersChangePct: Number(
                        calculateChangePercent(runs.length, previousRunsRes.count || 0).toFixed(1)
                    ),
                    revenueChangePct: Number(calculateChangePercent(revenue, previousRevenue).toFixed(1)),
                    signupChangePct: Number(
                        calculateChangePercent(newUsersRes.count || 0, previousNewUsersRes.count || 0).toFixed(1)
                    ),
                    events,
                    activityChart: buildActivityChart(runs),
                    revenueChart: buildRevenueChart(txns),
                }));
            } catch (error) {
                console.error("Dashboard Fetch Error:", error);
                toast.error("Failed to load dashboard data");
            }
        };

        fetchDashboardData();
    }, [timeRange]); // Re-run when filter changes

    const handleGenerateReport = async () => {
        if (isGenerating) return;
        setIsGenerating(true);

        try {
            // Generate Real CSV
            const headers = ['Metric', 'Value', 'Generated At'];
            const rows = [
                ['Total Users', data.totalUsers, new Date().toISOString()],
                ['New Users (Period)', data.newUsers, new Date().toISOString()],
                ['Active Runners', data.activeRunners, new Date().toISOString()],
                ['Total Revenue', `€${data.revenue}`, new Date().toISOString()],
            ];

            data.events.forEach((event) => {
                rows.push([
                    'Upcoming Event',
                    `${event.title} (${event.event_type})`,
                    new Date(event.event_datetime).toISOString(),
                ]);
            });

            let csvContent = "data:text/csv;charset=utf-8,"
                + headers.join(",") + "\n"
                + rows.map(e => e.join(",")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `corre_admin_report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link); // Required for FF
            link.click();
            document.body.removeChild(link);

            toast.success("Report downloaded successfully");
        } catch (e) {
            toast.error("Failed to generate report");
        } finally {
            setIsGenerating(false);
        }
    };

    const maxActivityValue = Math.max(1, ...data.activityChart.map((point) => point.val));

    return (
        <div className="space-y-6">
            {/* Header: Clean & Functional */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight uppercase mb-2">
                        Overview
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white/40">{new Date().toLocaleDateString('en-IE', { weekday: 'short', month: 'short', day: 'numeric' })} • Dublin, IE</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <button
                        onClick={() => {
                            const newRange = timeRange === '7d' ? '30d' : '7d';
                            setTimeRange(newRange);
                            toast.info(`Switched to Last ${newRange === '7d' ? '7' : '30'} Days view`);
                        }}
                        className="h-10 flex-1 lg:flex-none px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2 active:scale-95 duration-100 whitespace-nowrap"
                    >
                        <Calendar className="w-4 h-4 text-white/60" />
                        <span>Last {timeRange === '7d' ? '7' : '30'} Days</span>
                    </button>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className={cn(
                            "h-10 flex-1 lg:flex-none px-4 rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 transform duration-100 whitespace-nowrap",
                            isGenerating ? "bg-orange-500/50 cursor-not-allowed" : "bg-[#FF5722] hover:bg-[#F4511E]"
                        )}
                    >
                        {isGenerating ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {/* Top Row: Key Metrics (High Density) */}
            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid lg:grid-cols-4 gap-4 md:gap-6">
                <Link href="/admin/dashboard/subscription" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full relative overflow-hidden group cursor-pointer hover:border-[#FF5722]/30 transition-all">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity opacity-50 group-hover:opacity-100" />
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Total Revenue</p>
                                <DollarSign className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">
                                {data.revenue.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}
                            </h3>
                        </div>
                        <div>
                            <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${data.revenueChangePct >= 0 ? 'text-[#FF5722]' : 'text-red-400'}`}>
                                {data.revenueChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{data.revenueChangePct >= 0 ? '+' : ''}{data.revenueChangePct}%</span>
                                <span className="text-white/20 font-medium">vs last period</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full w-[70%] bg-[#FF5722] rounded-full" />
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <Link href="/admin/dashboard/users" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full cursor-pointer hover:border-white/20 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">Active Runners</p>
                                <Activity className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{data.activeRunners.toLocaleString()}</h3>
                        </div>

                        <div className={`flex items-center gap-1.5 text-xs font-bold mb-2 ${data.activeRunnersChangePct >= 0 ? 'text-[#FF5722]' : 'text-red-400'}`}>
                            {data.activeRunnersChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{data.activeRunnersChangePct >= 0 ? '+' : ''}{data.activeRunnersChangePct}%</span>
                            <span className="text-white/20 font-medium">vs last period</span>
                        </div>
                        <div className="h-10 flex items-end gap-1">
                            {data.activityChart.map((point) => (
                                <div
                                    key={point.time}
                                    className="flex-1 bg-white/20 rounded-t-sm hover:bg-[#FF5722] transition-colors"
                                    style={{ height: `${Math.max(10, Math.round((point.val / maxActivityValue) * 100))}%` }}
                                />
                            ))}
                        </div>
                    </GlassCard>
                </Link>

                <Link href="/admin/dashboard/users" className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full cursor-pointer hover:border-white/20 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">New Signups</p>
                                <Users className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{data.newUsers}</h3>
                        </div>
                        <div>
                            <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${data.signupChangePct >= 0 ? 'text-[#FF5722]' : 'text-red-400'}`}>
                                {data.signupChangePct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                <span>{data.signupChangePct >= 0 ? '+' : ''}{data.signupChangePct}%</span>
                                <span className="text-white/20 font-medium">{timeRange === '7d' ? 'last 7 days' : 'last 30 days'}</span>
                            </div>
                            {/* Mini Avatars */}
                            <div className="flex -space-x-2 mt-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-neutral-800 border-2 border-black flex items-center justify-center text-[8px] text-white/60">
                                        {i}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                </Link>

                <div className="contents">
                    <GlassCard className="p-6 flex flex-col justify-between h-[160px] w-full">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-white/40">System Health</p>
                                <Server className="w-4 h-4 text-white/20" />
                            </div>
                            <h3 className="text-3xl font-bold text-white tracking-tight">{data.systemHealth.toFixed(1)}%</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                <div className="flex-1 bg-[#FF5722] rounded-full" />
                                <div className="flex-1 bg-[#FF5722] rounded-full" />
                                <div className="flex-1 bg-[#FF5722] rounded-full" />
                                <div className="w-2 bg-white/20 rounded-full" />
                            </div>
                        </div>
                        <p className="text-xs text-white/30 mt-1">{data.avgLatency} avg latency</p>
                    </GlassCard>
                </div>
            </div>

            {/* Middle Row: Activity & Top Locations */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:h-[400px]">

                {/* Main Activity Chart - 70% Width */}
                <GlassCard className="w-full lg:col-span-8 p-6 flex flex-col h-[300px] lg:h-full">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Live Activity</h3>
                            <p className="text-xs text-white/40 font-medium mt-1">Real-time user engagement across tracked events.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded bg-[#FF5722]/10 text-[#FF5722] text-[10px] font-bold uppercase tracking-wider">Runners</span>
                            <span className="px-2 py-1 rounded bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-wider">Spectators</span>
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

                {/* Top Locations */}
                <div className="w-full lg:col-span-4 h-full min-h-[400px]">
                    <DashboardLocations />
                </div>
            </div>

            {/* Bottom Row: Improved Revenue & Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Bar Chart */}
                <Link href="/admin/dashboard/subscription" className="contents">
                    <GlassCard className="col-span-1 p-6 cursor-pointer hover:border-[#FF5722]/30 transition-all flex flex-col h-[300px] lg:h-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase">Weekly Revenue</h3>
                                <p className="text-xs text-white/40 mt-1">Succeeded transactions</p>
                            </div>
                            <div className="text-right">
                                <span className="block text-lg font-bold text-white">
                                    {data.revenue.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}
                                </span>
                                <span className={`text-xs font-bold flex items-center justify-end gap-1 ${data.revenueChangePct >= 0 ? 'text-[#FF5722]' : 'text-red-400'}`}>
                                    {data.revenueChangePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {data.revenueChangePct >= 0 ? '+' : ''}{data.revenueChangePct}%
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.revenueChart} barSize={8}>
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Bar dataKey="revenue" fill="#fff" radius={[2, 2, 0, 0]}>
                                        {data.revenueChart.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={index === 5 || index === 6 ? '#FF5722' : 'rgba(255,255,255,0.2)'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </Link>

                {/* Recent Events List */}
                <div className="lg:col-span-2 contents">
                    <GlassCard className="lg:col-span-2 p-0 flex flex-col">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white uppercase">Upcoming Events</h3>
                            <Link href="/admin/dashboard/events">
                                <button className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">View Schedule</button>
                            </Link>
                        </div>
                        <div className="flex-1 p-2">
                            {data.events.length > 0 ? data.events.map((event, i) => (
                                <Link key={i} href="/admin/dashboard/events" className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-colors cursor-pointer">
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
                                        <span className={`block px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider mb-1 w-fit ml-auto ${event.event_type === 'routine' ? 'bg-[#FF5722]/10 text-[#FF5722]' : 'bg-white/5 text-white/40'
                                            }`}>
                                            {event.event_type}
                                        </span>
                                        <span className="text-xs text-white/30 font-medium">+{event.points_value} pts</span>
                                    </div>
                                </Link>
                            )) : (
                                <div className="p-8 text-center text-white/40 text-xs text-center border-t border-white/5">
                                    No scheduled events found in database.
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
