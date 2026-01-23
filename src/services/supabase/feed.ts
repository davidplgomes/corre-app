import { supabase } from './client';
import { FeedPost, PostComment } from '../../types';

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
/**
 * Get feed posts from friends only
 */
export const getFriendFeedPosts = async (friendIds: string[], limit = 20, offset = 0): Promise<FeedPost[]> => {
    try {
        if (friendIds.length === 0) return [];

        const { data, error } = await supabase
            .from('feed_posts')
            .select('*, users(id, full_name, membership_tier, is_merchant)')
            .in('user_id', friendIds)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting friend feed posts:', error);
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

        if (post.activity_type === 'run' && post.user_id) {
            // Lazy load - don't await to not block UI
            import('./achievements').then(({ checkAndUnlockAchievement }) => {
                checkAndUnlockAchievement(post.user_id, 'run_finished', { date: new Date(), distance: (post as any).distance_km });
            });
        }

        return data;
    } catch (error) {
        console.error('Error creating feed post:', error);
        throw error;
    }
};

/**
 * Get user's run history (feed posts of type 'run')
 */
export const getUserRuns = async (userId: string): Promise<FeedPost[]> => {
    try {
        const { data, error } = await supabase
            .from('feed_posts')
            .select('*')
            .eq('user_id', userId)
            .eq('activity_type', 'run')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user runs:', error);
        throw error;
    }
};

/**
 * Like a post
 */
export const likePost = async (postId: string, userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('post_likes')
            .insert({ post_id: postId, user_id: userId });

        if (error) throw error;
    } catch (error: any) {
        // Ignore unique constraint violation (already liked)
        if (error.code !== '23505') {
            console.error('Error liking post:', error);
            throw error;
        }
    }
};

/**
 * Unlike a post
 */
export const unlikePost = async (postId: string, userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('post_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error unliking post:', error);
        throw error;
    }
};

/**
 * Check if user liked a post
 */
export const hasUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking like status:', error);
        return false;
    }
};

/**
 * Get like count for a post
 */
export const getPostLikesCount = async (postId: string): Promise<number> => {
    try {
        const { count, error } = await supabase
            .from('post_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error getting like count:', error);
        return 0;
    }
};

/**
 * Add a comment to a post
 */
export const addComment = async (
    postId: string,
    userId: string,
    content: string
): Promise<PostComment> => {
    try {
        const { data, error } = await supabase
            .from('post_comments')
            .insert({
                post_id: postId,
                user_id: userId,
                content
            })
            .select('*, users(id, full_name, membership_tier)')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

/**
 * Get comments for a post
 */
export const getComments = async (postId: string): Promise<PostComment[]> => {
    try {
        const { data, error } = await supabase
            .from('post_comments')
            .select('*, users(id, full_name, membership_tier)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting comments:', error);
        throw error;
    }
};
