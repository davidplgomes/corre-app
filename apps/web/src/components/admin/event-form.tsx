"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/ui/modal"
import type { Event, EventType } from "@/types"

interface EventFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: Partial<Event>) => Promise<void>
    initialData?: Event | null
    loading?: boolean
}

export function EventForm({ isOpen, onClose, onSubmit, initialData, loading }: EventFormProps) {
    const [formData, setFormData] = useState<Partial<Event>>(
        initialData || {
            title: '',
            description: '',
            event_type: 'run',
            points_value: 10,
            event_datetime: new Date().toISOString().slice(0, 16),
            location_name: '',
            location_lat: 53.3498, // Dublin default
            location_lng: -6.2603,
            check_in_radius_meters: 100
        }
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Edit Event" : "Create New Event"}
            description="Fill in the details for the event."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Title</label>
                    <Input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Weekly Run"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Date & Time</label>
                        <Input
                            type="datetime-local"
                            required
                            value={formData.event_datetime ? new Date(formData.event_datetime).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setFormData({ ...formData, event_datetime: new Date(e.target.value).toISOString() })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Type</label>
                        <select
                            className="flex h-10 w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5722]"
                            value={formData.event_type}
                            onChange={(e) => setFormData({ ...formData, event_type: e.target.value as EventType })}
                        >
                            <option value="run">Run</option>
                            <option value="group_run">Group Run</option>
                            <option value="coffee_run">Coffee Run</option>
                            <option value="social">Social</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Description</label>
                    <Textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Event details..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Location Name</label>
                    <Input
                        required
                        value={formData.location_name || ''}
                        onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                        placeholder="Grand Canal Dock"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Points</label>
                        <Input
                            type="number"
                            required
                            min={0}
                            value={formData.points_value}
                            onChange={(e) => setFormData({ ...formData, points_value: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Radius (m)</label>
                        <Input
                            type="number"
                            required
                            min={10}
                            value={formData.check_in_radius_meters}
                            onChange={(e) => setFormData({ ...formData, check_in_radius_meters: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        {initialData ? "Save Changes" : "Create Event"}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
