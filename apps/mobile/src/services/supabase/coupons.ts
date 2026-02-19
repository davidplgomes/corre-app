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
}

/**
 * Redeem a partner coupon by deducting points from user's balance
 * This is for partner coupons (Nike, Strava, etc.) that cost points to redeem
 */
export const redeemPartnerCoupon = async (
    userId: string,
    pointsCost: number,
    couponCode: string
): Promise<RedeemCouponResult> => {
    try {
        // Get current user points
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('current_month_points, total_lifetime_points')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            return { success: false, error: 'User not found' };
        }

        const currentPoints = userData.current_month_points || 0;

        if (currentPoints < pointsCost) {
            return {
                success: false,
                error: `Insufficient points. You have ${currentPoints} but need ${pointsCost}.`
            };
        }

        // Deduct points
        const newBalance = currentPoints - pointsCost;
        const { error: updateError } = await supabase
            .from('users')
            .update({
                current_month_points: newBalance
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error deducting points:', updateError);
            return { success: false, error: 'Failed to deduct points' };
        }

        // Log the redemption (optional - could create a redemptions table later)
        console.log(`Coupon ${couponCode} redeemed by user ${userId} for ${pointsCost} points`);

        return {
            success: true,
            newPointsBalance: newBalance
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
        const { data, error } = await supabase
            .from('partner_coupons')
            .select('*')
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('points_required', { ascending: true });

        if (error) {
            console.error('Error fetching partner coupons:', error);
            return [];
        }

        return (data || []) as PartnerCoupon[];
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
            redemption_id: data.redemption_id
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
