'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';

interface Prediction {
    place_id: string;
    description: string;
}

interface AddressAutocompleteProps {
    value: string;
    latitude: string;
    longitude: string;
    onSelect: (address: string, lat: string, lng: string, photoUrl?: string) => void;
    placeholder?: string;
    required?: boolean;
    label?: string;
}

export function AddressAutocomplete({
    value,
    latitude,
    longitude,
    onSelect,
    placeholder = 'Search for an address...',
    required = false,
    label = 'Location',
}: AddressAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selecting, setSelecting] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync external value changes (e.g. when editing a pre-existing record)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    const fetchPredictions = useCallback(async (input: string) => {
        if (input.length < 2) {
            setPredictions([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
            const data = await res.json();
            if (data.predictions) {
                setPredictions(data.predictions);
                setIsOpen(data.predictions.length > 0);
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        // Clear coordinates when user starts typing a new address
        if (latitude || longitude) {
            onSelect(val, '', '');
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            fetchPredictions(val);
        }, 300);
    };

    const handleSelect = async (prediction: Prediction) => {
        setSelecting(true);
        setIsOpen(false);
        setQuery(prediction.description);

        try {
            const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`);
            const data = await res.json();

            if (data.lat !== undefined && data.lng !== undefined) {
                onSelect(
                    prediction.description,
                    data.lat.toString(),
                    data.lng.toString(),
                    data.photo_url || undefined
                );
            }
        } catch (error) {
            console.error('Place details error:', error);
        } finally {
            setSelecting(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-3">
            {/* Autocomplete input */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">{label}</label>
                <div className="relative" ref={containerRef}>
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                    <input
                        required={required}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onFocus={() => predictions.length > 0 && setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {(loading || selecting) ? (
                            <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4 text-white/40" />
                        )}
                    </div>

                    {/* Dropdown */}
                    {isOpen && predictions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl shadow-black/50 overflow-hidden">
                            {predictions.map((prediction) => (
                                <button
                                    key={prediction.place_id}
                                    type="button"
                                    onClick={() => handleSelect(prediction)}
                                    className="w-full px-4 py-3 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-3 border-b border-white/5 last:border-b-0"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-[#FF5722]/70 flex-shrink-0" />
                                    <span className="truncate">{prediction.description}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
