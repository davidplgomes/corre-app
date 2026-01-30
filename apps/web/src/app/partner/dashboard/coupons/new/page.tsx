'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { ChevronLeft, Loader2, Tag } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewCouponPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_percent: 10,
        min_tier: 'bronze',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        max_uses: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error("You must be logged in");
                return;
            }

            const { error } = await supabase.from('partner_coupons').insert({
                partner_id: session.user.id,
                code: formData.code.toUpperCase(),
                description: formData.description,
                discount_percent: Number(formData.discount_percent),
                min_tier: formData.min_tier,
                valid_from: new Date(formData.valid_from).toISOString(),
                valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
                max_uses: formData.max_uses ? Number(formData.max_uses) : null,
                current_uses: 0,
                is_active: true
            });

            if (error) throw error;

            toast.success("Coupon created successfully");
            router.push('/partner/dashboard/coupons');
        } catch (error) {
            console.error('Error creating coupon:', error);
            toast.error("Failed to create coupon");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/partner/dashboard/coupons" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Coupons
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Create Coupon</h1>
                <p className="text-white/40">Offer exclusive discounts to the community</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Code & Discount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Coupon Code</label>
                            <div className="relative">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    required
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. SUMMER2024"
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white font-mono font-bold focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 uppercase"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Discount (%)</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max="100"
                                value={formData.discount_percent}
                                onChange={e => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Description</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the offer..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 resize-none"
                        />
                    </div>

                    {/* Minimum Tier */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Minimum Tier Required</label>
                        <select
                            value={formData.min_tier}
                            onChange={e => setFormData({ ...formData, min_tier: e.target.value })}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                        >
                            <option value="bronze" className="bg-[#1c1c1e]">Bronze (All Members)</option>
                            <option value="silver" className="bg-[#1c1c1e]">Silver</option>
                            <option value="gold" className="bg-[#1c1c1e]">Gold</option>
                            <option value="platinum" className="bg-[#1c1c1e]">Platinum</option>
                        </select>
                    </div>

                    {/* Validity Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Valid From</label>
                            <input
                                required
                                type="date"
                                value={formData.valid_from}
                                onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Valid Until</label>
                            <input
                                type="date"
                                value={formData.valid_until}
                                onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Max Uses (Optional)</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.max_uses}
                            onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                            placeholder="No limit"
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-4">
                        <Link href="/partner/dashboard/coupons" className="flex-1">
                            <button type="button" className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors">
                                Cancel
                            </button>
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 h-12 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Coupon'
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
