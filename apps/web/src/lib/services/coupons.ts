import { createClient } from '@/lib/supabase';
import type { PartnerCoupon, CouponRedemption } from '@/types';

/**
 * Get partner's coupons
 */
export async function getPartnerCoupons(partnerId: string): Promise<PartnerCoupon[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_coupons')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get all coupons (admin)
 */
export async function getAllCoupons(): Promise<PartnerCoupon[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Create coupon
 */
export async function createCoupon(coupon: Omit<PartnerCoupon, 'id' | 'created_at' | 'updated_at' | 'current_uses'>): Promise<PartnerCoupon> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_coupons')
        .insert({ ...coupon, current_uses: 0 })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update coupon
 */
export async function updateCoupon(couponId: string, updates: Partial<PartnerCoupon>): Promise<PartnerCoupon> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_coupons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', couponId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete coupon
 */
export async function deleteCoupon(couponId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('partner_coupons')
        .delete()
        .eq('id', couponId);

    if (error) throw error;
}

/**
 * Toggle coupon active status
 */
export async function toggleCouponActive(couponId: string, isActive: boolean): Promise<PartnerCoupon> {
    return updateCoupon(couponId, { is_active: isActive });
}

/**
 * Get coupon redemptions
 */
export async function getCouponRedemptions(couponId: string): Promise<CouponRedemption[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('coupon_redemptions')
        .select('*, users(id, full_name, email, membership_tier)')
        .eq('coupon_id', couponId)
        .order('redeemed_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get partner's coupon stats
 */
export async function getPartnerCouponStats(partnerId: string) {
    const supabase = createClient();

    const [coupons, redemptions] = await Promise.all([
        supabase.from('partner_coupons').select('id, current_uses, is_active').eq('partner_id', partnerId),
        supabase.from('coupon_redemptions')
            .select('id, partner_coupons!inner(partner_id)')
            .eq('partner_coupons.partner_id', partnerId),
    ]);

    const activeCoupons = coupons.data?.filter(c => c.is_active).length || 0;
    const totalRedemptions = redemptions.data?.length || 0;

    return {
        totalCoupons: coupons.data?.length || 0,
        activeCoupons,
        totalRedemptions,
    };
}
