'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { ChevronLeft, Loader2, Calendar, MapPin, Trophy } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewEventPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_type: 'run',
        event_datetime: '',
        location_name: '',
        location_lat: '',
        location_lng: '',
        points_value: 50,
        check_in_radius: 100
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error("You must be logged in");
                return;
            }

            const { error } = await supabase.from('events').insert({
                creator_id: session.user.id,
                title: formData.title,
                description: formData.description,
                event_type: formData.event_type,
                event_datetime: new Date(formData.event_datetime).toISOString(),
                location_name: formData.location_name,
                location_lat: parseFloat(formData.location_lat),
                location_lng: parseFloat(formData.location_lng),
                points_value: Number(formData.points_value),
                check_in_radius_meters: Number(formData.check_in_radius)
            });

            if (error) throw error;

            toast.success("Event created successfully");
            router.push('/partner/dashboard/events');
        } catch (error) {
            console.error('Error creating event:', error);
            toast.error("Failed to create event");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/partner/dashboard/events" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Events
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Host Event</h1>
                <p className="text-white/40">Organize a community run or meetup</p>
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
                                onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                            >
                                <option value="run" className="bg-[#1c1c1e]">Run</option>
                                <option value="group_run" className="bg-[#1c1c1e]">Group Run</option>
                                <option value="coffee_run" className="bg-[#1c1c1e]">Coffee Run</option>
                                <option value="social" className="bg-[#1c1c1e]">Social</option>
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
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
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
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 [&::-webkit-calendar-picker-indicator]:invert"
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
                                required
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
                                required
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
                                    Creating...
                                </>
                            ) : (
                                'Create Event'
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
