import { supabase } from './client';

export type Achievement = {
    id: string;
    code: string;
    title: string;
    description: string;
    icon: string;
    criteria_type: string;
    criteria_value: number;
    points_reward: number;
    earned_at?: string; // Optional, present if user has unlocked it
};

/**
 * Get all available achievements
 */
export const getAllAchievements = async (): Promise<Achievement[]> => {
    try {
        const { data, error } = await supabase
            .from('achievements')
            .select('*');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting all achievements:', error);
        return [];
    }
};

/**
 * Get achievements unlocked by a specific user
 */
export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
    try {
        // Join user_achievements with achievements definition
        const { data, error } = await supabase
            .from('user_achievements')
            .select('earned_at, achievements(*)')
            .eq('user_id', userId);

        if (error) throw error;

        // Flatten shape
        return (data || []).map((item: any) => ({
            ...item.achievements,
            earned_at: item.earned_at
        }));
    } catch (error) {
        console.error('Error getting user achievements:', error);
        return [];
    }
};

/**
 * Check and unlock achievements based on action
 * This should be called after relevant actions (e.g. finishing a run)
 */
export const checkAndUnlockAchievement = async (
    userId: string,
    actionType: 'run_finished' | 'event_joined' | 'check_in',
    value?: any // e.g. distance, time, etc.
): Promise<Achievement | null> => {
    try {
        // 1. Get all achievements relevant to this action
        // This is a simplified logic. In a robust system, we might query by trigger type.
        const allAchievements = await getAllAchievements();
        const userBadges = await getUserAchievements(userId);
        const unlockedIds = new Set(userBadges.map(b => b.id));

        for (const achievement of allAchievements) {
            if (unlockedIds.has(achievement.id)) continue; // Already unlocked

            let unlocked = false;

            // 2. Check criteria
            switch (achievement.code) {
                case 'run': // First Run
                    if (actionType === 'run_finished') unlocked = true;
                    break;
                case 'sunrise': // Early Bird
                    if (actionType === 'run_finished' && value?.date) {
                        const hour = new Date(value.date).getHours();
                        if (hour < 6) unlocked = true;
                    }
                    break;
                case 'medal': // Marathonist (Total Distance)
                    if (actionType === 'run_finished') {
                        // Check total distance
                        const { data: runs } = await supabase
                            .from('feed_posts')
                            .select('distance_km')
                            .eq('user_id', userId)
                            .eq('activity_type', 'run');

                        const totalKm = runs?.reduce((sum, run) => sum + (run.distance_km || 0), 0) || 0;
                        if (totalKm >= achievement.criteria_value) unlocked = true;
                    }
                    break;
                case 'party': // Social (Event Count)
                    if (actionType === 'event_joined') {
                        const { count } = await supabase
                            .from('event_participants')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', userId);

                        if ((count || 0) >= achievement.criteria_value) unlocked = true;
                    }
                    break;
                case 'compass': // Explorer (Check-in Count)
                    if (actionType === 'check_in') {
                        // For now, assuming check-in logic is implemented elsewhere and we just trigger this
                        // Simplified: Check if user has posts with location?
                        const { count } = await supabase
                            .from('feed_posts')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', userId)
                            .not('location', 'is', null);

                        if ((count || 0) >= achievement.criteria_value) unlocked = true;
                    }
                    break;
            }

            // 3. Award if unlocked
            if (unlocked) {
                const { error } = await supabase
                    .from('user_achievements')
                    .insert({ user_id: userId, achievement_id: achievement.id });

                if (!error) return achievement; // Return the first unlocked one to show toast
            }
        }

        return null;
    } catch (error) {
        console.error('Error checking achievements:', error);
        return null;
    }
};
