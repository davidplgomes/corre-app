import { supabase } from './client';
import { MarketplaceItem, ShopItem } from '../../types';

/**
 * Get Marketplace Items (Community)
 */
/**
 * Get Marketplace Items (Community)
 */
export const getMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                users:seller_id(id, full_name, membership_tier)
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map new schema to old type definition for compatibility
        return (data || []).map((item: any) => ({
            ...item,
            // Map price_cents to price (assume UI expects standard unit)
            price: item.price_cents / 100,
            // Map first image to image_url
            image_url: item.images && item.images.length > 0 ? item.images[0] : null,
            // Ensure users object is populated (aliased in query if possible, or mapped here)
            users: item.users
        }));
    } catch (error) {
        console.error('Error getting marketplace items:', error);
        throw error;
    }
};

/**
 * Get Shop Items (Official)
 */
export const getShopItems = async (): Promise<ShopItem[]> => {
    try {
        const { data, error } = await supabase
            .from('corre_shop_items')
            .select('*')
            .gt('stock', 0)
            .order('points_price', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        // Return empty if table doesn't exist yet (soft fail)
        console.warn('Shop items table might be missing, returning empty.');
        return [];
    }
};

/**
 * Create a new Marketplace Item
 */
export const createMarketplaceItem = async (
    item: Omit<MarketplaceItem, 'id' | 'created_at' | 'status' | 'users'>
): Promise<MarketplaceItem> => {
    // This function is kept for legacy calls, but mostly unused if we switch to CreateListing screen.
    // We map it to the new table just in case.
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .insert({
                seller_id: item.seller_id,
                title: item.title,
                description: item.description,
                price_cents: Math.round(item.price * 100),
                images: item.image_url ? [item.image_url] : [],
                category: item.category || 'other',
                condition: 'new', // Default fallback
                status: 'active'
            })
            .select()
            .single();

        if (error) throw error;
        return data; // Returns raw schema, might mismatch exact return type but usually fine for insert
    } catch (error) {
        console.error('Error creating marketplace item:', error);
        throw error;
    }
};

/**
 * Get Seller's Own Listings
 */
export const getSellerListings = async (sellerId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .select('*')
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting seller listings:', error);
        throw error;
    }
};

/**
 * Get Single Listing by ID
 */
export const getListingById = async (listingId: string): Promise<any | null> => {
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .select(`
                *,
                users:seller_id(id, full_name, membership_tier)
            `)
            .eq('id', listingId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting listing by ID:', error);
        throw error;
    }
};

/**
 * Update a Listing
 */
export const updateListing = async (
    listingId: string,
    updates: {
        title?: string;
        description?: string;
        price_cents?: number;
        category?: string;
        condition?: string;
        images?: string[];
    }
): Promise<any> => {
    try {
        const { data, error } = await supabase
            .from('marketplace_listings')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', listingId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating listing:', error);
        throw error;
    }
};

/**
 * Update Listing Status
 */
export const updateListingStatus = async (
    listingId: string,
    status: 'active' | 'sold' | 'reserved' | 'removed'
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('marketplace_listings')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', listingId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating listing status:', error);
        throw error;
    }
};

/**
 * Delete a Listing
 */
export const deleteListing = async (listingId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('marketplace_listings')
            .delete()
            .eq('id', listingId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting listing:', error);
        throw error;
    }
};
