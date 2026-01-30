import { createClient } from '@/lib/supabase';
import type { User, UserRole } from '@/types';

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update user profile details (admin only)
 */
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete user (admin only)
 * Note: This deletes from the public.users table. 
 * For full deletion including auth, edge functions are usually required, 
 * but this handles the application data layer.
 */
export async function deleteUser(userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) throw error;
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string): Promise<User[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50);

    if (error) throw error;
    return data || [];
}

/**
 * Get user stats for admin dashboard
 */
export async function getUserStats() {
    const supabase = createClient();

    const [totalUsers, partners, admins] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'partner'),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    ]);

    return {
        totalUsers: totalUsers.count || 0,
        totalPartners: partners.count || 0,
        totalAdmins: admins.count || 0,
    };
}
