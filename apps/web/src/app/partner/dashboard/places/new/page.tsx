'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getPartnerProfileIdByUserId } from '@/lib/services/places';
import { GlassCard } from '@/components/ui/glass-card';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { ImageUpload } from '@/components/ui/image-upload';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewPlacePage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        image_url: '',
        latitude: '',
        longitude: ''
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

            const partnerProfileId = await getPartnerProfileIdByUserId(session.user.id);
            if (!partnerProfileId) {
                toast.error("Partner profile not found. Ask an admin to complete partner setup.");
                return;
            }

            const { error } = await supabase.from('partner_places').insert({
                partner_id: partnerProfileId,
                name: formData.name,
                address: formData.address,
                description: formData.description,
                image_url: formData.image_url || null,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                is_active: true
            });

            if (error) throw error;

            toast.success("Place created successfully");
            router.push('/partner/dashboard/places');
        } catch (error) {
            console.error('Error creating place:', error);
            toast.error("Failed to create place");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/partner/dashboard/places" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4" />
                Back to Places
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Add New Place</h1>
                <p className="text-white/40">Register a new location for your business</p>
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
                                    Creating...
                                </>
                            ) : (
                                'Create Place'
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
