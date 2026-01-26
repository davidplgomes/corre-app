import { supabase } from './client';
import { User } from '../../types';

/**
 * Get user profile by ID
 */
export const getProfile = async (userId: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting profile:', error);
        throw error;
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (
    userId: string,
    updates: Partial<User>
): Promise<User> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

/**
 * Type for user info returned by QR scan (partial data)
 */
export type MerchantUserInfo = Pick<User, 'id' | 'full_name' | 'email' | 'membership_tier' | 'qr_code_secret'>;

/**
 * Get user by QR code secret (for merchant scanning)
 */
export const getUserByQRSecret = async (
    qrSecret: string
): Promise<MerchantUserInfo | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, membership_tier, qr_code_secret')
            .eq('qr_code_secret', qrSecret)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting user by QR secret:', error);
        throw error;
    }
};

/**
 * Update user language preference
 */
export const updateLanguagePreference = async (
    userId: string,
    language: string
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ language_preference: language })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating language preference:', error);
        throw error;
    }
};

/**
 * Toggle merchant mode
 */
export const toggleMerchantMode = async (
    userId: string,
    isMerchant: boolean
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ is_merchant: isMerchant })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error toggling merchant mode:', error);
        throw error;
    }
};

// Helper to get user's QR secret (should be protected in real app)
export const getUserQRSecret = async (userId: string): Promise<string> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('qr_secret')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data?.qr_secret || '';
    } catch (error) {
        console.error('Error getting QR secret:', error);
        return '';
    }
};

/**
 * Validate a user's QR code (Merchant side)
 */
export const validateUserQR = async (userId: string, timestamp: number, signature: string) => {
    try {
        const { data, error } = await supabase.rpc('validate_qr_code', {
            p_user_id: userId,
            p_timestamp: timestamp,
            p_signature: signature
        });

        if (error) throw error;

        // RPC returns rows, data[0] is the result
        const result = Array.isArray(data) ? data[0] : data;

        return {
            valid: result.valid,
            tier: result.tier,
            discount: result.discount,
            userName: result.user_name,
            error: result.error_message
        };
    } catch (error: any) {
        console.error('Error validating QR:', error);
        return { valid: false, error: error.message };
    }
};




/**
 * Privacy visibility options
 */
export type PrivacyVisibility = 'friends' | 'anyone' | 'nobody';

/**
 * Public profile type (limited info based on privacy)
 */
export type PublicProfile = {
    id: string;
    full_name: string;
    membership_tier: string;
    privacy_visibility: PrivacyVisibility;
    avatar_url?: string; // Profile picture
    // These fields are only present if privacy allows
    current_month_points?: number;
    total_lifetime_points?: number;
    neighborhood?: string;
    city?: string;
    bio?: string;
    instagram_handle?: string;
    created_at?: string;
};

/**
 * Get public profile respecting privacy settings
 */
export const getPublicProfile = async (
    userId: string,
    viewerId?: string
): Promise<PublicProfile | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, membership_tier, privacy_visibility, avatar_url, current_month_points, total_lifetime_points, neighborhood, city, bio, instagram_handle, created_at')
            .eq('id', userId)
            .single();

        if (error) throw error;
        if (!data) return null;

        const profile = data as PublicProfile;

        // If privacy is 'nobody', only return basic info (avatar always visible)
        if (profile.privacy_visibility === 'nobody') {
            return {
                id: profile.id,
                full_name: profile.full_name,
                membership_tier: profile.membership_tier,
                privacy_visibility: profile.privacy_visibility,
                avatar_url: profile.avatar_url,
            };
        }

        // If privacy is 'friends', check if viewer is a friend
        if (profile.privacy_visibility === 'friends' && viewerId) {
            const { data: friendship } = await supabase
                .from('friendships')
                .select('id')
                .or(`and(requester_id.eq.${userId},addressee_id.eq.${viewerId}),and(requester_id.eq.${viewerId},addressee_id.eq.${userId})`)
                .eq('status', 'accepted')
                .single();

            if (!friendship) {
                // Not friends, return limited info (avatar always visible)
                return {
                    id: profile.id,
                    full_name: profile.full_name,
                    membership_tier: profile.membership_tier,
                    privacy_visibility: profile.privacy_visibility,
                    avatar_url: profile.avatar_url,
                };
            }
        }

        // Return full profile
        return profile;
    } catch (error) {
        console.error('Error getting public profile:', error);
        return null;
    }
};

/**
 * Update privacy visibility settings
 */
export const updatePrivacySettings = async (
    userId: string,
    visibility: PrivacyVisibility
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ privacy_visibility: visibility })
            .eq('id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        throw error;
    }
};

/**
 * Get user's current privacy setting
 */
export const getPrivacySetting = async (userId: string): Promise<PrivacyVisibility> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('privacy_visibility')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return (data?.privacy_visibility as PrivacyVisibility) || 'friends';
    } catch (error) {
        console.error('Error getting privacy setting:', error);
        return 'friends';
    }
};
