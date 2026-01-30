'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getEventsByCreator } from '@/lib/services/events';
import type { Event } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import { Plus, Calendar, Search, Filter, Loader2, MapPin, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) return;

                const data = await getEventsByCreator(session.user.id);
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
                toast.error('Failed to load events');
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">My Events</h1>
                    <p className="text-white/40">Host runs and community meetups</p>
                </div>
                <Link href="/partner/dashboard/events/new">
                    <button className="h-10 px-4 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Host Event
                    </button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                    />
                </div>
                <button className="h-10 w-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                    <Filter className="w-4 h-4" />
                </button>
            </div>

            {/* Grid */}
            {filteredEvents.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No events hosted</h3>
                    <p className="text-white/40 mb-6">Engage the community by creating your first event</p>
                    <Link href="/partner/dashboard/events/new">
                        <button className="h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors">
                            Host Event
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => {
                        const isPast = new Date(event.event_datetime) < new Date();
                        return (
                            <GlassCard key={event.id} className={`group p-6 flex flex-col h-full hover:border-[#FF5722]/30 transition-all ${isPast ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 border border-white/10 text-center">
                                        <span className="text-xs text-[#FF5722] font-bold uppercase tracking-wider">{new Date(event.event_datetime).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-2xl font-black text-white leading-none">{new Date(event.event_datetime).getDate()}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${isPast ? 'bg-white/5 text-white/40' : 'bg-[#FF5722]/10 text-[#FF5722]'
                                        }`}>
                                        {isPast ? 'Passed' : 'Upcoming'}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#FF5722] transition-colors">{event.title}</h3>
                                    <p className="text-sm text-white/60 mb-4 line-clamp-2">{event.description || 'No description provided.'}</p>

                                    <div className="space-y-2 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <MapPin className="w-3 h-3" />
                                            <span className="truncate">{event.location_name || 'TBA'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-white/40">
                                            <Trophy className="w-3 h-3" />
                                            <span>{event.points_value} Points</span>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
