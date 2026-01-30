'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getPartnerCoupons } from '@/lib/services/coupons';
import type { PartnerCoupon } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import { Plus, Tag, Search, Filter, Loader2, Calendar, Users, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerCouponsPage() {
    const [coupons, setCoupons] = useState<PartnerCoupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) return;

                const data = await getPartnerCoupons(session.user.id);
                setCoupons(data);
            } catch (error) {
                console.error('Error fetching coupons:', error);
                toast.error('Failed to load coupons');
            } finally {
                setLoading(false);
            }
        };

        fetchCoupons();
    }, []);

    const filteredCoupons = coupons.filter(coupon =>
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("Code copied to clipboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">My Coupons</h1>
                    <p className="text-white/40">Create and manage discounts for runners</p>
                </div>
                <Link href="/partner/dashboard/coupons/new">
                    <button className="h-10 px-4 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Coupon
                    </button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search coupons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                    />
                </div>
                <button className="h-10 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* Grid */}
            {filteredCoupons.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Tag className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No coupons created</h3>
                    <p className="text-white/40 mb-6">Reward runners with exclusive discounts</p>
                    <Link href="/partner/dashboard/coupons/new">
                        <button className="h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors">
                            Create First Coupon
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCoupons.map((coupon) => (
                        <GlassCard key={coupon.id} className="group p-6 flex flex-col h-full hover:border-[#FF5722]/30 transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-lg bg-[#FF5722]/10 flex items-center justify-center text-[#FF5722] font-black text-lg">
                                    {coupon.discount_percent}%
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${coupon.is_active ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/20' : 'bg-white/10 text-white/40 border border-white/10'
                                    }`}>
                                    {coupon.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <div className="flex-1">
                                <button
                                    onClick={() => handleCopyCode(coupon.code)}
                                    className="flex items-center gap-2 text-xl font-mono font-bold text-white mb-2 hover:text-[#FF5722] transition-colors group/code"
                                >
                                    {coupon.code}
                                    <Copy className="w-4 h-4 opacity-0 group-hover/code:opacity-100 transition-opacity" />
                                </button>
                                <p className="text-sm text-white/60 line-clamp-2 mb-4">{coupon.description}</p>

                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-white/40">
                                            <Calendar className="w-3 h-3" />
                                            <span>Expires</span>
                                        </div>
                                        <span className="text-white/80">
                                            {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No Expiry'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-white/40">
                                            <Users className="w-3 h-3" />
                                            <span>Redemptions</span>
                                        </div>
                                        <span className="text-white/80">
                                            {coupon.current_uses} / {coupon.max_uses || '∞'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
