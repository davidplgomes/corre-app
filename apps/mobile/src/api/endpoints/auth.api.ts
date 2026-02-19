/**
 * Auth API Endpoints
 * RESTful auth operations: signUp, signIn, signOut, changePassword,
 * resetEmail, recoverAccount. All return ApiResponse<T>.
 */

import { apiClient } from '../ApiClient';
import { logger } from '../../services/logging/Logger';
import { ApiResponse, SignUpRequest, SignInRequest, ChangePasswordRequest, ResetEmailRequest } from '../../types/api.types';
import { Session, User } from '@supabase/supabase-js';

export interface AuthResult {
    user: User;
    session: Session;
}

class AuthApiClass {
    private static instance: AuthApiClass;

    private constructor() { }

    static getInstance(): AuthApiClass {
        if (!AuthApiClass.instance) {
            AuthApiClass.instance = new AuthApiClass();
        }
        return AuthApiClass.instance;
    }

    /**
     * Sign up a new user.
     * The database trigger `handle_new_user` will create the user profile.
     */
    async signUp(request: SignUpRequest): Promise<ApiResponse<AuthResult>> {
        logger.info('AUTH', 'Sign up attempt', { email: request.email });

        return apiClient.query<AuthResult>('auth.signUp', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase.auth.signUp({
                email: request.email,
                password: request.password,
                options: {
                    data: {
                        full_name: request.fullName,
                        neighborhood: request.neighborhood,
                        language_preference: request.languagePreference || 'en',
                    },
                },
            });

            if (error) {
                return { data: null, error: { message: error.message, code: error.status?.toString() } };
            }

            if (!data.user || !data.session) {
                return { data: null, error: { message: 'Sign up succeeded but no session returned. Check your email for confirmation.', code: 'NO_SESSION' } };
            }

            logger.info('AUTH', 'Sign up success', { userId: data.user.id });
            return {
                data: { user: data.user, session: data.session },
                error: null,
            };
        });
    }

    /** Sign in with email/password */
    async signIn(request: SignInRequest): Promise<ApiResponse<AuthResult>> {
        logger.info('AUTH', 'Sign in attempt', { email: request.email });

        return apiClient.query<AuthResult>('auth.signIn', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email: request.email,
                password: request.password,
            });

            if (error) {
                return { data: null, error: { message: error.message, code: error.status?.toString() } };
            }

            logger.info('AUTH', 'Sign in success', { userId: data.user.id });
            return {
                data: { user: data.user, session: data.session },
                error: null,
            };
        });
    }

    /** Sign out the current user */
    async signOut(): Promise<ApiResponse<void>> {
        logger.info('AUTH', 'Sign out attempt');

        return apiClient.query<void>('auth.signOut', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase.auth.signOut();

            if (error) {
                return { data: null, error: { message: error.message } };
            }

            logger.info('AUTH', 'Sign out success');
            return { data: undefined as unknown as void, error: null };
        });
    }

    /** Change password (requires current session) */
    async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<void>> {
        logger.info('AUTH', 'Password change attempt');

        return apiClient.query<void>('auth.changePassword', async () => {
            const supabase = apiClient.getSupabaseClient();

            // First verify the current password by attempting sign in
            const { data: sessionData } = await supabase.auth.getSession();
            const email = sessionData.session?.user?.email;

            if (!email) {
                return { data: null, error: { message: 'No active session found' } };
            }

            // Verify current password
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email,
                password: request.currentPassword,
            });

            if (verifyError) {
                return { data: null, error: { message: 'Current password is incorrect' } };
            }

            // Update to new password
            const { error } = await supabase.auth.updateUser({
                password: request.newPassword,
            });

            if (error) {
                return { data: null, error: { message: error.message } };
            }

            logger.info('AUTH', 'Password changed successfully');
            return { data: undefined as unknown as void, error: null };
        });
    }

    /** Send password reset email */
    async resetPassword(request: ResetEmailRequest): Promise<ApiResponse<void>> {
        logger.info('AUTH', 'Password reset email request', { email: request.email });

        return apiClient.query<void>('auth.resetPassword', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase.auth.resetPasswordForEmail(request.email);

            if (error) {
                return { data: null, error: { message: error.message } };
            }

            logger.info('AUTH', 'Password reset email sent');
            return { data: undefined as unknown as void, error: null };
        });
    }

    /** Update user email */
    async updateEmail(newEmail: string): Promise<ApiResponse<void>> {
        logger.info('AUTH', 'Email update attempt', { newEmail });

        return apiClient.query<void>('auth.updateEmail', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase.auth.updateUser({ email: newEmail });

            if (error) {
                return { data: null, error: { message: error.message } };
            }

            logger.info('AUTH', 'Email update request sent (confirmation required)');
            return { data: undefined as unknown as void, error: null };
        });
    }

    /** Get current session */
    async getSession(): Promise<ApiResponse<{ user: User; session: Session } | null>> {
        return apiClient.query('auth.getSession', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                return { data: null, error: { message: error.message } };
            }

            if (!data.session || !data.session.user) {
                return { data: null, error: null };
            }

            return {
                data: { user: data.session.user, session: data.session },
                error: null,
            };
        });
    }

    /** Listen to auth state changes */
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        const supabase = apiClient.getSupabaseClient();
        return supabase.auth.onAuthStateChange((event, session) => {
            logger.info('AUTH', `Auth state changed: ${event}`, { userId: session?.user?.id });
            callback(event, session);
        });
    }
    /** Update user attributes (generic wrapper for auth.updateUser) */
    async updateUser(attributes: { email?: string; password?: string; data?: any }): Promise<ApiResponse<User>> {
        logger.info('AUTH', 'updateUser', { fields: Object.keys(attributes) });

        return apiClient.query<User>('auth.updateUser', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase.auth.updateUser(attributes);

            if (error) {
                return { data: null, error: { message: error.message } };
            }

            if (!data.user) {
                return { data: null, error: { message: 'Update succeeded but no user returned' } };
            }

            return { data: data.user, error: null };
        });
    }
}

export const AuthApi = AuthApiClass.getInstance();
