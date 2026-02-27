'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getEventById, updateEvent } from '@/lib/services/events';
import type { EventType } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import { ChevronLeft, Loader2, Calendar, MapPin, Trophy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_type: 'routine' as EventType,
        event_datetime: '',
        location_name: '',
        location_lat: '',
        location_lng: '',
        points_value: 50,
        check_in_radius: 100,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const event = await getEventById(eventId);
                if (!event) {
                    toast.error('Event not found');
                    router.push('/partner/dashboard/events');
                    return;
                }
                const dt = new Date(event.event_datetime);
                const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                setFormData({
                    title: event.title,
                    description: event.description || '',
                    event_type: event.event_type || 'routine',
                    event_datetime: local,
                    location_name: event.location_name || '',
                    location_lat: event.location_lat?.toString() ?? '',
                    location_lng: event.location_lng?.toString() ?? '',
                    points_value: event.points_value ?? 50,
                    check_in_radius: event.check_in_radius_meters ?? 100,
                });
            } catch {
                toast.error('Failed to load event');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [eventId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateEvent(eventId, {
                title: formData.title,
                description: formData.description,
                event_type: formData.event_type,
                event_datetime: new Date(formData.event_datetime).toISOString(),
                location_name: formData.location_name,
                location_lat: formData.location_lat ? parseFloat(formData.location_lat) : undefined,
                location_lng: formData.location_lng ? parseFloat(formData.location_lng) : undefined,
                points_value: Number(formData.points_value),
            });
            toast.success('Event updated');
            router.push('/partner/dashboard/events');
        } catch {
            toast.error('Failed to update event');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/partner/dashboard/events" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Events
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Edit Event</h1>
                <p className="text-white/40">Update the details for this event</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Event Title</label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Sunday Morning 5K"
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                        />
                    </div>

                    {/* Type & Points */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Type</label>
                            <select
                                value={formData.event_type}
                                onChange={e => setFormData({ ...formData, event_type: e.target.value as EventType })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                            >
                                <option value="routine" className="bg-[#1c1c1e]">Training Run</option>
                                <option value="special" className="bg-[#1c1c1e]">Special Event</option>
                                <option value="race" className="bg-[#1c1c1e]">Race</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Points Value</label>
                            <div className="relative">
                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={formData.points_value}
                                    onChange={e => setFormData({ ...formData, points_value: Number(e.target.value) })}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Date/Time */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Date & Time</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                required
                                type="datetime-local"
                                value={formData.event_datetime}
                                onChange={e => setFormData({ ...formData, event_datetime: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Description</label>
                        <textarea
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Event details, route info, requirements..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 resize-none"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Location Name</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                required
                                type="text"
                                value={formData.location_name}
                                onChange={e => setFormData({ ...formData, location_name: e.target.value })}
                                placeholder="Meeting point name"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Latitude</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.location_lat}
                                onChange={e => setFormData({ ...formData, location_lat: e.target.value })}
                                placeholder="e.g. 53.3498"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.location_lng}
                                onChange={e => setFormData({ ...formData, location_lng: e.target.value })}
                                placeholder="e.g. -6.2603"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-4">
                        <Link href="/partner/dashboard/events" className="flex-1">
                            <button type="button" className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors">
                                Cancel
                            </button>
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 h-12 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
