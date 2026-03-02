import { supabase } from './client';

const DEFAULT_PACE = "--'--\"/km";

type EventResultsRpcRow = {
    event_id: string;
    event_title: string;
    event_datetime: string;
    event_location_name: string | null;
    event_points_value: number;
    participant_id: string | null;
    participant_name: string | null;
    participant_avatar_url: string | null;
    participant_position: number | null;
    completion_seconds: number | null;
    checked_in_at: string | null;
    points_earned: number | null;
    is_checked_in: boolean;
};

export type EventResultsParticipant = {
    id: string;
    name: string;
    avatarUrl: string | null;
    position: number | null;
    time: string;
    pace: string;
    points: number;
    isCheckedIn: boolean;
    isCurrentUser: boolean;
};

export type EventResultsData = {
    id: string;
    title: string;
    date: string;
    location: string;
    badgeLabel: string;
    totalParticipants: number;
    totalFinishers: number;
    userResult: {
        position: number;
        time: string;
        pace: string;
        points: number;
        personalBest: boolean;
    } | null;
    topFinishers: EventResultsParticipant[];
    allParticipants: EventResultsParticipant[];
};

const formatCompletionTime = (seconds: number | null): string => {
    if (seconds == null || Number.isNaN(seconds) || seconds < 0) {
        return '--:--';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
            .toString()
            .padStart(2, '0')}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const mapParticipant = (
    row: EventResultsRpcRow,
    currentUserId?: string
): EventResultsParticipant | null => {
    if (!row.participant_id) {
        return null;
    }

    return {
        id: row.participant_id,
        name: row.participant_name || 'Runner',
        avatarUrl: row.participant_avatar_url || null,
        position: row.participant_position,
        time: formatCompletionTime(row.completion_seconds),
        pace: DEFAULT_PACE,
        points: row.points_earned ?? 0,
        isCheckedIn: row.is_checked_in,
        isCurrentUser: !!currentUserId && row.participant_id === currentUserId,
    };
};

const fetchEventFallback = async (
    eventId: string
): Promise<{
    id: string;
    title: string;
    event_datetime: string;
    location_name: string | null;
    points_value: number;
} | null> => {
    const { data, error } = await supabase
        .from('events')
        .select('id, title, event_datetime, location_name, points_value')
        .eq('id', eventId)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const getEventResults = async (
    eventId: string,
    currentUserId?: string
): Promise<EventResultsData | null> => {
    const { data, error } = await supabase.rpc('get_event_results', {
        p_event_id: eventId,
    });

    if (error) {
        throw error;
    }

    const rows = (data || []) as EventResultsRpcRow[];
    const eventRow = rows.find((row) => !!row.event_id);

    if (!eventRow) {
        const fallbackEvent = await fetchEventFallback(eventId);

        if (!fallbackEvent) {
            return null;
        }

        return {
            id: fallbackEvent.id,
            title: fallbackEvent.title,
            date: fallbackEvent.event_datetime,
            location: fallbackEvent.location_name || 'Location TBD',
            badgeLabel: `${fallbackEvent.points_value} PTS`,
            totalParticipants: 0,
            totalFinishers: 0,
            userResult: null,
            topFinishers: [],
            allParticipants: [],
        };
    }

    const allParticipants = rows
        .map((row) => mapParticipant(row, currentUserId))
        .filter((participant): participant is EventResultsParticipant => !!participant);

    const finishers = allParticipants
        .filter((participant) => participant.isCheckedIn && participant.position != null)
        .sort((a, b) => (a.position || Number.MAX_SAFE_INTEGER) - (b.position || Number.MAX_SAFE_INTEGER));

    const currentUserFinisher = finishers.find((participant) => participant.isCurrentUser);

    return {
        id: eventRow.event_id,
        title: eventRow.event_title,
        date: eventRow.event_datetime,
        location: eventRow.event_location_name || 'Location TBD',
        badgeLabel: `${eventRow.event_points_value} PTS`,
        totalParticipants: allParticipants.length,
        totalFinishers: finishers.length,
        userResult: currentUserFinisher
            ? {
                position: currentUserFinisher.position || 0,
                time: currentUserFinisher.time,
                pace: currentUserFinisher.pace,
                points: currentUserFinisher.points,
                personalBest: false,
            }
            : null,
        topFinishers: finishers.slice(0, 3),
        allParticipants: finishers,
    };
};
