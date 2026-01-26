import { supabase } from './client';

export interface Friendship {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    updated_at: string;
    // Joined user data
    requester?: {
        id: string;
        full_name: string;
        membership_tier: string;
    };
    addressee?: {
        id: string;
        full_name: string;
        membership_tier: string;
    };
}

export interface UserSearchResult {
    id: string;
    full_name: string;
    membership_tier: string;
    avatar_url?: string;
    friendship_status?: 'pending' | 'accepted' | 'none';
}

/**
 * Search users by name
 */
export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
    if (!query || query.length < 2) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, membership_tier, avatar_url')
        .ilike('full_name', `%${query}%`)
        .neq('id', user.id)
        .limit(20);

    if (error) {
        console.error('Error searching users:', error);
        return [];
    }

    // Check friendship status for each result
    const results: UserSearchResult[] = [];
    for (const foundUser of data || []) {
        const status = await getFriendshipStatus(foundUser.id);
        results.push({
            ...foundUser,
            friendship_status: status,
        });
    }

    return results;
};

/**
 * Get suggested friends (random users who are not friends for now)
 */
export const getSuggestedFriends = async (): Promise<UserSearchResult[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get current friends IDs
    const friends = await getFriends();
    const friendIds = friends.map(f => f.id);
    const excludeIds = [user.id, ...friendIds];

    // Fetch users NOT in exclude list
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, membership_tier, avatar_url')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(5);

    if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }

    return data.map(u => ({ ...u, friendship_status: 'none' }));
};

/**
 * Get friendship status with a user
 */
export const getFriendshipStatus = async (userId: string): Promise<'pending' | 'accepted' | 'none'> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'none';

    const { data, error } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
        .single();

    if (error || !data) return 'none';
    return data.status === 'accepted' ? 'accepted' : 'pending';
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (addresseeId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('friendships')
        .insert({
            requester_id: user.id,
            addressee_id: addresseeId,
            status: 'pending',
        });

    if (error) {
        console.error('Error sending friend request:', error);
        return false;
    }

    return true;
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (friendshipId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

    if (error) {
        console.error('Error accepting friend request:', error);
        return false;
    }

    return true;
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (friendshipId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

    if (error) {
        console.error('Error rejecting friend request:', error);
        return false;
    }

    return true;
};

/**
 * Get pending friend requests (incoming)
 */
export const getPendingRequests = async (): Promise<Friendship[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('friendships')
        .select(`
            *,
            requester:requester_id(id, full_name, membership_tier)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading pending requests:', error);
        return [];
    }

    return data || [];
};

/**
 * Get list of friends (accepted friendships)
 */
export const getFriends = async (): Promise<UserSearchResult[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get friendships where user is requester
    const { data: asRequester } = await supabase
        .from('friendships')
        .select(`
            addressee:addressee_id(id, full_name, membership_tier, avatar_url)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'accepted');

    // Get friendships where user is addressee
    const { data: asAddressee } = await supabase
        .from('friendships')
        .select(`
            requester:requester_id(id, full_name, membership_tier, avatar_url)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'accepted');

    const friends: UserSearchResult[] = [];

    (asRequester || []).forEach((f: any) => {
        if (f.addressee) {
            friends.push({
                ...f.addressee,
                friendship_status: 'accepted',
            });
        }
    });

    (asAddressee || []).forEach((f: any) => {
        if (f.requester) {
            friends.push({
                ...f.requester,
                friendship_status: 'accepted',
            });
        }
    });

    return friends;
};

/**
 * Remove a friend
 */
export const removeFriend = async (friendId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`);

    if (error) {
        console.error('Error removing friend:', error);
        return false;
    }

    return true;
};
