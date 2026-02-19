/**
 * Feed API Endpoints
 * Refactored from services/supabase/feed.ts to go through API client.
 */

import { apiClient } from '../ApiClient';
import { logger } from '../../services/logging/Logger';
import { ApiResponse } from '../../types/api.types';
import { FeedPost } from '../../types/database.types';

class FeedApiClass {
    private static instance: FeedApiClass;

    private constructor() { }

    static getInstance(): FeedApiClass {
        if (!FeedApiClass.instance) {
            FeedApiClass.instance = new FeedApiClass();
        }
        return FeedApiClass.instance;
    }

    /** Get feed posts with user data */
    async getFeed(limit: number = 20, offset: number = 0): Promise<ApiResponse<FeedPost[]>> {
        logger.debug('API', 'getFeed', { limit, offset });

        return apiClient.query<FeedPost[]>('feed.getFeed', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('feed_posts')
                .select('*, users(id, full_name, membership_tier, avatar_url)')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            return { data: data || [], error };
        });
    }

    /** Create a feed post */
    async createPost(post: Omit<FeedPost, 'id' | 'created_at'>): Promise<ApiResponse<FeedPost>> {
        logger.info('API', 'createPost', { activityType: post.activity_type });

        return apiClient.query<FeedPost>('feed.createPost', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('feed_posts')
                .insert(post)
                .select()
                .single();

            return { data, error };
        });
    }

    /** Like a post */
    async likePost(postId: string, userId: string): Promise<ApiResponse<void>> {
        logger.info('API', `likePost: ${postId}`, { userId });

        return apiClient.query<void>('feed.likePost', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('post_likes')
                .insert({ post_id: postId, user_id: userId });

            return { data: undefined as unknown as void, error };
        });
    }

    /** Unlike a post */
    async unlikePost(postId: string, userId: string): Promise<ApiResponse<void>> {
        logger.info('API', `unlikePost: ${postId}`, { userId });

        return apiClient.query<void>('feed.unlikePost', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('post_likes')
                .delete()
                .eq('post_id', postId)
                .eq('user_id', userId);

            return { data: undefined as unknown as void, error };
        });
    }

    /** Add a comment to a post */
    async addComment(postId: string, userId: string, content: string): Promise<ApiResponse<void>> {
        logger.info('API', `addComment: ${postId}`);

        return apiClient.query<void>('feed.addComment', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('post_comments')
                .insert({ post_id: postId, user_id: userId, content });

            return { data: undefined as unknown as void, error };
        });
    }
}

export const FeedApi = FeedApiClass.getInstance();
