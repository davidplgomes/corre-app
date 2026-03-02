'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getCouponRedemptions } from '@/lib/services/coupons';
import { getPartnerScopeIdsByUserId } from '@/lib/services/partners';
import type { CouponRedemption } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import {
    ChevronLeft,
    Loader2,
    Users,
    CheckCircle2,
    Clock3,
    Search,
    Download,
} from 'lucide-react';
import { toast } from 'sonner';

type CouponMeta = {
    id: string;
    code: string;
    title: string;
    redeemed_count: number;
};

type RedemptionFilter = 'all' | 'used' | 'pending';

export default function CouponRedemptionsPage() {
    const router = useRouter();
    const params = useParams();
    const couponId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [coupon, setCoupon] = useState<CouponMeta | null>(null);
    const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<RedemptionFilter>('all');

    const usedCount = useMemo(
        () => redemptions.filter((redemption) => redemption.is_used).length,
        [redemptions]
    );

    const pendingCount = redemptions.length - usedCount;

    const filteredRedemptions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return redemptions.filter((row) => {
            if (filter === 'used' && !row.is_used) return false;
            if (filter === 'pending' && row.is_used) return false;

            if (!query) return true;

            const haystack = [
                row.users?.full_name || '',
                row.users?.email || '',
                row.users?.membership_tier || '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [filter, redemptions, searchQuery]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const supabase = createClient();
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                const session = sessionData.session;
                if (!session) {
                    toast.error('You must be logged in');
                    router.push('/login');
                    return;
                }

                const partnerScopeIds = await getPartnerScopeIdsByUserId(session.user.id);

                const { data: couponData, error: couponError } = await supabase
                    .from('partner_coupons')
                    .select('id, code, title, redeemed_count')
                    .eq('id', couponId)
                    .in('partner_id', partnerScopeIds)
                    .maybeSingle();

                if (couponError) throw couponError;
                if (!couponData) {
                    toast.error('Coupon not found');
                    router.push('/partner/dashboard/coupons');
                    return;
                }

                setCoupon(couponData as CouponMeta);

                const rows = await getCouponRedemptions(couponId);
                setRedemptions(rows);
            } catch (error) {
                console.error('Error loading coupon redemptions:', error);
                toast.error('Failed to load redemptions');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [couponId, router]);

    const exportCsv = () => {
        const headers = ['Name', 'Email', 'Tier', 'Redeemed At', 'Points Spent', 'Status'];
        const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
        const rows = filteredRedemptions.map((row) => [
            row.users?.full_name || 'Unknown User',
            row.users?.email || 'No email',
            row.users?.membership_tier || 'unknown',
            new Date(row.redeemed_at).toLocaleString('en-IE'),
            String(row.points_spent || 0),
            row.is_used ? 'Used' : 'Pending',
        ]);

        const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `coupon_redemptions_${coupon?.code || couponId}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5722]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link
                href="/partner/dashboard/coupons"
                className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Coupons
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Coupon Redemptions</h1>
                <p className="text-white/40">
                    {coupon?.title} ({coupon?.code})
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-5">
                    <p className="text-xs uppercase tracking-wider text-white/40 font-bold mb-1">Total Redemptions</p>
                    <p className="text-3xl font-bold text-white">{redemptions.length}</p>
                </GlassCard>
                <GlassCard className="p-5">
                    <p className="text-xs uppercase tracking-wider text-white/40 font-bold mb-1">Used</p>
                    <p className="text-3xl font-bold text-green-400">{usedCount}</p>
                </GlassCard>
                <GlassCard className="p-5">
                    <p className="text-xs uppercase tracking-wider text-white/40 font-bold mb-1">Pending</p>
                    <p className="text-3xl font-bold text-amber-300">{pendingCount}</p>
                </GlassCard>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by name, email, or tier..."
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'used', 'pending'] as RedemptionFilter[]).map((value) => (
                        <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`px-3 h-10 rounded-lg text-xs uppercase tracking-wider font-bold transition-colors ${
                                filter === value
                                    ? 'bg-[#FF5722] text-white'
                                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                            }`}
                        >
                            {value}
                        </button>
                    ))}
                </div>
                <button
                    onClick={exportCsv}
                    className="h-10 px-4 inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-lg text-xs uppercase tracking-wider font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                </button>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Redemption History</h2>
                    <p className="text-xs text-white/40">
                        Showing {filteredRedemptions.length} of {redemptions.length}
                    </p>
                </div>

                {filteredRedemptions.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60 text-sm">
                            {redemptions.length === 0
                                ? 'No one has redeemed this coupon yet.'
                                : 'No redemptions match your current filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredRedemptions.map((row) => (
                            <div key={row.id} className="px-6 py-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                        {row.users?.full_name || 'Unknown User'}
                                    </p>
                                    <p className="text-xs text-white/40 truncate">
                                        {row.users?.email || 'No email'} • {row.users?.membership_tier || 'unknown tier'}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">
                                        Redeemed: {new Date(row.redeemed_at).toLocaleString('en-IE')}
                                    </p>
                                    <p className="text-xs text-white/30 mt-0.5">
                                        Points spent: {row.points_spent}
                                    </p>
                                </div>

                                <div className="shrink-0">
                                    {row.is_used ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Used
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                            <Clock3 className="w-3 h-3" />
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
