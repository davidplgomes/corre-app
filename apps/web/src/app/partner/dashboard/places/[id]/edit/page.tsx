'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getPlaceById, updatePlace } from '@/lib/services/places';
import { getPartnerScopeIdsByUserId } from '@/lib/services/partners';
import { GlassCard } from '@/components/ui/glass-card';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { ImageUpload } from '@/components/ui/image-upload';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditPlacePage() {
    const router = useRouter();
    const params = useParams();
    const placeId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(true);
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
                const supabase = createClient();
                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;
                if (!session) {
                    toast.error('You must be logged in');
                    router.push('/login');
                    return;
                }

                const partnerScopeIds = await getPartnerScopeIdsByUserId(session.user.id);
                const place = await getPlaceById(placeId);
                if (!place) {
                    toast.error('Place not found');
                    router.push('/partner/dashboard/places');
                    return;
                }

                if (!partnerScopeIds.includes(place.partner_id)) {
                    setAuthorized(false);
                    toast.error('This place does not belong to your account');
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

    if (!authorized) {
        return (
            <GlassCard className="p-8 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Access denied</h2>
                <p className="text-white/50 mb-6">This place does not belong to your partner account.</p>
                <Link
                    href="/partner/dashboard/places"
                    className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#FF5722] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to places
                </Link>
            </GlassCard>
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

                    {/* Address with Autocomplete */}
                    <AddressAutocomplete
                        value={formData.address}
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        onSelect={(address, lat, lng, photoUrl) => setFormData({
                            ...formData,
                            address: address,
                            latitude: lat,
                            longitude: lng,
                            image_url: photoUrl || formData.image_url
                        })}
                        placeholder="Search for the place address..."
                        required
                        label="Address"
                    />

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

                    {/* Cover Image Upload */}
                    <ImageUpload
                        value={formData.image_url}
                        onChange={(url) => setFormData({ ...formData, image_url: url })}
                    />

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
