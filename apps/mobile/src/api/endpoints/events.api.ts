/**
 * Events API Endpoints
 * Refactored from services/supabase/events.ts to go through API client.
 */

import { apiClient } from '../ApiClient';
import { logger } from '../../services/logging/Logger';
import { ApiResponse } from '../../types/api.types';
import { Event, EventParticipant } from '../../types/database.types';

class EventsApiClass {
    private static instance: EventsApiClass;

    private constructor() { }

    static getInstance(): EventsApiClass {
        if (!EventsApiClass.instance) {
            EventsApiClass.instance = new EventsApiClass();
        }
        return EventsApiClass.instance;
    }

    /** Get all upcoming events */
    async getUpcomingEvents(): Promise<ApiResponse<Event[]>> {
        logger.debug('API', 'getUpcomingEvents');

        return apiClient.query<Event[]>('events.getUpcoming', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .gte('event_datetime', new Date().toISOString())
                .order('event_datetime', { ascending: true });

            return { data: data || [], error };
        });
    }

    /** Get event by ID */
    async getEvent(eventId: string): Promise<ApiResponse<Event>> {
        logger.debug('API', `getEvent: ${eventId}`);

        return apiClient.query<Event>('events.getById', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            return { data, error };
        });
    }

    /** Create a new event */
    async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Event>> {
        logger.info('API', 'createEvent', { title: event.title });

        return apiClient.query<Event>('events.create', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('events')
                .insert(event)
                .select()
                .single();

            return { data, error };
        });
    }

    /** Join an event */
    async joinEvent(eventId: string, userId: string): Promise<ApiResponse<EventParticipant>> {
        logger.info('API', `joinEvent: ${eventId}`, { userId });

        return apiClient.query<EventParticipant>('events.join', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('event_participants')
                .insert({ event_id: eventId, user_id: userId })
                .select()
                .single();

            return { data, error };
        });
    }

    /** Leave an event */
    async leaveEvent(eventId: string, userId: string): Promise<ApiResponse<void>> {
        logger.info('API', `leaveEvent: ${eventId}`, { userId });

        return apiClient.query<void>('events.leave', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { error } = await supabase
                .from('event_participants')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', userId);

            return { data: undefined as unknown as void, error };
        });
    }

    /** Get event participants */
    async getParticipants(eventId: string): Promise<ApiResponse<EventParticipant[]>> {
        logger.debug('API', `getParticipants: ${eventId}`);

        return apiClient.query<EventParticipant[]>('events.getParticipants', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('event_participants')
                .select('*, users(id, full_name, membership_tier, avatar_url)')
                .eq('event_id', eventId);

            return { data: data || [], error };
        });
    }

    /** Get user's joined events */
    async getUserEvents(userId: string): Promise<ApiResponse<Event[]>> {
        logger.debug('API', `getUserEvents: ${userId}`);

        return apiClient.query<Event[]>('events.getUserEvents', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('event_participants')
                .select('event_id, events(*)')
                .eq('user_id', userId)
                .order('joined_at', { ascending: false });

            if (error) return { data: null, error };

            const events = (data || [])
                .map((p: Record<string, unknown>) => p.events as Event)
                .filter(Boolean);

            return { data: events, error: null };
        });
    }
}

export const EventsApi = EventsApiClass.getInstance();
