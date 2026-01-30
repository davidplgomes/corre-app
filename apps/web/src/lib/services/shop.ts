import { createClient } from '@/lib/supabase';
import type { ShopItem } from '@/types';

/**
 * Get all shop items
 */
export async function getAllShopItems(): Promise<ShopItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Error fetching shop items:', error);
        return [];
    }
    return data as ShopItem[] || [];
}

/**
 * Create a new shop item
 */
export async function createShopItem(item: Omit<ShopItem, 'id' | 'created_at'>): Promise<ShopItem> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('shop_items')
        .insert(item)
        .select()
        .single();

    if (error) throw error;
    return data as ShopItem;
}

/**
 * Update a shop item
 */
export async function updateShopItem(id: string, updates: Partial<ShopItem>): Promise<ShopItem> {
    const supabase = createClient();

    // Remove id and created_at from updates if present to avoid errors
    const { id: _, created_at: __, ...cleanedUpdates } = updates as any;

    const { data, error } = await supabase
        .from('shop_items')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as ShopItem;
}

/**
 * Delete a shop item
 */
export async function deleteShopItem(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
