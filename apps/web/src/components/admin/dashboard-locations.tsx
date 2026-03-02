"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { createClient } from "@/lib/supabase";
import { MapPin, TrendingUp, MoreHorizontal, ArrowRight, RefreshCw, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

type PlaceRow = {
    id: string;
    name: string;
    address: string | null;
};

type EventRow = {
    location_name: string | null;
    event_datetime: string;
};

type LocationMetric = {
    id: string;
    name: string;
    address: string | null;
    eventsTotal: number;
    recentEvents: number;
    status: "High" | "Med" | "Low";
    activityPercent: number;
};

function classifyStatus(eventsTotal: number): "High" | "Med" | "Low" {
    if (eventsTotal >= 8) return "High";
    if (eventsTotal >= 3) return "Med";
    return "Low";
}

export default function DashboardLocations() {
    const supabase = createClient();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState<LocationMetric[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const loadLocations = async () => {
        try {
            setLoading(true);
            const now = new Date();
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(now.getDate() - 90);
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);

            const [placesRes, eventsRes] = await Promise.all([
                supabase
                    .from("partner_places")
                    .select("id, name, address")
                    .eq("is_active", true),
                supabase
                    .from("events")
                    .select("location_name, event_datetime")
                    .gte("event_datetime", ninetyDaysAgo.toISOString()),
            ]);

            if (placesRes.error) throw placesRes.error;
            if (eventsRes.error) throw eventsRes.error;

            const places = (placesRes.data || []) as PlaceRow[];
            const events = (eventsRes.data || []) as EventRow[];

            const counts = new Map<string, { total: number; recent: number }>();

            events.forEach((event) => {
                const name = (event.location_name || "").trim();
                if (!name) return;
                const key = name.toLowerCase();
                const existing = counts.get(key) || { total: 0, recent: 0 };
                existing.total += 1;
                if (new Date(event.event_datetime) >= sevenDaysAgo) {
                    existing.recent += 1;
                }
                counts.set(key, existing);
            });

            const byName = new Map<string, LocationMetric>();
            places.forEach((place) => {
                const key = place.name.trim().toLowerCase();
                const activity = counts.get(key) || { total: 0, recent: 0 };
                byName.set(key, {
                    id: place.id,
                    name: place.name,
                    address: place.address,
                    eventsTotal: activity.total,
                    recentEvents: activity.recent,
                    status: classifyStatus(activity.total),
                    activityPercent: 0,
                });
            });

            counts.forEach((activity, key) => {
                if (byName.has(key)) return;
                const prettyName = key
                    .split(" ")
                    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
                    .join(" ");

                byName.set(key, {
                    id: `event-${key}`,
                    name: prettyName,
                    address: null,
                    eventsTotal: activity.total,
                    recentEvents: activity.recent,
                    status: classifyStatus(activity.total),
                    activityPercent: 0,
                });
            });

            const ranked = Array.from(byName.values())
                .sort((a, b) => b.eventsTotal - a.eventsTotal || a.name.localeCompare(b.name))
                .slice(0, 5);

            const maxEvents = ranked.reduce((max, row) => Math.max(max, row.eventsTotal), 0);
            const normalized = ranked.map((row) => ({
                ...row,
                activityPercent: maxEvents > 0 ? Math.max(8, Math.round((row.eventsTotal / maxEvents) * 100)) : 8,
            }));

            setLocations(normalized);
        } catch (error) {
            console.error("Error loading location metrics:", error);
            toast.error("Failed to load location metrics");
            setLocations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadLocations();
    }, []);

    const handleRefresh = async () => {
        setIsMenuOpen(false);
        await loadLocations();
        toast.success("Locations data refreshed");
    };

    const handleExport = () => {
        setIsMenuOpen(false);
        const headers = ["Location", "Address", "Events (90d)", "Events (7d)", "Activity"];
        const rows = locations.map((loc) => [
            loc.name,
            loc.address || "",
            String(loc.eventsTotal),
            String(loc.recentEvents),
            loc.status,
        ]);
        const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `location_metrics_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Locations report downloaded");
    };

    return (
        <GlassCard className="h-full flex flex-col p-0 overflow-visible relative">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#FF5722]" />
                        Top Locations
                    </h3>
                    <p className="text-xs text-white/40 mt-1">Based on events in the last 90 days</p>
                </div>

                {/* Context Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors ${isMenuOpen ? 'bg-white/5 text-white' : ''}`}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 top-10 w-48 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl p-1 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                            <button
                                onClick={handleRefresh}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Refresh Data
                            </button>
                            <button
                                onClick={handleExport}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <FileText className="w-3 h-3" />
                                Export Report
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="h-full min-h-[180px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#FF5722] animate-spin" />
                    </div>
                ) : locations.length === 0 ? (
                    <div className="h-full min-h-[180px] flex items-center justify-center text-white/40 text-sm">
                        No location activity yet.
                    </div>
                ) : (
                    locations.map((loc, i) => (
                        <div key={loc.id} className="group p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#FF5722]/10 flex items-center justify-center font-bold text-[#FF5722] text-xs">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-[#FF5722] transition-colors">{loc.name}</h4>
                                        <p className="text-[10px] text-white/40">
                                            {loc.address || "No address"} • {loc.status} Activity
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-sm font-bold text-white">{loc.eventsTotal}</span>
                                    <span className="text-[10px] font-bold flex items-center justify-end gap-0.5 text-green-500">
                                        <TrendingUp className="w-2 h-2" />
                                        {loc.recentEvents} recent
                                    </span>
                                </div>
                            </div>

                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                <div
                                    className={`h-full rounded-full ${loc.status === 'High' ? 'bg-[#FF5722]' : 'bg-white/20'}`}
                                    style={{ width: `${loc.activityPercent}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                <Link href="/admin/dashboard/partners">
                    <button className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg">
                        View All Zones <ArrowRight className="w-3 h-3" />
                    </button>
                </Link>
            </div>
        </GlassCard>
    );
}
