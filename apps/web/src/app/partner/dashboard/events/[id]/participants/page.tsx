'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getEventById, getEventParticipants } from '@/lib/services/events';
import type { Event, EventParticipant } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import { Calendar, ChevronLeft, Loader2, MapPin, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';

type ParticipantWithCheckIn = EventParticipant & {
    checked_in_at: string | null;
    points_earned: number | null;
};

export default function PartnerEventParticipantsPage() {
    const params = useParams<{ id: string }>();
    const eventId = params?.id;
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<Event | null>(null);
    const [participants, setParticipants] = useState<ParticipantWithCheckIn[]>([]);
    const [authorized, setAuthorized] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!eventId) {
                toast.error('Event id is missing');
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                if (!session) {
                    toast.error('You must be logged in');
                    return;
                }

                const eventData = await getEventById(eventId);
                if (!eventData) {
                    toast.error('Event not found');
                    return;
                }

                if (eventData.creator_id !== session.user.id) {
                    setAuthorized(false);
                    toast.error('You do not have access to this event');
                    return;
                }

                setEvent(eventData);

                const participantRows = await getEventParticipants(eventId);
                if (participantRows.length === 0) {
                    setParticipants([]);
                    return;
                }

                const participantUserIds = participantRows
                    .map((row) => row.user_id)
                    .filter((value): value is string => typeof value === 'string' && value.length > 0);

                const { data: checkIns, error: checkInsError } = await supabase
                    .from('check_ins')
                    .select('user_id, checked_in_at, points_earned')
                    .eq('event_id', eventId)
                    .in('user_id', participantUserIds);

                if (checkInsError) {
                    throw checkInsError;
                }

                const checkInsByUserId = new Map<string, { checked_in_at: string; points_earned: number }>();
                (checkIns || []).forEach((row) => {
                    if (!row.user_id || checkInsByUserId.has(row.user_id)) return;
                    checkInsByUserId.set(row.user_id, {
                        checked_in_at: row.checked_in_at,
                        points_earned: row.points_earned,
                    });
                });

                const withCheckIns: ParticipantWithCheckIn[] = participantRows
                    .map((row) => {
                        const checkIn = checkInsByUserId.get(row.user_id);
                        return {
                            ...row,
                            checked_in_at: checkIn?.checked_in_at || null,
                            points_earned: checkIn?.points_earned ?? null,
                        };
                    })
                    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

                setParticipants(withCheckIns);
            } catch (error) {
                console.error('Error loading event participants:', error);
                toast.error('Failed to load event participants');
            } finally {
                setLoading(false);
            }
        };

        void loadData();
    }, [eventId, supabase]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5722]" />
            </div>
        );
    }

    if (!authorized) {
        return (
            <GlassCard className="p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Access denied</h2>
                <p className="text-white/50 mb-6">This event does not belong to your partner account.</p>
                <Link
                    href="/partner/dashboard/events"
                    className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#FF5722] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to events
                </Link>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <Link
                        href="/partner/dashboard/events"
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 hover:text-white mb-3 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to events
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Participants</h1>
                    <p className="text-white/40 text-sm mt-1">
                        {event ? `Attendance for "${event.title}"` : 'Attendance details'}
                    </p>
                </div>
                {event ? (
                    <div className="text-xs text-white/40 space-y-1">
                        <div className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(event.event_datetime).toLocaleString('en-IE')}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{event.location_name || 'Location TBD'}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>{event.points_value} points</span>
                        </div>
                    </div>
                ) : null}
            </div>

            <GlassCard className="overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-sm uppercase tracking-wider text-white/60 font-bold">Event Attendance</h2>
                    <span className="text-xs text-white/50 inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {participants.length} participant{participants.length === 1 ? '' : 's'}
                    </span>
                </div>

                {participants.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="text-white/40">No participants joined this event yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 text-[10px] uppercase tracking-wider text-white/35 font-mono">Runner</th>
                                    <th className="p-4 text-[10px] uppercase tracking-wider text-white/35 font-mono">Tier</th>
                                    <th className="p-4 text-[10px] uppercase tracking-wider text-white/35 font-mono">Joined</th>
                                    <th className="p-4 text-[10px] uppercase tracking-wider text-white/35 font-mono">Check-In</th>
                                    <th className="p-4 text-[10px] uppercase tracking-wider text-white/35 font-mono">Points</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {participants.map((participant) => {
                                    const runnerName = participant.users?.full_name || 'Unknown runner';
                                    const runnerEmail = participant.users?.email || participant.user_id;
                                    const tier = participant.users?.membership_tier || 'free';
                                    const checkedIn = !!participant.checked_in_at;

                                    return (
                                        <tr key={participant.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4">
                                                <p className="text-sm font-medium text-white">{runnerName}</p>
                                                <p className="text-xs text-white/40 mt-1">{runnerEmail}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded border border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-white/70">
                                                    {tier}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-white/70">
                                                {new Date(participant.joined_at).toLocaleString('en-IE')}
                                            </td>
                                            <td className="p-4">
                                                {checkedIn ? (
                                                    <span className="px-2 py-1 rounded border border-green-500/30 bg-green-500/10 text-[10px] uppercase tracking-wider text-green-400">
                                                        Checked in
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded border border-white/10 bg-white/5 text-[10px] uppercase tracking-wider text-white/40">
                                                        Not checked in
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-white/80">
                                                {participant.points_earned != null ? participant.points_earned : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
