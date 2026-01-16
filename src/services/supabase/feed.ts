import { supabase } from './client';
import { FeedPost } from '../../types';

/**
 * Get feed posts (pagination supported)
 */
export const getFeedPosts = async (limit = 20, offset = 0): Promise<FeedPost[]> => {
    try {
        const { data, error } = await supabase
            .from('feed_posts')
            .select('*, users(id, full_name, membership_tier, is_merchant)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting feed posts:', error);
        throw error;
    }
};

/**
 * Create a new feed post
 */
export const createFeedPost = async (
    post: Omit<FeedPost, 'id' | 'created_at' | 'users'>
): Promise<FeedPost> => {
    try {
        const { data, error } = await supabase
            .from('feed_posts')
            .insert(post)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating feed post:', error);
        throw error;
    }
};
