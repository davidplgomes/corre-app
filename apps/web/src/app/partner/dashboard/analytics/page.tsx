'use client';

import { GlassCard } from '@/components/ui/glass-card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { ArrowUpRight, TrendingUp, Users, Eye, MousePointerClick } from 'lucide-react';

export default function PartnerAnalyticsPage() {
    // Mock Data - In real app, fetch from Supabase
    const viewsData = [
        { date: 'Mon', views: 120, clicks: 45 },
        { date: 'Tue', views: 150, clicks: 52 },
        { date: 'Wed', views: 180, clicks: 68 },
        { date: 'Thu', views: 220, clicks: 85 },
        { date: 'Fri', views: 250, clicks: 92 },
        { date: 'Sat', views: 300, clicks: 120 },
        { date: 'Sun', views: 280, clicks: 105 },
    ];

    const demographicsData = [
        { age: '18-24', count: 150 },
        { age: '25-34', count: 420 },
        { age: '35-44', count: 280 },
        { age: '45+', count: 120 },
    ];

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Analytics</h1>
                <p className="text-white/40">Insights into your places and events performance</p>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Total Views</p>
                            <h3 className="text-3xl font-bold text-white mt-1">1,542</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <Eye className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#22c55e] text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>+12.5%</span>
                        <span className="text-white/20 font-medium">vs last week</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Coupon Clicks</p>
                            <h3 className="text-3xl font-bold text-white mt-1">428</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <MousePointerClick className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#22c55e] text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>+8.2%</span>
                        <span className="text-white/20 font-medium">vs last week</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Event Reach</p>
                            <h3 className="text-3xl font-bold text-white mt-1">850</h3>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[#FF5722] text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        <span>High Engagement</span>
                    </div>
                </GlassCard>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Traffic Chart */}
                <GlassCard className="lg:col-span-2 p-6 flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-6">Traffic Overview</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={viewsData}>
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
                                <Area type="monotone" dataKey="views" stroke="#FF5722" strokeWidth={3} fill="url(#viewsGradient)" />
                                <Area type="monotone" dataKey="clicks" stroke="#fff" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                {/* Demographics */}
                <GlassCard className="p-6 flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-bold text-white mb-6">Audience Age</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={demographicsData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="age" type="category" axisLine={false} tickLine={false} tick={{ fill: '#fff', fontSize: 12 }} width={40} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill="#333" radius={[0, 4, 4, 0]} barSize={32}>
                                    {demographicsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 1 ? '#FF5722' : 'rgba(255,255,255,0.1)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
