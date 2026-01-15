import { supabase } from './client';
import * as Crypto from 'expo-crypto';

/**
 * Generate a cryptographically secure QR code secret for user
 */
export const generateQRSecret = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Sign up a new user with email and password
 */
export const signUp = async (
    email: string,
    password: string,
    fullName: string,
    neighborhood: string,
    languagePreference: string = 'en'
) => {
    try {
        // Generate unique QR secret
        const qrCodeSecret = await generateQRSecret();

        // Create auth user with metadata (will trigger database function)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    neighborhood,
                    language_preference: languagePreference,
                    qr_code_secret: qrCodeSecret,
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No user data returned from signup');

        return { user: authData.user, profile: null };
    } catch (error) {
        console.error('Error signing up:', error);
        throw error;
    }
};

/**
 * Sign in an existing user
 */
export const signIn = async (email: string, password: string) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error signing in:', error);
        throw error;
    }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    } catch (error) {
        console.error('Error resetting password:', error);
        throw error;
    }
};

/**
 * Get current session
 */
export const getSession = async () => {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
    } catch (error) {
        console.error('Error getting session:', error);
        throw error;
    }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (session: any) => void) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
};
