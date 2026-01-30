"use client"

import { useEffect, useState } from "react"
import DisplayCards from "@/components/ui/display-cards"
import { getUpcomingEvents } from "@/lib/services/events"
import type { Event } from "@/types"

export function UpcomingEventsDeck() {
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchEvents() {
            try {
                const data = await getUpcomingEvents()
                setEvents(data.slice(0, 4)) // Take first 4 events
            } catch (error) {
                console.error("Failed to fetch events:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [])

    if (loading) {
        return <div className="h-[400px] w-full animate-pulse bg-white/5 rounded-xl" />
    }

    if (events.length === 0) {
        return (
            <div className="p-8 border border-white/10 rounded-xl bg-[#0A0A0A] text-center">
                <p className="text-white/60">No upcoming events scheduled.</p>
            </div>
        )
    }

    const cards = events.map((event, index) => {
        const date = new Date(event.event_datetime)
        const isFirst = index === 0

        // Dynamic positioning classes based on index
        let positionClass = ""
        if (index === 0) {
            positionClass = "md:[grid-area:stack] hover:-translate-y-10 md:before:absolute md:before:w-[100%] md:before:outline-1 md:before:rounded-xl md:before:outline-border md:before:h-[100%] md:before:content-[''] md:before:bg-blend-overlay md:before:bg-background/50 md:grayscale-[100%] hover:before:opacity-0 md:before:transition-opacity md:before:duration:700 hover:grayscale-0 md:before:left-0 md:before:top-0 bg-[#0A0A0A] border-white/10 md:border-[#FF5722]/30 w-full"
        } else if (index === 1) {
            positionClass = "md:[grid-area:stack] md:translate-x-12 md:translate-y-8 hover:-translate-y-1 md:before:absolute md:before:w-[100%] md:before:outline-1 md:before:rounded-xl md:before:outline-border md:before:h-[100%] md:before:content-[''] md:before:bg-blend-overlay md:before:bg-background/50 md:grayscale-[100%] hover:before:opacity-0 md:before:transition-opacity md:before:duration:700 hover:grayscale-0 md:before:left-0 md:before:top-0 bg-[#0A0A0A] md:bg-[#121212] border-white/10 w-full"
        } else if (index === 2) {
            positionClass = "md:[grid-area:stack] md:translate-x-24 md:translate-y-16 hover:-translate-y-1 md:before:absolute md:before:w-[100%] md:before:outline-1 md:before:rounded-xl md:before:outline-border md:before:h-[100%] md:before:content-[''] md:before:bg-blend-overlay md:before:bg-background/50 md:grayscale-[100%] hover:before:opacity-0 md:before:transition-opacity md:before:duration:700 hover:grayscale-0 md:before:left-0 md:before:top-0 bg-[#0A0A0A] md:bg-[#121212] border-white/10 w-full"
        } else {
            positionClass = "md:[grid-area:stack] md:translate-x-36 md:translate-y-24 hover:-translate-y-1 md:before:absolute md:before:w-[100%] md:before:outline-1 md:before:rounded-xl md:before:outline-border md:before:h-[100%] md:before:content-[''] md:before:bg-blend-overlay md:before:bg-background/50 md:grayscale-[100%] hover:before:opacity-0 md:before:transition-opacity md:before:duration:700 hover:grayscale-0 md:before:left-0 md:before:top-0 bg-[#0A0A0A] border-white/10 md:border-[#FF5722]/30 w-full"
        }

        return {
            title: event.title,
            location: event.location_name || 'TBD',
            date: date.getDate().toString(),
            month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
            weekday: date.toLocaleString('default', { weekday: 'short' }).toUpperCase(),
            time: date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: false }),
            points: `${event.points_value}PTS`,
            temperature: "12°C", // Placeholder weather
            isNext: isFirst,
            className: positionClass
        }
    })

    return <DisplayCards cards={cards} />
}
