import { supabase } from './client';
import { CheckIn } from '../../types';

/**
 * Create a check-in with server-side validation
 * This calls the validate_and_create_checkin RPC function which:
 * 1. Validates distance from event location
 * 2. Checks time window (event time ± 30 minutes)
 * 3. Ensures user hasn't already checked in
 * 4. Creates check-in record
 * 5. Awards points via trigger
 */
export const createCheckIn = async (
    eventId: string,
    userId: string,
    latitude: number,
    longitude: number
): Promise<{ success: boolean; checkIn?: CheckIn; error?: string }> => {
    try {
        const { data, error } = await supabase.rpc('validate_and_create_checkin', {
            p_event_id: eventId,
            p_user_id: userId,
            p_check_in_lat: latitude,
            p_check_in_lng: longitude,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data.success) {
            return { success: false, error: data.error_message };
        }

        // Check for 'Explorer' achievement
        import('./achievements').then(({ checkAndUnlockAchievement }) => {
            checkAndUnlockAchievement(userId, 'check_in');
        });

        return { success: true, checkIn: data.check_in };
    } catch (error: any) {
        console.error('Error creating check-in:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user's check-ins
 */
export const getUserCheckIns = async (userId: string): Promise<CheckIn[]> => {
    try {
        const { data, error } = await supabase
            .from('check_ins')
            .select('*, events(title, event_type, event_datetime)')
            .eq('user_id', userId)
            .order('checked_in_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user check-ins:', error);
        throw error;
    }
};

/**
 * Get event check-ins
 */
export const getEventCheckIns = async (eventId: string): Promise<CheckIn[]> => {
    try {
        const { data, error } = await supabase
            .from('check_ins')
            .select('*, users(full_name, membership_tier)')
            .eq('event_id', eventId)
            .order('checked_in_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting event check-ins:', error);
        throw error;
    }
};

/**
 * Check if user has checked in to an event
 */
export const hasUserCheckedIn = async (
    eventId: string,
    userId: string
): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('check_ins')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking if user checked in:', error);
        return false;
    }
};

/**
 * Get user's check-in statistics
 */
export const getUserCheckInStats = async (
    userId: string
): Promise<{
    total: number;
    routine: number;
    special: number;
    race: number;
    currentMonth: number;
}> => {
    try {
        const { data, error } = await supabase
            .from('check_ins')
            .select('events(event_type), checked_in_at')
            .eq('user_id', userId);

        if (error) throw error;

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = {
            total: data?.length || 0,
            routine: 0,
            special: 0,
            race: 0,
            currentMonth: 0,
        };

        data?.forEach((checkIn: any) => {
            const eventType = checkIn.events?.event_type;
            if (eventType === 'routine') stats.routine++;
            if (eventType === 'special') stats.special++;
            if (eventType === 'race') stats.race++;

            const checkInDate = new Date(checkIn.checked_in_at);
            if (checkInDate >= firstDayOfMonth) {
                stats.currentMonth++;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting user check-in stats:', error);
        return {
            total: 0,
            routine: 0,
            special: 0,
            race: 0,
            currentMonth: 0,
        };
    }
};
