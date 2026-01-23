import { supabase } from './client';
import { Event, EventParticipant } from '../../types';

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

/**
 * Join an event
 */
/**
 * Join an event
 */
export const joinEvent = async (
    eventId: string,
    userId: string
): Promise<EventParticipant> => {
    try {
        const { data, error } = await supabase
            .from('event_participants')
            .insert({
                event_id: eventId,
                user_id: userId,
            })
            .select()
            .single();

        if (error) throw error;

        // Check for 'Social' achievement
        import('./achievements').then(({ checkAndUnlockAchievement }) => {
            checkAndUnlockAchievement(userId, 'event_joined');
        });

        return data;
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
