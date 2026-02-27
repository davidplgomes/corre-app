'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getCouponRedemptions } from '@/lib/services/coupons';
import type { CouponRedemption } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import { ChevronLeft, Loader2, Users, CheckCircle2, Clock3 } from 'lucide-react';
import { toast } from 'sonner';

type CouponMeta = {
    id: string;
    code: string;
    title: string;
    redeemed_count: number;
};

export default function CouponRedemptionsPage() {
    const router = useRouter();
    const params = useParams();
    const couponId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [coupon, setCoupon] = useState<CouponMeta | null>(null);
    const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);

    const usedCount = useMemo(
        () => redemptions.filter((r) => r.is_used).length,
        [redemptions]
    );

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

                const { data: couponData, error: couponError } = await supabase
                    .from('partner_coupons')
                    .select('id, code, title, redeemed_count')
                    .eq('id', couponId)
                    .eq('partner_id', session.user.id)
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
                    <p className="text-3xl font-bold text-amber-300">{redemptions.length - usedCount}</p>
                </GlassCard>
            </div>

            <GlassCard className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">Redemption History</h2>
                </div>

                {redemptions.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60 text-sm">No one has redeemed this coupon yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {redemptions.map((row) => (
                            <div key={row.id} className="px-6 py-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                        {row.users?.full_name || 'Unknown User'}
                                    </p>
                                    <p className="text-xs text-white/40 truncate">
                                        {row.users?.email || 'No email'} • {row.users?.membership_tier || 'unknown tier'}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">
                                        Redeemed: {new Date(row.redeemed_at).toLocaleString()}
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
