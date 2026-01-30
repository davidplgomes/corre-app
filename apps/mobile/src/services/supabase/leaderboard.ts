import { supabase } from './client';
import { LeaderboardEntry } from '../../types';

/**
 * Get current month's leaderboard
 */
export const getCurrentMonthLeaderboard = async (
    limit: number = 50
): Promise<LeaderboardEntry[]> => {
    try {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data, error } = await supabase
            .from('monthly_leaderboard')
            .select('*, users(full_name, neighborhood, membership_tier, avatar_url)')
            .eq('month', currentMonth.toISOString().split('T')[0])
            .order('points', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting current month leaderboard:', error);
        throw error;
    }
};

/**
 * Get leaderboard for a specific month
 */
export const getLeaderboardByMonth = async (
    month: Date,
    limit: number = 50
): Promise<LeaderboardEntry[]> => {
    try {
        const monthKey = new Date(month.getFullYear(), month.getMonth(), 1);

        const { data, error } = await supabase
            .from('monthly_leaderboard')
            .select('*, users(full_name, neighborhood, membership_tier, avatar_url)')
            .eq('month', monthKey.toISOString().split('T')[0])
            .order('points', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting leaderboard by month:', error);
        throw error;
    }
};

/**
 * Get user's rank for current month
 */
export const getUserRank = async (
    userId: string
): Promise<{ rank: number | null; points: number; total: number }> => {
    try {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get user's entry
        const { data: userEntry, error: userError } = await supabase
            .from('monthly_leaderboard')
            .select('rank, points')
            .eq('user_id', userId)
            .eq('month', currentMonth.toISOString().split('T')[0])
            .maybeSingle();

        if (userError) throw userError;

        // Get total number of users on leaderboard
        const { count, error: countError } = await supabase
            .from('monthly_leaderboard')
            .select('*', { count: 'exact', head: true })
            .eq('month', currentMonth.toISOString().split('T')[0]);

        if (countError) throw countError;

        return {
            rank: userEntry?.rank || null,
            points: userEntry?.points || 0,
            total: count || 0,
        };
    } catch (error) {
        console.error('Error getting user rank:', error);
        return { rank: null, points: 0, total: 0 };
    }
};

/**
 * Get user's position in leaderboard (with context - users above and below)
 */
export const getUserLeaderboardContext = async (
    userId: string,
    contextSize: number = 5
): Promise<LeaderboardEntry[]> => {
    try {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get user's rank first
        const { data: userEntry, error: userError } = await supabase
            .from('monthly_leaderboard')
            .select('rank')
            .eq('user_id', userId)
            .eq('month', currentMonth.toISOString().split('T')[0])
            .maybeSingle();

        if (userError) throw userError;
        if (!userEntry?.rank) return [];

        const userRank = userEntry.rank;
        const startRank = Math.max(1, userRank - contextSize);
        const endRank = userRank + contextSize;

        // Get users in range
        const { data, error } = await supabase
            .from('monthly_leaderboard')
            .select('*, users(full_name, neighborhood, membership_tier, avatar_url)')
            .eq('month', currentMonth.toISOString().split('T')[0])
            .gte('rank', startRank)
            .lte('rank', endRank)
            .order('rank', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user leaderboard context:', error);
        throw error;
    }
};

/**
 * Get user's historical rankings
 */
export const getUserHistory = async (
    userId: string,
    months: number = 6
): Promise<LeaderboardEntry[]> => {
    try {
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth() - months, 1);

        const { data, error } = await supabase
            .from('monthly_leaderboard')
            .select('*')
            .eq('user_id', userId)
            .gte('month', startMonth.toISOString().split('T')[0])
            .order('month', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user history:', error);
        throw error;
    }
};
