'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Plus,
    Edit2,
    Trash2,
    ShoppingBag,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    X,
    Package,
    Filter
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllShopItems, deleteShopItem, createShopItem, updateShopItem } from '@/lib/services/shop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { ShopItem } from '@/types';

// ============================================================================
// ZOD SCHEMA FOR VALIDATION
// ============================================================================
const shopItemSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title too long'),
    description: z.string().max(500, 'Description too long').nullable().optional(),
    points_price: z.number().min(1, 'Price must be at least 1 point').max(1000000, 'Price too high'),
    stock: z.number().min(0, 'Stock cannot be negative').max(99999, 'Stock too high'),
    image_url: z.string().url('Must be a valid URL').nullable().optional().or(z.literal('')),
    is_active: z.boolean()
});

type ShopItemFormData = z.infer<typeof shopItemSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================
const ITEMS_PER_PAGE = 10;

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ShopPage() {
    const router = useRouter();

    // Data State
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Filter & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);

    // ========================================================================
    // REACT HOOK FORM SETUP
    // ========================================================================
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch
    } = useForm<ShopItemFormData>({
        resolver: zodResolver(shopItemSchema) as any,
        defaultValues: {
            title: '',
            description: '',
            points_price: 100,
            stock: 10,
            image_url: '',
            is_active: true
        }
    });

    // ========================================================================
    // DATA FETCHING & AUTH
    // ========================================================================
    useEffect(() => {
        checkAuth();
        fetchItems();
    }, []);

    const checkAuth = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.push('/login');
            return;
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (userData?.role !== 'admin') {
            router.push('/');
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await getAllShopItems();
            setItems(data);
        } catch (error) {
            console.error('Error fetching shop items:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    // ========================================================================
    // FILTERED & PAGINATED DATA
    // ========================================================================
    const filteredItems = useMemo(() => {
        let result = [...items];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.title.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query))
            );
        }

        // Apply status filter (using stock as proxy for active/inactive if no is_active field)
        if (statusFilter === 'active') {
            result = result.filter(item => (item as any).is_active !== false && item.stock > 0);
        } else if (statusFilter === 'inactive') {
            result = result.filter(item => (item as any).is_active === false || item.stock === 0);
        }

        return result;
    }, [items, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredItems.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredItems, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================
    const handleCreate = () => {
        setEditingItem(null);
        reset({
            title: '',
            description: '',
            points_price: 100,
            stock: 10,
            image_url: '',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item: ShopItem) => {
        setEditingItem(item);
        reset({
            title: item.title,
            description: item.description || '',
            points_price: item.points_price,
            stock: item.stock,
            image_url: item.image_url || '',
            is_active: (item as any).is_active !== false
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (item: ShopItem) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${item.title}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        setDeletingId(item.id);
        try {
            await deleteShopItem(item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
            toast.success(`"${item.title}" deleted successfully`);
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Failed to delete product');
        } finally {
            setDeletingId(null);
        }
    };

    const onSubmit = async (data: ShopItemFormData) => {
        setSubmitting(true);

        try {
            // Clean up empty strings to null
            const cleanedData = {
                ...data,
                description: data.description || null,
                image_url: data.image_url || null
            };

            if (editingItem) {
                const updated = await updateShopItem(editingItem.id, cleanedData);
                setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
                toast.success(`"${data.title}" updated successfully`);
            } else {
                const created = await createShopItem(cleanedData as any);
                setItems(prev => [created, ...prev]);
                toast.success(`"${data.title}" created successfully`);
            }

            setIsModalOpen(false);
            reset();
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error(editingItem ? 'Failed to update product' : 'Failed to create product');
        } finally {
            setSubmitting(false);
        }
    };

    const closeModal = () => {
        if (!submitting) {
            setIsModalOpen(false);
            setEditingItem(null);
            reset();
        }
    };

    // ========================================================================
    // STATS
    // ========================================================================
    const stats = useMemo(() => ({
        total: items.length,
        active: items.filter(i => (i as any).is_active !== false && i.stock > 0).length,
        outOfStock: items.filter(i => i.stock === 0).length,
        totalValue: items.reduce((acc, i) => acc + (i.points_price * i.stock), 0)
    }), [items]);

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-white/40" />
                        <div>
                            <p className="text-xs text-white/40 uppercase font-bold">Total Products</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-green-500" />
                        <div>
                            <p className="text-xs text-white/40 uppercase font-bold">Active</p>
                            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-red-500" />
                        <div>
                            <p className="text-xs text-white/40 uppercase font-bold">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-500">{stats.outOfStock}</p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[#FF5722] text-xl">★</span>
                        <div>
                            <p className="text-xs text-white/40 uppercase font-bold">Inventory Value</p>
                            <p className="text-2xl font-bold text-[#FF5722]">{stats.totalValue.toLocaleString()} pts</p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Shop Products</h2>
                    <p className="text-white/40 text-sm">Manage your product inventory and rewards.</p>
                </div>
                <Button onClick={handleCreate} className="gap-2 w-full md:w-auto">
                    <Plus className="w-4 h-4" />
                    Add Product
                </Button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                        type="text"
                        placeholder="Search products by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-[#0A0A0A]/50 border-white/5 focus:border-[#FF5722]/50"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Status Filter */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('all')}
                        className="gap-2 flex-1 md:flex-none"
                    >
                        <Filter className="w-4 h-4" />
                        All
                    </Button>
                    <Button
                        variant={statusFilter === 'active' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('active')}
                        className="flex-1 md:flex-none"
                    >
                        Active
                    </Button>
                    <Button
                        variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('inactive')}
                        className="flex-1 md:flex-none"
                    >
                        Inactive
                    </Button>
                </div>
            </div>

            {/* Results Info */}
            <div className="text-sm text-white/40">
                Showing {paginatedItems.length} of {filteredItems.length} products
                {searchQuery && <span> matching "{searchQuery}"</span>}
            </div>

            {/* Products Table/Cards */}
            {loading ? (
                <GlassCard className="p-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#FF5722]" />
                </GlassCard>
            ) : paginatedItems.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <ShoppingBag className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/40 mb-4">
                        {searchQuery || statusFilter !== 'all'
                            ? 'No products match your filters'
                            : 'No products yet'}
                    </p>
                    {!searchQuery && statusFilter === 'all' && (
                        <Button onClick={handleCreate}>Add Your First Product</Button>
                    )}
                </GlassCard>
            ) : (
                <GlassCard className="overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="text-left p-4 text-xs font-bold uppercase text-white/40">Product</th>
                                    <th className="text-left p-4 text-xs font-bold uppercase text-white/40">Status</th>
                                    <th className="text-left p-4 text-xs font-bold uppercase text-white/40">Stock</th>
                                    <th className="text-left p-4 text-xs font-bold uppercase text-white/40">Price (Points)</th>
                                    <th className="text-right p-4 text-xs font-bold uppercase text-white/40">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map((item) => (
                                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ShoppingBag className="w-5 h-5 text-white/40" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-white text-sm truncate">{item.title}</p>
                                                    <p className="text-xs text-white/40 truncate max-w-[200px]">
                                                        {item.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={item.stock > 0 ? 'default' : 'destructive'}>
                                                {item.stock > 0 ? 'Active' : 'Out of Stock'}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-mono text-sm ${item.stock > 0 ? 'text-white' : 'text-red-500'}`}>
                                                {item.stock} units
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-[#FF5722] font-bold">
                                                {item.points_price.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    disabled={deletingId === item.id}
                                                    className="p-2 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-white/10">
                        {paginatedItems.map((item) => (
                            <div key={item.id} className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <ShoppingBag className="w-6 h-6 text-white/40" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-white">{item.title}</p>
                                                <p className="text-xs text-white/40 mt-1">{item.description || 'No description'}</p>
                                            </div>
                                            <Badge variant={item.stock > 0 ? 'default' : 'destructive'} className="flex-shrink-0">
                                                {item.stock > 0 ? 'Active' : 'Out'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex gap-4">
                                                <span className="text-xs text-white/40">Stock: <strong className="text-white">{item.stock}</strong></span>
                                                <span className="text-xs text-white/40">Price: <strong className="text-[#FF5722]">{item.points_price}</strong></span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-white/40 hover:text-white"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    disabled={deletingId === item.id}
                                                    className="p-2 text-white/40 hover:text-red-500"
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-white/40">
                        Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={closeModal}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 p-6 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {editingItem ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-white/40 hover:text-white p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-xs font-mono font-bold uppercase text-white/60">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    {...register('title')}
                                    placeholder="Product name"
                                    className={`bg-black/50 border-white/10 focus:border-[#FF5722] ${errors.title ? 'border-red-500' : ''}`}
                                />
                                {errors.title && (
                                    <p className="text-red-500 text-xs">{errors.title.message}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-xs font-mono font-bold uppercase text-white/60">
                                    Description
                                </label>
                                <textarea
                                    {...register('description')}
                                    placeholder="Product details..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF5722] resize-none"
                                />
                                {errors.description && (
                                    <p className="text-red-500 text-xs">{errors.description.message}</p>
                                )}
                            </div>

                            {/* Price & Stock Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold uppercase text-white/60">
                                        Price (Points) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        {...register('points_price', { valueAsNumber: true })}
                                        min="1"
                                        className={`bg-black/50 border-white/10 focus:border-[#FF5722] ${errors.points_price ? 'border-red-500' : ''}`}
                                    />
                                    {errors.points_price && (
                                        <p className="text-red-500 text-xs">{errors.points_price.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold uppercase text-white/60">
                                        Stock <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        {...register('stock', { valueAsNumber: true })}
                                        min="0"
                                        className={`bg-black/50 border-white/10 focus:border-[#FF5722] ${errors.stock ? 'border-red-500' : ''}`}
                                    />
                                    {errors.stock && (
                                        <p className="text-red-500 text-xs">{errors.stock.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Image URL */}
                            <div className="space-y-2">
                                <label className="text-xs font-mono font-bold uppercase text-white/60">
                                    Image URL
                                </label>
                                <Input
                                    {...register('image_url')}
                                    placeholder="https://example.com/image.jpg"
                                    className={`bg-black/50 border-white/10 focus:border-[#FF5722] ${errors.image_url ? 'border-red-500' : ''}`}
                                />
                                {errors.image_url && (
                                    <p className="text-red-500 text-xs">{errors.image_url.message}</p>
                                )}
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                <div>
                                    <p className="text-sm font-bold text-white">Active Status</p>
                                    <p className="text-xs text-white/40">Product is visible to customers</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('is_active')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF5722]"></div>
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-white/10">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={closeModal}
                                    disabled={submitting}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingItem ? 'Save Changes' : 'Create Product'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
