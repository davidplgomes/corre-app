import { createClient } from '@/lib/supabase';
import type { PartnerPlace } from '@/types';

/**
 * Get partner's places
 */
export async function getPartnerPlaces(partnerId: string): Promise<PartnerPlace[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_places')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get all places (admin)
 */
export async function getAllPlaces(): Promise<PartnerPlace[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_places')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get place by ID
 */
export async function getPlaceById(placeId: string): Promise<PartnerPlace | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_places')
        .select('*')
        .eq('id', placeId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create place
 */
export async function createPlace(place: Omit<PartnerPlace, 'id' | 'created_at' | 'updated_at'>): Promise<PartnerPlace> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_places')
        .insert(place)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update place
 */
export async function updatePlace(placeId: string, updates: Partial<PartnerPlace>): Promise<PartnerPlace> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partner_places')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', placeId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete place
 */
export async function deletePlace(placeId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('partner_places')
        .delete()
        .eq('id', placeId);

    if (error) throw error;
}

/**
 * Toggle place active status
 */
export async function togglePlaceActive(placeId: string, isActive: boolean): Promise<PartnerPlace> {
    return updatePlace(placeId, { is_active: isActive });
}
