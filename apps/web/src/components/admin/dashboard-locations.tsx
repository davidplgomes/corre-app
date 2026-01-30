"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";
import { MapPin, TrendingUp, MoreHorizontal, ArrowRight, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";

const LOCATIONS = [
    {
        name: "Phoenix Park",
        runners: 482,
        capacity: 85,
        status: "High",
        trend: "+12%",
        users: 124
    },
    {
        name: "Sandymount Strand",
        runners: 320,
        capacity: 65,
        status: "Med",
        trend: "+5%",
        users: 85
    },
    {
        name: "St. Stephen's Green",
        runners: 185,
        capacity: 45,
        status: "Med",
        trend: "-2%",
        users: 45
    },
    {
        name: "Tymon Park",
        runners: 45,
        capacity: 15,
        status: "Low",
        trend: "+8%",
        users: 12
    },
    {
        name: "Dun Laoghaire Pier",
        runners: 28,
        capacity: 10,
        status: "Low",
        trend: "+1%",
        users: 8
    }
];

export default function DashboardLocations() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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

    const handleRefresh = () => {
        setIsMenuOpen(false);
        toast.info("Locations data refreshed");
    };

    const handleExport = () => {
        setIsMenuOpen(false);
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
                    <p className="text-xs text-white/40 mt-1">Real-time runner density</p>
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
                {LOCATIONS.map((loc, i) => (
                    <div key={i} className="group p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/5">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#FF5722]/10 flex items-center justify-center font-bold text-[#FF5722] text-xs">
                                    {i + 1}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white group-hover:text-[#FF5722] transition-colors">{loc.name}</h4>
                                    <p className="text-[10px] text-white/40">Zone {String.fromCharCode(65 + i)} • {loc.status} Activity</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-bold text-white">{loc.runners}</span>
                                <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${loc.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                    {loc.trend.startsWith('+') ? <TrendingUp className="w-2 h-2" /> : null}
                                    {loc.trend}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                            <div
                                className={`h-full rounded-full ${loc.status === 'High' ? 'bg-[#FF5722]' : 'bg-white/20'}`}
                                style={{ width: `${loc.capacity}%` }}
                            />
                        </div>
                    </div>
                ))}
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
