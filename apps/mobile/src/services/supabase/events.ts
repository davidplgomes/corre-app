import { supabase } from './client';
import { Event, EventParticipant } from '../../types';

export interface JoinEventResult {
    success: boolean;
    joined: boolean;
    waitlisted: boolean;
    event_id?: string;
    position?: number;
    code?: string;
    message?: string;
    already_joined?: boolean;
    already_waitlisted?: boolean;
}

const parseJoinEventResult = (data: unknown): JoinEventResult => {
    const parsed = (data || {}) as JoinEventResult;
    return {
        success: !!parsed.success,
        joined: !!parsed.joined,
        waitlisted: !!parsed.waitlisted,
        event_id: parsed.event_id,
        position: parsed.position,
        code: parsed.code,
        message: parsed.message,
        already_joined: !!parsed.already_joined,
        already_waitlisted: !!parsed.already_waitlisted,
    };
};

/**
 * Create a new event
 */
export const createEvent = async (
    event: Omit<Event, 'id' | 'created_at' | 'updated_at'>
): Promise<Event> => {
    try {
        const { data, error } = await supabase
            .from('events')
            .insert(event)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

/**
 * Get all upcoming events
 */
export const getUpcomingEvents = async (): Promise<Event[]> => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .gte('event_datetime', new Date().toISOString())
            .order('event_datetime', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting upcoming events:', error);
        throw error;
    }
};

/**
 * Get ALL events (including past ones) - useful for fallback
 */
export const getAllEvents = async (): Promise<Event[]> => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('event_datetime', { ascending: false })
            .limit(50);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting all events:', error);
        throw error;
    }
};

/**
 * Get events for a specific date range
 */
export const getEventsByDateRange = async (
    startDate: Date,
    endDate: Date
): Promise<Event[]> => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .gte('event_datetime', startDate.toISOString())
            .lte('event_datetime', endDate.toISOString())
            .order('event_datetime', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting events by date range:', error);
        throw error;
    }
};

/**
 * Get event by ID
 */
export const getEventById = async (eventId: string): Promise<Event | null> => {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting event by ID:', error);
        throw error;
    }
};

/**
 * Update an event
 */
export const updateEvent = async (
    eventId: string,
    updates: Partial<Event>
): Promise<Event> => {
    try {
        const { data, error } = await supabase
            .from('events')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', eventId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};

/**
 * Delete an event
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('events').delete().eq('id', eventId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
};

export const joinEvent = async (
    eventId: string,
    userId: string
): Promise<JoinEventResult> => {
    try {
        const { data, error } = await supabase.rpc('join_event_or_waitlist', {
            p_event_id: eventId,
        });

        if (error) {
            // Backward-compatible fallback if RPC is not available yet in local environments.
            if (error.code === '42883') {
                const { error: fallbackError } = await supabase
                    .from('event_participants')
                    .insert({
                        event_id: eventId,
                        user_id: userId,
                    });

                if (fallbackError) throw fallbackError;
                return {
                    success: true,
                    joined: true,
                    waitlisted: false,
                    event_id: eventId,
                };
            }

            throw error;
        }

        const result = parseJoinEventResult(data);

        if (result.success && result.joined) {
            // Check for 'Social' achievement
            import('./achievements').then(({ checkAndUnlockAchievement }) => {
                checkAndUnlockAchievement(userId, 'event_joined');
            });
        }

        return result;
    } catch (error) {
        console.error('Error joining event:', error);
        throw error;
    }
};

/**
 * Leave an event
 */
export const leaveEvent = async (
    eventId: string,
    userId: string
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error leaving event:', error);
        throw error;
    }
};

/**
 * Get event participants
 */
export const getEventParticipants = async (
    eventId: string
): Promise<EventParticipant[]> => {
    try {
        const { data, error } = await supabase
            .from('event_participants')
            .select('*, users(id, full_name, membership_tier)')
            .eq('event_id', eventId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting event participants:', error);
        throw error;
    }
};

/**
 * Check if user has joined an event
 */
export const hasUserJoinedEvent = async (
    eventId: string,
    userId: string
): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('event_participants')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (error) {
        console.error('Error checking if user joined event:', error);
        return false;
    }
};

/**
 * Get user's joined events
 */
export const getUserJoinedEvents = async (
    userId: string
): Promise<Event[]> => {
    try {
        const { data, error } = await supabase
            .from('event_participants')
            .select('events(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return data?.map((item: any) => item.events) || [];
    } catch (error) {
        console.error('Error getting user joined events:', error);
        throw error;
    }
};
