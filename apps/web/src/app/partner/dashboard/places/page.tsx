'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getPartnerPlaces } from '@/lib/services/places';
import type { PartnerPlace } from '@/types';
import { GlassCard } from '@/components/ui/glass-card';
import { Plus, MapPin, Search, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PartnerPlacesPage() {
    const [places, setPlaces] = useState<PartnerPlace[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchPlaces = async () => {
            try {
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) return;

                const data = await getPartnerPlaces(session.user.id);
                setPlaces(data);
            } catch (error) {
                console.error('Error fetching places:', error);
                toast.error('Failed to load places');
            } finally {
                setLoading(false);
            }
        };

        fetchPlaces();
    }, []);

    const filteredPlaces = places.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">My Places</h1>
                    <p className="text-white/40">Manage your locations and visibility</p>
                </div>
                <Link href="/partner/dashboard/places/new">
                    <button className="h-10 px-4 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Place
                    </button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search places..."
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
            {filteredPlaces.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No places found</h3>
                    <p className="text-white/40 mb-6">Get started by adding your first location</p>
                    <Link href="/partner/dashboard/places/new">
                        <button className="h-10 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white transition-colors">
                            Add Place
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlaces.map((place) => (
                        <GlassCard key={place.id} className="group p-0 flex flex-col h-full hover:border-[#FF5722]/30 cursor-pointer transition-all">
                            {/* Image / Placeholder */}
                            <div className="h-48 w-full bg-white/5 relative overflow-hidden">
                                {place.image_url ? (
                                    <img
                                        src={place.image_url}
                                        alt={place.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/10">
                                        <MapPin className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4">
                                    <div className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${place.is_active ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/20' : 'bg-white/10 text-white/40 border border-white/10'
                                        }`}>
                                        {place.is_active ? 'Active' : 'Inactive'}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#FF5722] transition-colors">{place.name}</h3>
                                <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">{place.description || 'No description provided.'}</p>

                                <div className="flex items-center gap-2 text-xs text-white/40 mt-auto pt-4 border-t border-white/5">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{place.address || 'No address'}</span>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
