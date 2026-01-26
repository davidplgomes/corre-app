import { makeRedirectUri, startAsync } from 'expo-auth-session';
import { supabase } from './client';

// Strava Config
const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '123456';
const STRAVA_REDIRECT_URI = makeRedirectUri({
    scheme: 'corre-app',
    path: 'strava-auth',
});

export interface StravaActivity {
    id: string;
    strava_id: number;
    name: string;
    activity_type: string;
    distance_meters: number;
    moving_time_seconds: number;
    start_date: string;
    map_polyline: string | null;
    points_earned: number;
}

export interface StravaConnection {
    id: string;
    strava_athlete_id: number;
    created_at: string;
}

/**
 * Initiate Strava OAuth Flow
 * Requires 'expo-auth-session' to be installed
 */
export const connectStrava = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Get Authorization Code
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(
            STRAVA_REDIRECT_URI
        )}&response_type=code&scope=read,activity:read_all`;

        const result = await startAsync({ authUrl });

        if (result.type !== 'success') {
            return { success: false, error: 'Authorization failed or cancelled' };
        }

        const { code } = result.params;

        // 2. Exchange Code for Token (This should ideally be done via Edge Function to hide Client Secret)
        // For MVP/Demo without backend deployment, we'll assume we can do it here BUT 
        // WARNING: Storing Client Secret in App is insecure.
        // Recommended: Call supabase function 'exchange-strava-token' with code.

        const { data, error } = await supabase.functions.invoke('strava-auth', {
            body: { code, redirect_uri: STRAVA_REDIRECT_URI }
        });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Error connecting Strava:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Disconnect Strava (Delete connection)
 */
export const disconnectStrava = async (): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('strava_connections')
            .delete()
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error disconnecting Strava:', error);
        return false;
    }
};

/**
 * Get User's Strava Connection Status
 */
export const getStravaConnection = async (): Promise<StravaConnection | null> => {
    try {
        const { data, error } = await supabase
            .from('strava_connections')
            .select('id, strava_athlete_id, created_at')
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting Strava connection:', error);
        return null;
    }
};

/**
 * Get Synced Strava Activities
 */
export const getStravaActivities = async (limit = 20): Promise<StravaActivity[]> => {
    try {
        const { data, error } = await supabase
            .from('strava_activities')
            .select('*')
            .order('start_date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting Strava activities:', error);
        return [];
    }
};

/**
 * Get Aggregated Strava Stats
 */
export const getStravaStats = async () => {
    try {
        const { data, error } = await supabase
            .from('user_strava_stats')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'

        return data || {
            total_km: 0,
            total_activities: 0,
            avg_pace_seconds_per_km: 0,
            longest_run_km: 0
        };
    } catch (error) {
        console.error('Error getting Strava stats:', error);
        return null;
    }
};
