/**
 * Users API Endpoints
 * RESTful user profile operations. Each field can be updated independently.
 */

import { apiClient } from '../ApiClient';
import { logger } from '../../services/logging/Logger';
import { ApiResponse, UpdateProfileRequest } from '../../types/api.types';
import { User } from '../../types/database.types';

class UsersApiClass {
    private static instance: UsersApiClass;

    private constructor() { }

    static getInstance(): UsersApiClass {
        if (!UsersApiClass.instance) {
            UsersApiClass.instance = new UsersApiClass();
        }
        return UsersApiClass.instance;
    }

    /** Get user profile by ID */
    async getProfile(userId: string): Promise<ApiResponse<User>> {
        logger.debug('API', `getProfile: ${userId}`);

        return apiClient.query<User>('users.getProfile', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            return { data, error };
        });
    }

    /** Update user profile — each field independently */
    async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<ApiResponse<User>> {
        logger.info('API', `updateProfile: ${userId}`, { fields: Object.keys(updates) });

        // Map camelCase request to snake_case DB columns
        const dbUpdates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.neighborhood !== undefined) dbUpdates.neighborhood = updates.neighborhood;
        if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.instagramHandle !== undefined) dbUpdates.instagram_handle = updates.instagramHandle;
        if (updates.languagePreference !== undefined) dbUpdates.language_preference = updates.languagePreference;
        if (updates.privacyVisibility !== undefined) dbUpdates.privacy_visibility = updates.privacyVisibility;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

        return apiClient.query<User>('users.updateProfile', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .update(dbUpdates)
                .eq('id', userId)
                .select()
                .single();

            return { data, error };
        });
    }

    /** Get public profile (respects privacy settings) */
    async getPublicProfile(userId: string, viewerId?: string): Promise<ApiResponse<Partial<User>>> {
        logger.debug('API', `getPublicProfile: ${userId}`);

        return apiClient.query<Partial<User>>('users.getPublicProfile', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, membership_tier, privacy_visibility, avatar_url, current_month_points, total_lifetime_points, neighborhood, city, bio, instagram_handle, created_at')
                .eq('id', userId)
                .single();

            if (error) return { data: null, error };
            if (!data) return { data: null, error: null };

            const profile = data as Record<string, unknown>;
            const visibility = (profile.privacy_visibility as string) || 'friends';

            // If privacy is 'nobody', only return basic info
            if (visibility === 'nobody') {
                return {
                    data: {
                        id: profile.id as string,
                        full_name: profile.full_name as string,
                        membership_tier: profile.membership_tier as string,
                    } as Partial<User>,
                    error: null,
                };
            }

            // If privacy is 'friends', check if viewer is a friend
            if (visibility === 'friends' && viewerId) {
                const { data: friendship } = await supabase
                    .from('friendships')
                    .select('id')
                    .or(`and(requester_id.eq.${userId},addressee_id.eq.${viewerId}),and(requester_id.eq.${viewerId},addressee_id.eq.${userId})`)
                    .eq('status', 'accepted')
                    .single();

                if (!friendship) {
                    return {
                        data: {
                            id: profile.id as string,
                            full_name: profile.full_name as string,
                            membership_tier: profile.membership_tier as string,
                        } as Partial<User>,
                        error: null,
                    };
                }
            }

            return { data: data as Partial<User>, error: null };
        });
    }

    /** Update privacy visibility */
    async updatePrivacy(userId: string, visibility: 'friends' | 'anyone' | 'nobody'): Promise<ApiResponse<void>> {
        logger.info('API', `updatePrivacy: ${userId} -> ${visibility}`);

        return apiClient.query<void>('users.updatePrivacy', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('users')
                .update({ privacy_visibility: visibility })
                .eq('id', userId);

            return { data: undefined as unknown as void, error };
        });
    }

    /** Toggle merchant mode */
    async toggleMerchant(userId: string, isMerchant: boolean): Promise<ApiResponse<void>> {
        logger.info('API', `toggleMerchant: ${userId} -> ${isMerchant}`);

        return apiClient.query<void>('users.toggleMerchant', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('users')
                .update({ is_merchant: isMerchant })
                .eq('id', userId);

            return { data: undefined as unknown as void, error };
        });
    }

    /** Update language preference */
    async updateLanguage(userId: string, language: 'en' | 'pt' | 'es'): Promise<ApiResponse<void>> {
        logger.info('API', `updateLanguage: ${userId} -> ${language}`);

        return apiClient.query<void>('users.updateLanguage', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('users')
                .update({ language_preference: language })
                .eq('id', userId);

            return { data: undefined as unknown as void, error };
        });
    }
    /** Upload user avatar */
    async uploadAvatar(uri: string): Promise<ApiResponse<{ publicUrl: string }>> {
        logger.info('API', 'uploadAvatar');

        return apiClient.query<{ publicUrl: string }>('users.uploadAvatar', async () => {
            const supabase = apiClient.getSupabaseClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            // 1. Process image if needed (resizing/compression usually done on client before upload or Edge Function)
            // For now, we upload directly to storage bucket 'avatars'

            const ext = uri.substring(uri.lastIndexOf('.') + 1);
            const fileName = `${user.id}/${Date.now()}.${ext}`;
            const formData = new FormData();

            // React Native specific file handling
            formData.append('file', {
                uri,
                name: fileName,
                type: `image/${ext}`,
            } as any);

            // Supabase storage upload
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, formData, {
                    upsert: true,
                });

            if (error) return { data: null, error: { message: error.message } };

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return { data: { publicUrl }, error: null };
        });
    }
}

export const UsersApi = UsersApiClass.getInstance();
