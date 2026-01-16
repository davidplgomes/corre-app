import { supabase } from './client';
import { MarketplaceItem, ShopItem } from '../../types';

/**
 * Get Marketplace Items (Community)
 */
export const getMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
    try {
        const { data, error } = await supabase
            .from('marketplace_items')
            .select('*, users(id, full_name, membership_tier)')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
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
        console.error('Error getting shop items:', error);
        throw error;
    }
};

/**
 * Create a new Marketplace Item
 */
export const createMarketplaceItem = async (
    item: Omit<MarketplaceItem, 'id' | 'created_at' | 'status' | 'users'>
): Promise<MarketplaceItem> => {
    try {
        const { data, error } = await supabase
            .from('marketplace_items')
            .insert(item)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating marketplace item:', error);
        throw error;
    }
};
