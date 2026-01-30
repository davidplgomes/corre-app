'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Trash2, MapPin, User, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllEvents, deleteEvent } from '@/lib/services/events';
import { AdminTable } from '@/components/ui/admin-table';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/types';

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    useEffect(() => {
        checkAuth();
        fetchEvents();
    }, []);

    const checkAuth = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.push('/login');
            return;
        }

        // Check if admin
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (userData?.role !== 'admin') {
            router.push('/');
        }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await getAllEvents();
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;

        try {
            setDeleting(eventId);
            await deleteEvent(eventId);
            setEvents(events.filter(e => e.id !== eventId));
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event');
        } finally {
            setDeleting(null);
        }
    };

    const filteredEvents = events.filter(event => {
        if (filter === 'all') return true;
        const eventDate = new Date(event.event_datetime);
        const now = new Date();
        if (filter === 'upcoming') return eventDate >= now;
        if (filter === 'past') return eventDate < now;
        return true;
    });

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#FF5722] selection:text-white pb-20">
            {/* Background Grid */}
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/dashboard"
                            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight">Event Management</h1>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        All Events
                    </button>
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'upcoming' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setFilter('past')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'past' ? 'bg-[#FF5722] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Past
                    </button>
                </div>

                {/* Events Table */}
                <AdminTable
                    data={filteredEvents}
                    isLoading={loading}
                    columns={[
                        {
                            header: 'Event',
                            cell: (event) => (
                                <div>
                                    <p className="font-medium text-white">{event.title}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(event.event_datetime).toLocaleString()}</span>
                                    </div>
                                </div>
                            )
                        },
                        {
                            header: 'Type',
                            cell: (event) => (
                                <Badge variant="outline" className="uppercase text-[10px]">
                                    {event.event_type.replace('_', ' ')}
                                </Badge>
                            )
                        },
                        {
                            header: 'Location',
                            cell: (event) => (
                                <div className="flex items-center gap-2 text-sm text-white/60">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate max-w-[200px]">{event.location_name || 'No location'}</span>
                                </div>
                            )
                        },
                        {
                            header: 'Points',
                            accessorKey: 'points_value',
                            className: 'font-mono'
                        },
                        {
                            header: 'Actions',
                            cell: (event) => (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDelete(event.id)}
                                        disabled={deleting === event.id}
                                        className="p-2 rounded-lg text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        title="Delete Event"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                />
            </main>
        </div>
    );
}
