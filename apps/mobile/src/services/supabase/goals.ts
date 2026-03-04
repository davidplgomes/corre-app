import { supabase } from './client';
import { getStravaActivities } from './strava';

export type GoalType = 'weekly_distance' | 'weekly_runs' | 'monthly_distance' | 'streak';

export interface UserGoal {
    id: string;
    user_id: string;
    goal_type: GoalType;
    target_value: number;
    title: string;
    unit: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface GoalProgress extends UserGoal {
    current_value: number;
    progress_percent: number;
    completed: boolean;
}

const GOAL_DEFS: Record<GoalType, { title: string; unit: string; emoji: string }> = {
    weekly_distance: { title: 'Weekly Distance', unit: 'km', emoji: '🎯' },
    weekly_runs: { title: 'Weekly Runs', unit: 'runs', emoji: '🏃' },
    monthly_distance: { title: 'Monthly Distance', unit: 'km', emoji: '📅' },
    streak: { title: 'Day Streak', unit: 'days', emoji: '🔥' },
};

export const goalTypeDefinitions = GOAL_DEFS;

export async function getUserGoals(userId: string): Promise<UserGoal[]> {
    const { data, error } = await supabase
        .from('user_goals')
        .select('id, user_id, goal_type, target_value, title, unit, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching user goals:', error);
        throw error;
    }

    return (data || []) as UserGoal[];
}

export async function upsertUserGoal(
    userId: string,
    goalType: GoalType,
    targetValue: number,
    title?: string
): Promise<UserGoal> {
    const fallback = GOAL_DEFS[goalType];
    const safeTarget = Number(targetValue);

    if (!Number.isFinite(safeTarget) || safeTarget <= 0) {
        throw new Error('Goal target must be greater than zero');
    }

    const { data: existing, error: fetchError } = await supabase
        .from('user_goals')
        .select('id')
        .eq('user_id', userId)
        .eq('goal_type', goalType)
        .eq('is_active', true)
        .maybeSingle();

    if (fetchError) {
        console.error('Error checking goal existence:', fetchError);
        throw fetchError;
    }

    if (existing?.id) {
        const { data, error } = await supabase
            .from('user_goals')
            .update({
                target_value: safeTarget,
                title: (title || fallback.title).trim(),
                unit: fallback.unit,
            })
            .eq('id', existing.id)
            .select('id, user_id, goal_type, target_value, title, unit, is_active, created_at, updated_at')
            .single();

        if (error) {
            console.error('Error updating goal:', error);
            throw error;
        }

        return data as UserGoal;
    }

    const { data, error } = await supabase
        .from('user_goals')
        .insert({
            user_id: userId,
            goal_type: goalType,
            target_value: safeTarget,
            title: (title || fallback.title).trim(),
            unit: fallback.unit,
            is_active: true,
        })
        .select('id, user_id, goal_type, target_value, title, unit, is_active, created_at, updated_at')
        .single();

    if (error) {
        console.error('Error creating goal:', error);
        throw error;
    }

    return data as UserGoal;
}

export async function archiveUserGoal(goalId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('user_goals')
        .update({ is_active: false })
        .eq('id', goalId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error archiving goal:', error);
        throw error;
    }
}

type ActivitySample = {
    date: Date;
    distanceKm: number;
};

function normalizeActivities(stravaActivities: any[]): ActivitySample[] {
    const strava = stravaActivities.map((activity: any) => ({
        date: new Date(activity.start_date),
        distanceKm: Number(activity.distance_meters || 0) / 1000,
    }));

    return strava.filter(
        (entry) => Number.isFinite(entry.distanceKm) && !Number.isNaN(entry.date.getTime())
    );
}

function calculateStreak(activities: ActivitySample[]): number {
    if (!activities.length) return 0;

    const uniqueDays = new Set(
        activities.map((entry) => {
            const d = new Date(entry.date);
            d.setHours(0, 0, 0, 0);
            return d.toISOString();
        })
    );

    let streak = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i += 1) {
        if (uniqueDays.has(check.toISOString())) {
            streak += 1;
            check.setDate(check.getDate() - 1);
            continue;
        }

        if (i === 0) {
            check.setDate(check.getDate() - 1);
            continue;
        }

        break;
    }

    return streak;
}

export async function getGoalProgress(userId: string, goals: UserGoal[]): Promise<GoalProgress[]> {
    if (!goals.length) return [];

    const stravaActivities = await getStravaActivities(200).catch(() => []);

    const activities = normalizeActivities(stravaActivities);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weeklyActivities = activities.filter((entry) => entry.date >= weekStart);
    const monthlyActivities = activities.filter((entry) => entry.date >= monthStart);

    const weeklyDistance = weeklyActivities.reduce((sum, entry) => sum + entry.distanceKm, 0);
    const weeklyRuns = weeklyActivities.length;
    const monthlyDistance = monthlyActivities.reduce((sum, entry) => sum + entry.distanceKm, 0);
    const streak = calculateStreak(activities);

    const currentByType: Record<GoalType, number> = {
        weekly_distance: weeklyDistance,
        weekly_runs: weeklyRuns,
        monthly_distance: monthlyDistance,
        streak,
    };

    return goals.map((goal) => {
        const current = currentByType[goal.goal_type] || 0;
        const target = Number(goal.target_value || 0);
        const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

        return {
            ...goal,
            current_value: current,
            progress_percent: progress,
            completed: progress >= 100,
        };
    });
}
