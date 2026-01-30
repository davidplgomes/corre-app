import { createClient } from '@/lib/supabase';
import type { Event, EventParticipant } from '@/types';

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_datetime', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(): Promise<Event[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_datetime', new Date().toISOString())
        .order('event_datetime', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create event
 */
export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update event
 */
export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<Event> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', eventId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete event
 */
export async function deleteEvent(eventId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

    if (error) throw error;
}

/**
 * Get event participants with user info
 */
export async function getEventParticipants(eventId: string): Promise<EventParticipant[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('event_participants')
        .select('*, users(id, full_name, email, membership_tier, avatar_url)')
        .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
}

/**
 * Get events by creator
 */
export async function getEventsByCreator(creatorId: string): Promise<Event[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', creatorId)
        .order('event_datetime', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get event stats for dashboard
 */
export async function getEventStats() {
    const supabase = createClient();
    const now = new Date().toISOString();

    const [total, upcoming, thisMonth] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).gte('event_datetime', now),
        supabase.from('events').select('id', { count: 'exact', head: true })
            .gte('event_datetime', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    return {
        totalEvents: total.count || 0,
        upcomingEvents: upcoming.count || 0,
        eventsThisMonth: thisMonth.count || 0,
    };
}
