import { supabase } from './client';

export interface ReferralCode {
    id: string;
    user_id: string;
    code: string;
    total_referrals: number;
    successful_referrals: number;
    points_earned: number;
    created_at: string;
}

export interface Referral {
    id: string;
    referrer_id: string;
    referred_id: string;
    referral_code: string;
    status: 'pending' | 'subscribed' | 'rewarded';
    referrer_points: number;
    referred_points: number;
    referrer_rewarded_at: string | null;
    referred_rewarded_at: string | null;
    free_month_granted: boolean;
    referrer_subscription_extended_at: string | null;
    referred_subscription_extended_at: string | null;
    created_at: string;
    // Joined data
    referred_user?: {
        full_name: string;
        avatar_url: string | null;
        membership_tier: string;
    };
    // Subscription status from joined query
    has_active_subscription?: boolean;
}

export interface ReferralStats {
    code: string;
    totalReferrals: number;
    successfulReferrals: number;
    pointsEarned: number;
    pendingReferrals: number;
}

/**
 * Get or create a referral code for the current user
 */
export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
    try {
        // Try to get existing code
        const { data: existing, error: existingError } = await supabase
            .from('referral_codes')
            .select('code')
            .eq('user_id', userId)
            .single();

        if (existing?.code) {
            return existing.code;
        }

        // Call database function to create code
        const { data, error } = await supabase
            .rpc('get_or_create_referral_code', { p_user_id: userId });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting referral code:', error);
        return null;
    }
}

/**
 * Get referral statistics for the current user
 */
export async function getReferralStats(userId: string): Promise<ReferralStats | null> {
    try {
        const { data, error } = await supabase
            .from('referral_codes')
            .select('code, total_referrals, successful_referrals, points_earned')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            // User has no referral code yet
            return null;
        }

        // Get pending referrals count
        const { count: pendingCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', userId)
            .eq('status', 'pending');

        return {
            code: data.code,
            totalReferrals: data.total_referrals,
            successfulReferrals: data.successful_referrals,
            pointsEarned: data.points_earned,
            pendingReferrals: pendingCount || 0,
        };
    } catch (error) {
        console.error('Error getting referral stats:', error);
        return null;
    }
}

/**
 * Get list of users referred by the current user
 */
export async function getReferredUsers(userId: string): Promise<Referral[]> {
    try {
        const { data, error } = await supabase
            .from('referrals')
            .select(`
                *,
                referred_user:users!referred_id (
                    full_name,
                    avatar_url,
                    membership_tier
                )
            `)
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform joined data
        return (data || []).map(item => ({
            ...item,
            referred_user: Array.isArray(item.referred_user)
                ? item.referred_user[0]
                : item.referred_user
        }));
    } catch (error) {
        console.error('Error getting referred users:', error);
        return [];
    }
}

/**
 * Apply a referral code for a new user
 */
export async function applyReferralCode(
    userId: string,
    referralCode: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase
            .rpc('apply_referral_code', {
                p_referred_user_id: userId,
                p_referral_code: referralCode.toUpperCase()
            });

        if (error) throw error;

        // Function now returns JSONB with success and message
        if (data && typeof data === 'object') {
            return {
                success: data.success === true,
                message: data.message || 'Referral code applied!'
            };
        }

        return { success: false, message: 'Invalid response from server.' };
    } catch (error) {
        console.error('Error applying referral code:', error);
        return { success: false, message: 'Failed to apply referral code.' };
    }
}

/**
 * Generate a shareable referral link
 */
export function generateReferralLink(code: string): string {
    return `https://corredublin.com/join?ref=${code}`;
}

/**
 * Generate share message for referral
 */
export function generateShareMessage(code: string, userName: string): {
    title: string;
    message: string;
    url: string;
} {
    const url = generateReferralLink(code);
    return {
        title: 'Join Corre!',
        message: `${userName} te convidou para o Corre! Use o código ${code} ao assinar o Pro e vocês dois ganham 1 mês grátis!\n\n${url}`,
        url,
    };
}
