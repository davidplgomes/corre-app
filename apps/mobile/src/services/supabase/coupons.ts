import { supabase } from './client';

interface RedeemCouponResult {
    success: boolean;
    error?: string;
    newPointsBalance?: number;
    code?: string;
    redemption_id?: string;
}

export interface PartnerCoupon {
    id: string;
    title: string;
    description: string;
    partner: string;
    code: string;
    points_required: number;
    discount_type: 'percentage' | 'fixed' | 'freebie';
    discount_value: number | null;
    category: 'fashion' | 'health' | 'sports' | 'apps' | 'drinks' | 'other';
    expires_at: string;
    is_active: boolean;
    stock_limit: number | null;
    redeemed_count: number;
    image_url: string | null;
    terms: string | null;
    referral_link: string | null;
    valid_from?: string | null;
}

/**
 * Redeem a partner coupon by deducting points from user's balance
 * This is for partner coupons (Nike, Strava, etc.) that cost points to redeem
 */
export const redeemPartnerCoupon = async (
    userId: string,
    _pointsCost: number,
    couponCode: string
): Promise<RedeemCouponResult> => {
    try {
        // Use server-authoritative coupon redemption flow only.
        const nowIso = new Date().toISOString();
        const { data: coupon, error: couponError } = await supabase
            .from('partner_coupons')
            .select('id, expires_at, valid_from')
            .eq('code', couponCode)
            .eq('is_active', true)
            .maybeSingle();

        if (couponError) {
            console.error('Error loading coupon by code:', couponError);
            return { success: false, error: couponError.message };
        }

        if (!coupon?.id) {
            return { success: false, error: 'Coupon not found or expired' };
        }

        if (coupon.expires_at && coupon.expires_at <= nowIso) {
            return { success: false, error: 'Coupon not found or expired' };
        }

        if (coupon.valid_from && coupon.valid_from > nowIso) {
            return { success: false, error: 'Coupon not found or expired' };
        }

        const redemption = await redeemPartnerCouponWithPoints(userId, coupon.id);
        if (!redemption.success) {
            return { success: false, error: redemption.error };
        }

        return {
            success: true,
            newPointsBalance: redemption.newPointsBalance,
            code: redemption.code,
            redemption_id: redemption.redemption_id,
        };
    } catch (error) {
        console.error('Error redeeming coupon:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
};

/**
 * Get user's monthly discount coupons (earned based on activity)
 */
export const getUserDiscountCoupons = async (userId: string) => {
    try {
        const { data, error } = await supabase.rpc('get_user_coupons', {
            p_user_id: userId
        });

        if (error) {
            console.error('Error fetching user coupons:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getUserDiscountCoupons:', error);
        return [];
    }
};

/**
 * Use a monthly discount coupon (mark as used)
 */
export const useDiscountCoupon = async (couponCode: string, userId: string) => {
    try {
        const { data, error } = await supabase.rpc('use_coupon', {
            p_code: couponCode,
            p_user_id: userId
        });

        if (error) {
            console.error('Error using coupon:', error);
            return { success: false, error: error.message };
        }

        return data;
    } catch (error) {
        console.error('Error in useDiscountCoupon:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
};

/**
 * Get all available partner coupons from the database
 */
export const getPartnerCoupons = async (): Promise<PartnerCoupon[]> => {
    try {
        const nowMs = Date.now();
        const { data, error } = await supabase
            .from('partner_coupons')
            .select('*')
            .eq('is_active', true)
            .order('points_required', { ascending: true });

        if (error) {
            console.error('Error fetching partner coupons:', error);
            return [];
        }

        return ((data || []) as PartnerCoupon[]).filter((coupon) => {
            const notExpired = !coupon.expires_at || Date.parse(coupon.expires_at) > nowMs;
            const started = !coupon.valid_from || Date.parse(coupon.valid_from) <= nowMs;
            return notExpired && started;
        });
    } catch (error) {
        console.error('Error in getPartnerCoupons:', error);
        return [];
    }
};

/**
 * Redeem a partner coupon using points (via database function)
 */
export const redeemPartnerCouponWithPoints = async (
    userId: string,
    couponId: string
): Promise<RedeemCouponResult> => {
    try {
        const { data, error } = await supabase.rpc('redeem_partner_coupon', {
            p_user_id: userId,
            p_coupon_id: couponId
        });

        if (error) {
            console.error('Error redeeming coupon:', error);
            return { success: false, error: error.message };
        }

        if (!data || !data.success) {
            return {
                success: false,
                error: data?.error || 'Failed to redeem coupon'
            };
        }

        return {
            success: true,
            code: data.code,
            redemption_id: data.redemption_id,
            newPointsBalance: data.new_points_balance,
        };
    } catch (error) {
        console.error('Error in redeemPartnerCouponWithPoints:', error);
        return { success: false, error: 'An unexpected error occurred' };
    }
};

/**
 * Get user's redeemed partner coupons
 */
export const getUserRedeemedCoupons = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('user_coupon_redemptions')
            .select(`
                *,
                coupon:partner_coupons(*)
            `)
            .eq('user_id', userId)
            .order('redeemed_at', { ascending: false });

        if (error) {
            console.error('Error fetching redeemed coupons:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getUserRedeemedCoupons:', error);
        return [];
    }
};
