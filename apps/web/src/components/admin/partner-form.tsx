"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Modal } from "@/components/ui/modal"
import type { Partner } from "@/types"

interface PartnerFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: Partial<Partner>) => Promise<void>
    initialData: Partner
    loading?: boolean
}

export function PartnerForm({ isOpen, onClose, onSubmit, initialData, loading }: PartnerFormProps) {
    const [formData, setFormData] = useState<Partial<Partner>>({
        business_name: initialData.business_name || '',
        business_description: initialData.business_description || '',
        business_logo_url: initialData.business_logo_url || '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Partner Details"
            description="Update business information."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Business Name</label>
                    <Input
                        required
                        value={formData.business_name || ''}
                        onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                        placeholder="Business Name"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Logo URL</label>
                    <Input
                        value={formData.business_logo_url || ''}
                        onChange={(e) => setFormData({ ...formData, business_logo_url: e.target.value })}
                        placeholder="https://..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Description</label>
                    <Textarea
                        value={formData.business_description || ''}
                        onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                        placeholder="About the partner..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
