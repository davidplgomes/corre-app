import { makeRedirectUri, startAsync } from 'expo-auth-session';
import { supabase } from './client';

// Strava Config
const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;

if (!STRAVA_CLIENT_ID) {
    console.warn('Strava Client ID is missing. Please set EXPO_PUBLIC_STRAVA_CLIENT_ID in your .env file.');
}

const STRAVA_REDIRECT_URI = makeRedirectUri({
    scheme: 'corre-app',
    path: 'strava-auth',
});

// ─── Types ───────────────────────────────────────────────────────────────────

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
    // Compliance & gamification fields
    cached_until?: string;
    points_awarded?: boolean;
    points_transaction_id?: string;
}

export interface StravaConnection {
    id: string;
    strava_athlete_id: number;
    created_at: string;
}

export interface StravaStats {
    total_km: number;
    total_activities: number;
    avg_pace_seconds_per_km: number;
    longest_run_km: number;
}

// ─── Connection Functions ────────────────────────────────────────────────────

/**
 * Initiate Strava OAuth Flow
 * Requires 'expo-auth-session' to be installed
 */
export const connectStrava = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!STRAVA_CLIENT_ID) {
            return { success: false, error: 'Strava configuration missing' };
        }

        // 1. Get Authorization Code
        const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(
            STRAVA_REDIRECT_URI
        )}&response_type=code&scope=read,activity:read_all`;

        const result = await startAsync({ authUrl });

        if (result.type !== 'success') {
            return { success: false, error: 'Authorization failed or cancelled' };
        }

        const { code } = result.params;

        // 2. Exchange Code for Token via Edge Function
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
 * Disconnect Strava (Delete local connection only)
 * Use disconnectStravaComplete() for full deauthorization
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
 * Disconnect Strava completely - deauthorizes on Strava side and deletes local data
 * This is the preferred method for user-initiated disconnection
 */
export const disconnectStravaComplete = async (): Promise<boolean> => {
    try {
        // Get current connection to get access token
        const { data: connection, error: connError } = await supabase
            .from('strava_connections')
            .select('access_token')
            .maybeSingle();

        if (connError) throw connError;

        // If we have a token, deauthorize on Strava side
        if (connection?.access_token) {
            try {
                await fetch('https://www.strava.com/oauth/deauthorize', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${connection.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Deauthorized on Strava side');
            } catch (stravaError) {
                // Continue anyway - we'll delete our local data
                console.warn('Strava deauth API call failed (continuing with local delete):', stravaError);
            }
        }

        // Delete local connection and activities
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error('User not authenticated');

        // Delete activities first (due to potential FK constraints)
        await supabase
            .from('strava_activities')
            .delete()
            .eq('user_id', userId);

        // Delete connection
        const { error: deleteError } = await supabase
            .from('strava_connections')
            .delete()
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        return true;
    } catch (error) {
        console.error('Error disconnecting Strava completely:', error);
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
 * Check if user has an active Strava connection
 */
export const isStravaConnected = async (): Promise<boolean> => {
    const connection = await getStravaConnection();
    return connection !== null;
};

// ─── Activity Functions ──────────────────────────────────────────────────────

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
 * Get Strava activities with points information
 * Useful for displaying which activities have earned points
 */
export const getStravaActivitiesWithPoints = async (limit = 20): Promise<StravaActivity[]> => {
    try {
        const { data, error } = await supabase
            .from('strava_activities')
            .select('id, strava_id, name, activity_type, distance_meters, moving_time_seconds, start_date, map_polyline, points_earned, cached_until, points_awarded, points_transaction_id')
            .order('start_date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting Strava activities with points:', error);
        return [];
    }
};

/**
 * Get only running activities (eligible for points)
 */
export const getStravaRunningActivities = async (limit = 20): Promise<StravaActivity[]> => {
    try {
        const { data, error } = await supabase
            .from('strava_activities')
            .select('*')
            .in('activity_type', ['Run', 'TrailRun', 'VirtualRun'])
            .order('start_date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting Strava running activities:', error);
        return [];
    }
};

// ─── Stats Functions ─────────────────────────────────────────────────────────

/**
 * Get Aggregated Strava Stats
 */
export const getStravaStats = async (): Promise<StravaStats | null> => {
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

/**
 * Get total points earned from Strava activities
 */
export const getStravaPointsTotal = async (): Promise<number> => {
    try {
        const { data, error } = await supabase
            .from('strava_activities')
            .select('points_earned')
            .eq('points_awarded', true);

        if (error) throw error;

        return (data || []).reduce((sum, activity) => sum + (activity.points_earned || 0), 0);
    } catch (error) {
        console.error('Error getting Strava points total:', error);
        return 0;
    }
};

// ─── Sync Functions ──────────────────────────────────────────────────────────

/**
 * Manually trigger a sync of recent Strava activities
 * Useful after initial connection or if user wants to refresh
 *
 * Note: This requires a 'strava-sync' edge function to be deployed
 * For now, activities are synced automatically via webhooks
 */
export const triggerStravaSync = async (): Promise<{
    success: boolean;
    activitiesSynced?: number;
    error?: string
}> => {
    try {
        const { data, error } = await supabase.functions.invoke('strava-sync', {
            body: { action: 'manual_sync' }
        });

        if (error) throw error;

        return {
            success: true,
            activitiesSynced: data?.activities_synced || 0
        };
    } catch (error: any) {
        // If the function doesn't exist yet, return a helpful message
        if (error.message?.includes('not found') || error.message?.includes('404')) {
            console.warn('strava-sync function not deployed - activities sync via webhooks only');
            return {
                success: false,
                error: 'Manual sync not available. Activities are synced automatically when you record them on Strava.'
            };
        }

        console.error('Error triggering Strava sync:', error);
        return { success: false, error: error.message };
    }
};

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Format pace from seconds per km to mm:ss string
 */
export const formatPace = (secondsPerKm: number): string => {
    if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format distance from meters to km string
 */
export const formatDistance = (meters: number): string => {
    if (!meters || meters <= 0) return '0.00';
    return (meters / 1000).toFixed(2);
};

/**
 * Format duration from seconds to HH:MM:SS or MM:SS string
 */
export const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
