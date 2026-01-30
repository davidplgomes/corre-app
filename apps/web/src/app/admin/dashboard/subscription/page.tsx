"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { GlassCard } from "@/components/ui/glass-card"
import { AdminTable } from "@/components/ui/admin-table"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, TrendingUp, Users, CreditCard, AlertCircle, Download } from "lucide-react"
import { toast } from "sonner"

interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: string;
    current_period_end: string | null;
    created_at: string;
    user?: { full_name: string; email: string };
    plan?: { name: string; price: number };
}

export default function SubscriptionPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        mrr: 0,
        activeCount: 0,
        churnRate: 2.1, // This would need historical data to calculate properly
        ltv: 0
    });

    const supabase = createClient();

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);

            // Fetch subscriptions with user and plan info
            const { data: subs, error } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    profiles:user_id (full_name, email),
                    plans:plan_id (name, price)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map data to include user and plan as nested objects
            const mapped = (subs || []).map(s => ({
                ...s,
                user: s.profiles,
                plan: s.plans
            }));

            setSubscriptions(mapped);

            // Calculate stats
            const activeSubs = mapped.filter(s => s.status === 'active');
            const mrr = activeSubs.reduce((acc, s) => acc + (s.plan?.price || 0), 0);
            const ltv = activeSubs.length > 0 ? mrr * 12 / activeSubs.length : 0;

            setStats({
                mrr,
                activeCount: activeSubs.length,
                churnRate: 2.1, // Placeholder
                ltv: Math.round(ltv)
            });

        } catch (error) {
            console.error("Error fetching subscriptions:", error);
            toast.error("Failed to load subscriptions");
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ['User', 'Email', 'Plan', 'Amount', 'Status', 'Next Billing'];
        const rows = subscriptions.map(s => [
            s.user?.full_name || 'Unknown',
            s.user?.email || '',
            s.plan?.name || 'Unknown',
            `€${(s.plan?.price || 0).toFixed(2)}`,
            s.status,
            s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : 'N/A'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Subscriptions exported successfully");
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'active': return "bg-green-500/10 text-green-500 border-green-500/20";
            case 'past_due': return "bg-red-500/10 text-red-500 border-red-500/20";
            case 'cancelled': return "bg-white/5 text-white/40 border-white/10";
            default: return "bg-white/5 text-white/40 border-white/10";
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Subscriptions</h2>
                    <p className="text-white/40 text-sm mt-1">Manage recurring revenue and subscriber health.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Button variant="outline" className="gap-2 flex-1 md:flex-none" onClick={handleExportCSV}>
                        <Download className="w-4 h-4" />
                        Export CSV
                    </Button>
                    <Button className="gap-2 flex-1 md:flex-none">
                        <TrendingUp className="w-4 h-4" />
                        Analyze Trends
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Monthly Recurring Revenue</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                            {stats.mrr.toLocaleString('en-IE', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <span className="text-xs font-medium text-green-500 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> +12%
                        </span>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Active Subscribers</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stats.activeCount}</span>
                        <span className="text-xs font-medium text-green-500 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> +5%
                        </span>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Churn Rate</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{stats.churnRate}%</span>
                        <span className="text-xs font-medium text-green-500 flex items-center gap-1">
                            -0.5%
                        </span>
                    </div>
                </GlassCard>
                <GlassCard className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Lifetime Value</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">€{stats.ltv}</span>
                        <span className="text-xs font-medium text-white/40">avg</span>
                    </div>
                </GlassCard>
            </div>

            {/* Main Table */}
            <AdminTable
                title="Subscriber List"
                data={subscriptions}
                isLoading={loading}
                columns={[
                    {
                        header: "Subscriber",
                        cell: (item) => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-white/5">
                                    <span className="text-xs font-bold text-white/60">{(item.user?.full_name || 'U').charAt(0)}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{item.user?.full_name || 'Unknown User'}</p>
                                    <p className="text-[10px] text-white/40">{item.user?.email || item.user_id}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: "Plan",
                        cell: (item) => <span className="text-sm text-white/80">{item.plan?.name || 'Unknown'}</span>
                    },
                    {
                        header: "Amount",
                        cell: (item) => <span className="font-mono text-sm font-medium text-white">€{(item.plan?.price || 0).toFixed(2)}</span>
                    },
                    {
                        header: "Next Billing",
                        cell: (item) => (
                            <span className="text-sm text-white/60 font-mono">
                                {item.current_period_end
                                    ? new Date(item.current_period_end).toLocaleDateString('en-IE')
                                    : 'N/A'}
                            </span>
                        )
                    },
                    {
                        header: "Status",
                        cell: (item) => (
                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider border ${getStatusStyle(item.status)}`}>
                                {item.status}
                            </span>
                        )
                    },
                    {
                        header: "Actions",
                        cell: (item) => (
                            <div className="flex justify-end gap-2">
                                <button className="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors">Details</button>
                            </div>
                        )
                    }
                ]}
            />
        </div>
    )
}
