'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Activity, Clock, MapPin, Zap, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { AdminTable } from '@/components/ui/admin-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Run {
    id: string;
    user_id: string;
    distance_km: number;
    duration_seconds: number;
    points_earned: number;
    started_at: string;
    ended_at: string;
    created_at: string;
    user?: { full_name: string; email: string };
}

export default function AdminRunsPage() {
    const router = useRouter();
    const [runs, setRuns] = useState<Run[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        totalRuns: 0,
        totalDistance: 0,
        avgPace: '0:00',
        totalPoints: 0
    });

    const supabase = createClient();

    useEffect(() => {
        checkAuth();
        fetchRuns();
    }, []);

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

    const fetchRuns = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('runs')
                .select(`
                    *,
                    users:user_id (full_name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            const mapped = (data || []).map(r => ({
                ...r,
                user: r.users
            }));

            setRuns(mapped);

            // Calculate stats
            const totalDistance = mapped.reduce((acc, r) => acc + Number(r.distance_km || 0), 0);
            const totalDuration = mapped.reduce((acc, r) => acc + (r.duration_seconds || 0), 0);
            const totalPoints = mapped.reduce((acc, r) => acc + (r.points_earned || 0), 0);

            // Avg pace in min/km
            const avgPaceMinutes = totalDistance > 0 ? (totalDuration / 60) / totalDistance : 0;
            const paceMin = Math.floor(avgPaceMinutes);
            const paceSec = Math.round((avgPaceMinutes - paceMin) * 60);

            setStats({
                totalRuns: mapped.length,
                totalDistance: Math.round(totalDistance * 10) / 10,
                avgPace: `${paceMin}:${paceSec.toString().padStart(2, '0')}`,
                totalPoints
            });

        } catch (error) {
            console.error('Error fetching runs:', error);
            toast.error('Failed to load runs');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 2) {
            try {
                const { data } = await supabase
                    .from('runs')
                    .select(`*, users:user_id (full_name, email)`)
                    .or(`users.full_name.ilike.%${query}%,users.email.ilike.%${query}%`)
                    .order('created_at', { ascending: false })
                    .limit(50);

                const mapped = (data || []).map(r => ({ ...r, user: r.users }));
                setRuns(mapped);
            } catch (error) {
                console.error('Search error:', error);
            }
        } else if (query.length === 0) {
            fetchRuns();
        }
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        }
        return `${mins}m ${secs}s`;
    };

    const handleExportCSV = () => {
        const headers = ['User', 'Email', 'Distance (km)', 'Duration', 'Points', 'Date'];
        const rows = runs.map(r => [
            r.user?.full_name || 'Unknown',
            r.user?.email || '',
            r.distance_km,
            formatDuration(r.duration_seconds),
            r.points_earned,
            new Date(r.started_at).toLocaleDateString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `runs_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Runs exported successfully");
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Runs Management</h2>
                    <p className="text-white/40 text-sm">Track and analyze all running activity.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                            type="text"
                            placeholder="Search by runner name..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="pl-10 bg-[#0A0A0A]/50 border-white/5 focus:border-[#FF5722]/50 w-full"
                        />
                    </div>
                    <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-[#FF5722]" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Total Runs</h4>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalRuns.toLocaleString()}</span>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-[#FF5722]" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Total Distance</h4>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalDistance.toLocaleString()} km</span>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-[#FF5722]" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Avg Pace</h4>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.avgPace} /km</span>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-5 h-5 text-[#FF5722]" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Points Awarded</h4>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats.totalPoints.toLocaleString()}</span>
                </GlassCard>
            </div>

            {/* Runs Table */}
            <AdminTable
                title="Recent Runs"
                data={runs}
                isLoading={loading}
                columns={[
                    {
                        header: 'Runner',
                        cell: (run) => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5722]/20 to-[#FF5722]/5 flex items-center justify-center border border-white/5">
                                    <span className="text-xs font-bold text-[#FF5722]">
                                        {(run.user?.full_name || 'U').charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{run.user?.full_name || 'Unknown'}</p>
                                    <p className="text-[10px] text-white/40">{run.user?.email || run.user_id}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: 'Distance',
                        cell: (run) => (
                            <span className="font-mono text-sm font-medium text-white">
                                {Number(run.distance_km).toFixed(2)} km
                            </span>
                        )
                    },
                    {
                        header: 'Duration',
                        cell: (run) => (
                            <span className="text-sm text-white/60">
                                {formatDuration(run.duration_seconds)}
                            </span>
                        )
                    },
                    {
                        header: 'Points',
                        cell: (run) => (
                            <span className="font-mono text-sm font-medium text-[#FF5722]">
                                +{run.points_earned}
                            </span>
                        )
                    },
                    {
                        header: 'Date',
                        cell: (run) => (
                            <span className="text-sm text-white/40 font-mono">
                                {new Date(run.started_at).toLocaleDateString('en-IE', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        )
                    }
                ]}
            />
        </div>
    );
}
