import { supabase } from './client';

export type WaitlistStatus = 'waiting' | 'claimable' | 'expired';

type WaitlistRawRow = {
    id: string;
    event_id: string;
    user_id: string;
    position: number;
    tier_priority: number;
    joined_at: string;
    promoted_at: string | null;
    event:
        | {
            id: string;
            title: string;
            event_datetime: string;
            location_name: string | null;
        }
        | {
            id: string;
            title: string;
            event_datetime: string;
            location_name: string | null;
        }[]
        | null;
};

type WaitlistEvent = {
    id: string;
    title: string;
    event_datetime: string;
    location_name: string | null;
};

type WaitlistNormalizedRow = Omit<WaitlistRawRow, 'event'> & { event: WaitlistEvent };

export type WaitlistEntry = {
    id: string;
    event_id: string;
    user_id: string;
    position: number;
    tier_priority: number;
    joined_at: string;
    promoted_at: string | null;
    status: WaitlistStatus;
    event: {
        id: string;
        title: string;
        event_datetime: string;
        location_name: string;
        current_participants: number;
    };
};

type WaitlistRpcResult = {
    success: boolean;
    code?: string;
    message?: string;
    event_id?: string;
    already_registered?: boolean;
};

const deriveStatus = (eventDateIso: string, position: number): WaitlistStatus => {
    const eventDate = new Date(eventDateIso);
    if (eventDate < new Date()) return 'expired';
    if (position === 1) return 'claimable';
    return 'waiting';
};

const parseWaitlistRpcResult = (result: unknown): WaitlistRpcResult => {
    const parsed = (result || {}) as WaitlistRpcResult;
    return {
        success: !!parsed.success,
        code: parsed.code,
        message: parsed.message,
        event_id: parsed.event_id,
        already_registered: parsed.already_registered,
    };
};

export const getUserWaitlistEntries = async (userId: string): Promise<WaitlistEntry[]> => {
    const { data, error } = await supabase
        .from('event_waitlist')
        .select(`
            id,
            event_id,
            user_id,
            position,
            tier_priority,
            joined_at,
            promoted_at,
            event:events (
                id,
                title,
                event_datetime,
                location_name
            )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

    if (error) throw error;

    const rawRows = (data || []) as WaitlistRawRow[];
    const rows: WaitlistNormalizedRow[] = [];

    for (const row of rawRows) {
        const eventRecord = Array.isArray(row.event) ? row.event[0] : row.event;
        if (!eventRecord) continue;
        rows.push({
            ...row,
            event: eventRecord,
        });
    }

    if (rows.length === 0) {
        return [];
    }

    const eventIds = [...new Set(rows.map((row) => row.event_id))];
    const { data: participantRows, error: participantsError } = await supabase
        .from('event_participants')
        .select('event_id')
        .in('event_id', eventIds);

    if (participantsError) throw participantsError;

    const participantCountByEventId = new Map<string, number>();
    (participantRows || []).forEach((row: { event_id: string }) => {
        participantCountByEventId.set(
            row.event_id,
            (participantCountByEventId.get(row.event_id) || 0) + 1
        );
    });

    return rows.map((row) => ({
        id: row.id,
        event_id: row.event_id,
        user_id: row.user_id,
        position: row.position,
        tier_priority: row.tier_priority,
        joined_at: row.joined_at,
        promoted_at: row.promoted_at,
        status: deriveStatus(row.event.event_datetime, row.position),
        event: {
            id: row.event.id,
            title: row.event.title,
            event_datetime: row.event.event_datetime,
            location_name: row.event.location_name || 'Location TBD',
            current_participants: participantCountByEventId.get(row.event_id) || 0,
        },
    }));
};

export const leaveWaitlistEntry = async (entryId: string): Promise<WaitlistRpcResult> => {
    const { data, error } = await supabase.rpc('leave_event_waitlist_entry', {
        p_waitlist_entry_id: entryId,
    });

    if (error) throw error;
    return parseWaitlistRpcResult(data);
};

export const claimWaitlistSpot = async (entryId: string): Promise<WaitlistRpcResult> => {
    const { data, error } = await supabase.rpc('claim_event_waitlist_spot', {
        p_waitlist_entry_id: entryId,
    });

    if (error) throw error;
    return parseWaitlistRpcResult(data);
};
