'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getPlaceById, updatePlace } from '@/lib/services/places';
import { GlassCard } from '@/components/ui/glass-card';
import { ChevronLeft, Loader2, Upload, MapPin } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditPlacePage() {
    const router = useRouter();
    const params = useParams();
    const placeId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        image_url: '',
        latitude: '',
        longitude: '',
    });

    useEffect(() => {
        const load = async () => {
            try {
                const place = await getPlaceById(placeId);
                if (!place) {
                    toast.error('Place not found');
                    router.push('/partner/dashboard/places');
                    return;
                }
                setFormData({
                    name: place.name || '',
                    address: place.address || '',
                    description: place.description || '',
                    image_url: place.image_url || '',
                    latitude: place.latitude?.toString() ?? '',
                    longitude: place.longitude?.toString() ?? '',
                });
            } catch {
                toast.error('Failed to load place');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [placeId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updatePlace(placeId, {
                name: formData.name,
                address: formData.address,
                description: formData.description,
                image_url: formData.image_url || null,
                latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
                longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
            });
            toast.success('Place updated');
            router.push('/partner/dashboard/places');
        } catch {
            toast.error('Failed to update place');
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
            <Link href="/partner/dashboard/places" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Places
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Edit Place</h1>
                <p className="text-white/40">Update the details for this location</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Place Name</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Downtown Coffee Shop"
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                        />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                required
                                type="text"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full street address"
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
                                value={formData.latitude}
                                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                placeholder="e.g. 53.3498"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Longitude</label>
                            <input
                                type="number"
                                step="any"
                                value={formData.longitude}
                                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                placeholder="e.g. -6.2603"
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
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
                            placeholder="Tell runners about this place..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 resize-none"
                        />
                    </div>

                    {/* Image URL */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Cover Image URL</label>
                        <div className="relative">
                            <Upload className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="url"
                                value={formData.image_url}
                                onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                            />
                        </div>
                        <p className="text-[10px] text-white/40">Provide a direct link to an image (e.g. Unsplash, Imgur)</p>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-4">
                        <Link href="/partner/dashboard/places" className="flex-1">
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
