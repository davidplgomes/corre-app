'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getPartnerProfileIdByUserId } from '@/lib/services/partners';
import { GlassCard } from '@/components/ui/glass-card';
import { ChevronLeft, Loader2, Tag } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const CATEGORIES = [
    { value: 'sports',  label: 'Sports & Running' },
    { value: 'fashion', label: 'Fashion & Apparel' },
    { value: 'health',  label: 'Health & Supplements' },
    { value: 'apps',    label: 'Apps & Digital' },
    { value: 'drinks',  label: 'Drinks & Nutrition' },
    { value: 'other',   label: 'Other' },
] as const;

const TIERS = [
    { value: 'free',  label: 'Free — All members' },
    { value: 'pro',   label: 'Pro & above' },
    { value: 'club',  label: 'Club only' },
] as const;

const DISCOUNT_TYPES = [
    { value: 'percentage', label: 'Percentage (%)' },
    { value: 'fixed',      label: 'Fixed amount (€)' },
    { value: 'freebie',    label: 'Freebie / Gift' },
] as const;

export default function NewCouponPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        partner: '',
        code: '',
        description: '',
        discount_type: 'percentage' as 'percentage' | 'fixed' | 'freebie',
        discount_value: 10,
        category: 'sports' as string,
        min_tier: 'free' as string,
        points_required: 500,
        valid_from: new Date().toISOString().split('T')[0],
        expires_at: '',
        stock_limit: '',
        referral_link: '',
    });

    const set = (field: string, value: unknown) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error('You must be logged in');
                return;
            }

            const partnerProfileId = await getPartnerProfileIdByUserId(session.user.id);
            const partnerOwnerId = partnerProfileId || session.user.id;

            const { error } = await supabase.from('partner_coupons').insert({
                partner_id:      partnerOwnerId,
                title:           formData.title,
                partner:         formData.partner,
                code:            formData.code.toUpperCase(),
                description:     formData.description,
                discount_type:   formData.discount_type,
                discount_value:  formData.discount_type === 'freebie' ? null : Number(formData.discount_value),
                category:        formData.category,
                min_tier:        formData.min_tier,
                points_required: Number(formData.points_required),
                valid_from:      new Date(formData.valid_from).toISOString(),
                expires_at:      formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
                stock_limit:     formData.stock_limit ? Number(formData.stock_limit) : null,
                referral_link:   formData.referral_link || null,
                redeemed_count:  0,
                is_active:       true,
            });

            if (error) throw error;

            toast.success('Coupon created successfully');
            router.push('/partner/dashboard/coupons');
        } catch (error) {
            console.error('Error creating coupon:', error);
            toast.error('Failed to create coupon');
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls = 'w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20';
    const labelCls = 'text-xs font-bold text-white/60 uppercase tracking-wider';

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/partner/dashboard/coupons" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Coupons
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Create Coupon</h1>
                <p className="text-white/40">Offer exclusive discounts to the Corre community</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Brand name + Badge title */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelCls}>Brand / Partner Name</label>
                            <input
                                required
                                type="text"
                                value={formData.partner}
                                onChange={e => set('partner', e.target.value)}
                                placeholder="e.g. Nike"
                                className={inputCls}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Badge Title</label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={e => set('title', e.target.value)}
                                placeholder="e.g. 10% OFF"
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Code */}
                    <div className="space-y-2">
                        <label className={labelCls}>Coupon Code</label>
                        <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                required
                                type="text"
                                value={formData.code}
                                onChange={e => set('code', e.target.value.toUpperCase())}
                                placeholder="e.g. CORRE10NIKE"
                                className={`${inputCls} pl-10 font-mono font-bold uppercase`}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className={labelCls}>Description</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Describe the offer in detail..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 resize-none"
                        />
                    </div>

                    {/* Discount type + value */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelCls}>Discount Type</label>
                            <select
                                value={formData.discount_type}
                                onChange={e => set('discount_type', e.target.value)}
                                className={inputCls}
                            >
                                {DISCOUNT_TYPES.map(t => (
                                    <option key={t.value} value={t.value} className="bg-[#1c1c1e]">{t.label}</option>
                                ))}
                            </select>
                        </div>
                        {formData.discount_type !== 'freebie' && (
                            <div className="space-y-2">
                                <label className={labelCls}>
                                    {formData.discount_type === 'percentage' ? 'Discount (%)' : 'Amount (€)'}
                                </label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={formData.discount_value}
                                    onChange={e => set('discount_value', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        )}
                    </div>

                    {/* Category + Min tier */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelCls}>Category</label>
                            <select
                                value={formData.category}
                                onChange={e => set('category', e.target.value)}
                                className={inputCls}
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value} className="bg-[#1c1c1e]">{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Minimum Tier</label>
                            <select
                                value={formData.min_tier}
                                onChange={e => set('min_tier', e.target.value)}
                                className={inputCls}
                            >
                                {TIERS.map(t => (
                                    <option key={t.value} value={t.value} className="bg-[#1c1c1e]">{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Points required */}
                    <div className="space-y-2">
                        <label className={labelCls}>Points Required to Redeem</label>
                        <input
                            required
                            type="number"
                            min="0"
                            value={formData.points_required}
                            onChange={e => set('points_required', e.target.value)}
                            placeholder="e.g. 500"
                            className={inputCls}
                        />
                        <p className="text-xs text-white/30">Points a user spends to claim this coupon in the mobile app.</p>
                    </div>

                    {/* Validity dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelCls}>Valid From</label>
                            <input
                                required
                                type="date"
                                value={formData.valid_from}
                                onChange={e => set('valid_from', e.target.value)}
                                className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Expires At</label>
                            <input
                                type="date"
                                value={formData.expires_at}
                                onChange={e => set('expires_at', e.target.value)}
                                className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert`}
                            />
                        </div>
                    </div>

                    {/* Stock limit */}
                    <div className="space-y-2">
                        <label className={labelCls}>Max Redemptions (optional)</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.stock_limit}
                            onChange={e => set('stock_limit', e.target.value)}
                            placeholder="No limit"
                            className={inputCls}
                        />
                    </div>

                    {/* Referral link */}
                    <div className="space-y-2">
                        <label className={labelCls}>Partner Website / Referral Link (optional)</label>
                        <input
                            type="url"
                            value={formData.referral_link}
                            onChange={e => set('referral_link', e.target.value)}
                            placeholder="https://www.yoursite.com"
                            className={inputCls}
                        />
                        <p className="text-xs text-white/30">Users tap &ldquo;Visit Partner&rdquo; in the app to open this URL after redeeming.</p>
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
