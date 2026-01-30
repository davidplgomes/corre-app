import { createClient } from '@/lib/supabase';
import type { Partner, User } from '@/types';

export type PartnerWithUser = Partner & { users: User };

/**
 * Get all partners with user details
 */
export async function getAllPartners(): Promise<PartnerWithUser[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partners')
        .select('*, users(*)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PartnerWithUser[] || [];
}

/**
 * Get partner by ID
 */
export async function getPartnerById(partnerId: string): Promise<PartnerWithUser | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partners')
        .select('*, users(*)')
        .eq('id', partnerId)
        .single();

    if (error) throw error;
    return data as PartnerWithUser;
}

/**
 * Toggle partner active status
 */
export async function togglePartnerStatus(partnerId: string, isActive: boolean): Promise<Partner> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('partners')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', partnerId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Create partner profile (usually done when upgrading a user only if they provide business details, 
 * but simplest is just checking if role is partner and maybe auto-creating if missing, 
 * or manual creation). For now assuming creation happens elsewhere or we just list them.
 */
