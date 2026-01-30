'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Trash2, MapPin, Plus, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllEvents, deleteEvent, createEvent, updateEvent } from '@/lib/services/events';
import { AdminTable } from '@/components/ui/admin-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EventForm } from '@/components/admin/event-form';
import { toast } from 'sonner';
import type { Event } from '@/types';

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
            toast.success('Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Failed to delete event');
        } finally {
            setDeleting(null);
        }
    };

    const handleCreate = () => {
        setEditingEvent(null);
        setIsFormOpen(true);
    };

    const handleEdit = (event: Event) => {
        setEditingEvent(event);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Partial<Event>) => {
        setSubmitting(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return;

            if (editingEvent) {
                // Update
                const updated = await updateEvent(editingEvent.id, data);
                setEvents(events.map(e => e.id === updated.id ? updated : e));
            } else {
                // Create
                const newEvent = await createEvent({
                    ...data as any,
                    creator_id: session.user.id
                });
                setEvents([newEvent, ...events]);
                toast.success('Event created successfully');
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error('Error saving event:', error);
            toast.error('Failed to save event');
        } finally {
            setSubmitting(false);
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
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Events</h2>
                    <p className="text-white/40 text-sm">Schedule and manage upcoming events.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'all' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'upcoming' ? 'bg-[#FF5722] text-white' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilter('past')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === 'past' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                                }`}
                        >
                            Past
                        </button>
                    </div>

                    <Button onClick={handleCreate} className="bg-[#FF5722] hover:bg-[#F4511E] text-white border-0 shadow-[0_0_20px_rgba(255,87,34,0.3)] flex-1 md:flex-none">
                        <Plus className="w-4 h-4 mr-2" />
                        New Event
                    </Button>
                </div>
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
                                <p className="font-bold text-white text-sm">{event.title}</p>
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
                            <Badge variant="outline" className="uppercase text-[10px] bg-white/5 border-white/10 text-white/70">
                                {event.event_type.replace('_', ' ')}
                            </Badge>
                        )
                    },
                    {
                        header: 'Location',
                        cell: (event) => (
                            <div className="flex items-center gap-2 text-xs text-white/60">
                                <MapPin className="w-3 h-3 text-[#FF5722]" />
                                <span className="truncate max-w-[150px]">{event.location_name || 'TBD'}</span>
                            </div>
                        )
                    },
                    {
                        header: 'Points',
                        accessorKey: 'points_value',
                        className: 'font-mono text-[#FF5722] font-bold'
                    },
                    {
                        header: 'Actions',
                        cell: (event) => (
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={() => handleEdit(event)}
                                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors group"
                                    title="Edit Event"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
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

            <EventForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={editingEvent}
                loading={submitting}
            />
        </div>
    );
}
