import { supabase } from './client';

/**
 * Run data type
 */
export interface Run {
    id: string;
    user_id: string;
    distance_km: number;
    duration_seconds: number;
    pace_per_km: number | null;
    points_earned: number;
    route_data: RoutePoint[] | null;
    started_at: string;
    ended_at: string;
    created_at: string;
}

export interface RoutePoint {
    lat: number;
    lng: number;
    timestamp: number;
    altitude?: number;
    speed?: number;
}

export interface CreateRunData {
    user_id: string;
    distance_km: number;
    duration_seconds: number;
    route_data?: RoutePoint[];
    step_count?: number;
    started_at: Date;
    ended_at: Date;
}

export interface RunStats {
    totalRuns: number;
    totalDistanceKm: number;
    totalDurationSeconds: number;
    totalPointsFromRuns: number;
    averagePace: number | null;
    longestRun: number;
    thisMonthRuns: number;
    thisMonthDistanceKm: number;
}

/**
 * Create a new run record
 * Points are automatically calculated by database trigger
 */
/**
 * Create a new run record (Secure RPC)
 */
export const createRun = async (data: CreateRunData): Promise<Run> => {
    try {
        // Use RPC 'submit_secure_run' for server-side validation
        const { data: result, error } = await supabase.rpc('submit_secure_run', {
            p_user_id: data.user_id,
            p_started_at: data.started_at.toISOString(),
            p_ended_at: data.ended_at.toISOString(),
            p_route_data: data.route_data || [],
            p_step_count: data.step_count || 0
        });

        if (error) throw error;

        // Result contains success status and run info
        if (!result.success) {
            throw new Error(result.error || 'Failed to submit run');
        }

        // Fetch the full run object to return (optional, RPC returns minimal info)
        const run: Run = {
            id: result.run_id,
            user_id: data.user_id,
            distance_km: result.distance_km, // Use server calculated distance
            duration_seconds: data.duration_seconds,
            pace_per_km: data.duration_seconds / result.distance_km,
            points_earned: result.points_earned,
            route_data: data.route_data || null,
            started_at: data.started_at.toISOString(),
            ended_at: data.ended_at.toISOString(),
            created_at: new Date().toISOString(),
        };

        // Check achievements for run completion
        import('./achievements').then(({ checkAndUnlockAchievement }) => {
            checkAndUnlockAchievement(data.user_id, 'run_finished', {
                date: new Date(),
                distance: result.distance_km,
            });
        });

        return run;
    } catch (error) {
        console.error('Error creating run:', error);
        throw error;
    }
};

/**
 * Get runs for a user
 */
export const getUserRuns = async (
    userId: string,
    limit: number = 50
): Promise<Run[]> => {
    try {
        const { data, error } = await supabase
            .from('runs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user runs:', error);
        throw error;
    }
};

/**
 * Get a single run by ID
 */
export const getRunById = async (runId: string): Promise<Run | null> => {
    try {
        const { data, error } = await supabase
            .from('runs')
            .select('*')
            .eq('id', runId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting run:', error);
        return null;
    }
};

/**
 * Get run statistics for a user
 */
export const getRunStats = async (userId: string): Promise<RunStats> => {
    try {
        const { data, error } = await supabase
            .from('runs')
            .select('distance_km, duration_seconds, points_earned, pace_per_km, created_at')
            .eq('user_id', userId);

        if (error) throw error;

        const runs = data || [];
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonthRuns = runs.filter(
            (r) => new Date(r.created_at) >= firstDayOfMonth
        );

        const totalDistance = runs.reduce((sum, r) => sum + Number(r.distance_km), 0);
        const totalDuration = runs.reduce((sum, r) => sum + r.duration_seconds, 0);
        const totalPoints = runs.reduce((sum, r) => sum + r.points_earned, 0);
        const longestRun = Math.max(...runs.map((r) => Number(r.distance_km)), 0);

        const avgPace =
            totalDistance > 0
                ? Math.round(totalDuration / totalDistance)
                : null;

        return {
            totalRuns: runs.length,
            totalDistanceKm: Math.round(totalDistance * 100) / 100,
            totalDurationSeconds: totalDuration,
            totalPointsFromRuns: totalPoints,
            averagePace: avgPace,
            longestRun: Math.round(longestRun * 100) / 100,
            thisMonthRuns: thisMonthRuns.length,
            thisMonthDistanceKm:
                Math.round(
                    thisMonthRuns.reduce((sum, r) => sum + Number(r.distance_km), 0) * 100
                ) / 100,
        };
    } catch (error) {
        console.error('Error getting run stats:', error);
        return {
            totalRuns: 0,
            totalDistanceKm: 0,
            totalDurationSeconds: 0,
            totalPointsFromRuns: 0,
            averagePace: null,
            longestRun: 0,
            thisMonthRuns: 0,
            thisMonthDistanceKm: 0,
        };
    }
};

/**
 * Get recent runs for the feed/community
 */
export const getRecentCommunityRuns = async (limit: number = 20): Promise<Run[]> => {
    try {
        const { data, error } = await supabase
            .from('runs')
            .select('*, users(id, full_name, membership_tier, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting community runs:', error);
        return [];
    }
};

/**
 * Calculate points preview (client-side, for UI feedback)
 */
export const calculateRunPointsPreview = (distanceKm: number): number => {
    if (distanceKm >= 21) return 15;
    if (distanceKm >= 10) return 10;
    if (distanceKm >= 5) return 5;
    if (distanceKm >= 2) return 3;
    return 1;
};

/**
 * Format pace from seconds per km to "M'SS"/km" string
 */
export const formatPace = (paceSecondsPerKm: number | null): string => {
    if (!paceSecondsPerKm) return "--'--\"/km";
    const minutes = Math.floor(paceSecondsPerKm / 60);
    const seconds = paceSecondsPerKm % 60;
    return `${minutes}'${seconds.toString().padStart(2, '0')}"/km`;
};

/**
 * Format duration from seconds to "HH:MM:SS" or "MM:SS" string
 */
export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
