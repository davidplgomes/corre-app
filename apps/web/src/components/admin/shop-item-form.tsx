"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import type { ShopItem } from "@/types"

interface ShopItemFormProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: Partial<ShopItem>) => Promise<void>
    initialData?: ShopItem | null
    loading?: boolean
}

export function ShopItemForm({ isOpen, onClose, onSubmit, initialData, loading }: ShopItemFormProps) {
    const [formData, setFormData] = useState<Partial<ShopItem>>({
        title: '',
        description: '',
        points_price: 100,
        stock: 10,
        image_url: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
        } else {
            setFormData({
                title: '',
                description: '',
                points_price: 100,
                stock: 10,
                image_url: ''
            })
        }
    }, [initialData, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Shop Item" : "Create Shop Item"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-white/60">Title</label>
                    <Input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Item name"
                        className="bg-black/50 border-white/10 focus:border-[#FF5722]"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-white/60">Description</label>
                    <Textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Item details..."
                        className="bg-black/50 border-white/10 focus:border-[#FF5722] min-h-[100px]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold uppercase text-white/60">Price (Points)</label>
                        <Input
                            type="number"
                            required
                            min="0"
                            value={formData.points_price}
                            onChange={(e) => setFormData({ ...formData, points_price: parseInt(e.target.value) })}
                            className="bg-black/50 border-white/10 focus:border-[#FF5722]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold uppercase text-white/60">Stock</label>
                        <Input
                            type="number"
                            required
                            min="0"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                            className="bg-black/50 border-white/10 focus:border-[#FF5722]"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase text-white/60">Image URL</label>
                    <Input
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://..."
                        className="bg-black/50 border-white/10 focus:border-[#FF5722]"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {initialData ? 'Save Changes' : 'Create Item'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
