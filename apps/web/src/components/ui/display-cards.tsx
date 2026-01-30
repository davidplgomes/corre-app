"use client";

import { cn } from "@/lib/utils";
import { Sparkles, MapPin, Thermometer } from "lucide-react";

interface DisplayCardProps {
    className?: string;
    title?: string;
    location?: string;
    date?: string; // e.g. "14"
    month?: string; // e.g. "DEC"
    weekday?: string; // e.g. "MON"
    time?: string; // e.g "3:17 PM"
    points?: string; // e.g. "5PTS"
    temperature?: string; // e.g. "12°C"
    isNext?: boolean;
}

function DisplayCard({
    className,
    title = "Event Title",
    location = "Location",
    date = "14",
    month = "DEC",
    weekday = "MON",
    time = "19:00",
    points = "150 PTS",
    temperature = "12°C",
    isNext = false,
}: DisplayCardProps) {
    return (
        <div
            className={cn(
                "relative flex h-52 w-[85vw] md:w-[24rem] md:-skew-y-[8deg] select-none flex-col justify-between rounded-3xl border border-white/10 bg-[#0A0A0A] px-6 py-5 transition-all duration-700 hover:border-[#FF5722]/50 hover:shadow-[0_0_30px_-10px_rgba(255,87,34,0.3)]",
                className
            )}
        >
            {/* Header Badges */}
            <div className="flex justify-between items-center w-full mb-2">
                <div className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase", isNext ? "bg-[#222] text-white" : "bg-transparent text-gray-600 border border-white/5")}>
                    {isNext ? "NEXT" : "UPCOMING"}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222] text-xs font-bold text-white">
                    <Thermometer className="size-3 text-[#FF5722]" />
                    <span>{temperature}</span>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="flex items-center h-full gap-5">

                {/* Left: Date Stack */}
                <div className="flex flex-col items-center justify-center min-w-[3.5rem] text-center gap-0">
                    <span className="text-5xl font-black text-white leading-none tracking-tighter">{date}</span>
                    <span className="text-xs font-black text-[#FF5722] tracking-widest leading-none my-1">{month}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{weekday}</span>
                    <span className="text-xs font-bold text-white mt-1">{time}</span>
                </div>

                {/* Vertical Divider */}
                <div className="h-24 w-1 bg-[#FF5722] rounded-full" />

                {/* Right: Info Stack */}
                <div className="flex flex-col justify-center gap-1">
                    <div className="text-5xl font-black text-[#FF5722] italic tracking-tight leading-none">
                        {points}
                    </div>
                    <div className="text-lg font-bold text-white leading-tight line-clamp-2">
                        {title}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mt-1">
                        <MapPin className="size-3 text-[#FF5722]" />
                        <span className="truncate max-w-[140px] uppercase tracking-wide">{location}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

interface DisplayCardsProps {
    cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
    const defaultCards: DisplayCardProps[] = [
        {
            title: "Default Run",
            location: "Phoenix Park",
            date: "14",
            month: "DEC",
            weekday: "MON",
            points: "5PTS",
            isNext: true,
            className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0 bg-[#0A0A0A] border-[#FF5722]/30"
        },
        {
            className: "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
            title: "Another Event",
            location: "City Center",
            date: "20",
            month: "JAN",
            weekday: "FRI",
            points: "10PTS",
            temperature: "8°C",
            isNext: false,
        },
        {
            className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
            title: "Future Race",
            location: "Forest Trail",
            date: "05",
            month: "FEB",
            weekday: "SUN",
            points: "20PTS",
            temperature: "5°C",
            isNext: false,
        },
    ];
    const displayCards = cards || defaultCards;

    return (
        <div className="flex flex-col gap-6 items-center md:grid md:[grid-template-areas:'stack'] md:place-items-center opacity-100 animate-in fade-in-0 duration-700">
            {displayCards.map((cardProps, index) => (
                <DisplayCard key={index} {...cardProps} />
            ))}
        </div>
    );
}
