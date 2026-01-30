import { createClient } from '@/lib/supabase';
import type { MarketplaceItem, User } from '@/types';

export type MarketplaceItemWithUser = MarketplaceItem & { users: User };

/**
 * Get all marketplace listings with user details
 */
export async function getAllListings(): Promise<MarketplaceItemWithUser[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('marketplace_items')
        .select('*, users(*)')
        .order('created_at', { ascending: false });

    if (error) {
        // Fallback for demo if table doesn't exist yet or is empty
        console.warn('Error fetching marketplace items:', error);
        return [];
    }
    return data as MarketplaceItemWithUser[] || [];
}

/**
 * Delete a listing (Moderation)
 */
export async function deleteListing(listingId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', listingId);

    if (error) throw error;
}

/**
 * Update listing status (e.g. mark as sold or active)
 */
export async function updateListingStatus(listingId: string, status: 'active' | 'sold'): Promise<MarketplaceItem> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('marketplace_items')
        .update({ status })
        .eq('id', listingId)
        .select()
        .single();

    if (error) throw error;
    return data as MarketplaceItem;
}
