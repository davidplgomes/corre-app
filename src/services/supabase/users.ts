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
