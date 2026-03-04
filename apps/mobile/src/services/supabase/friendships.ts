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
        avatar_url?: string | null;
    };
    addressee?: {
        id: string;
        full_name: string;
        membership_tier: string;
        avatar_url?: string | null;
    };
}

export interface UserSearchResult {
    id: string;
    full_name: string;
    membership_tier: string;
    avatar_url?: string;
    friendship_status?: 'pending' | 'accepted' | 'none';
}

type FriendshipStatus = 'pending' | 'accepted' | 'none';

type FriendshipLookupRow = {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: 'pending' | 'accepted' | 'rejected';
};

const buildFriendshipStatusMap = (
    currentUserId: string,
    rows: Array<Pick<FriendshipLookupRow, 'requester_id' | 'addressee_id' | 'status'>>
): Map<string, FriendshipStatus> => {
    const statusMap = new Map<string, FriendshipStatus>();

    for (const row of rows) {
        const otherId = row.requester_id === currentUserId ? row.addressee_id : row.requester_id;
        if (!otherId) continue;
        if (row.status === 'rejected') continue;

        const current = statusMap.get(otherId);
        if (row.status === 'accepted') {
            statusMap.set(otherId, 'accepted');
            continue;
        }

        if (!current) {
            statusMap.set(otherId, 'pending');
        }
    }

    return statusMap;
};

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

    const { data: allFriendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const statusMap = buildFriendshipStatusMap(user.id, allFriendships || []);

    return (data || []).map((foundUser) => ({
        ...foundUser,
        friendship_status: statusMap.get(foundUser.id) || 'none',
    }));
};

/**
 * Get suggested friends (random users who are not friends for now)
 * Optimized: uses batch queries instead of N+1 individual status checks
 */
export const getSuggestedFriends = async (): Promise<UserSearchResult[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Single query: get all friendship records for this user (any status)
    const { data: allFriendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    // Build maps for exclusion and status lookup
    const acceptedIds = new Set<string>();
    const statusMap = buildFriendshipStatusMap(user.id, allFriendships || []);
    for (const [otherId, status] of statusMap.entries()) {
        if (status === 'accepted') {
            acceptedIds.add(otherId);
        }
    }

    // Exclude self and accepted friends
    const excludeIds = [user.id, ...Array.from(acceptedIds)];

    // Fetch suggested users
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, membership_tier, avatar_url')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .limit(5);

    if (error) {
        console.error('Error fetching suggestions:', error);
        return [];
    }

    // Map status from our pre-built lookup (no extra queries)
    return (data || []).map(u => ({
        ...u,
        friendship_status: statusMap.get(u.id) || 'none',
    }));
};

/**
 * Get friendship status with a user
 */
export const getFriendshipStatus = async (userId: string): Promise<FriendshipStatus> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'none';

    const { data, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`);

    if (error || !data || data.length === 0) return 'none';
    const statusMap = buildFriendshipStatusMap(user.id, data);
    return statusMap.get(userId) || 'none';
};

/**
 * Send a friend request.
 * If the addressee's profile is public ('anyone'), the friendship is auto-accepted.
 * Returns { success, autoAccepted } so the UI can react accordingly.
 */
export const sendFriendRequest = async (addresseeId: string): Promise<{ success: boolean; autoAccepted: boolean }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, autoAccepted: false };
    if (user.id === addresseeId) return { success: false, autoAccepted: false };

    // Check if the target user has a public profile
    const { data: targetUser } = await supabase
        .from('users')
        .select('privacy_visibility')
        .eq('id', addresseeId)
        .single();

    const isPublic = targetUser?.privacy_visibility === 'anyone';

    const { data: existingRows, error: existingError } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`);

    if (existingError) {
        console.error('Error loading existing friendship:', existingError);
        return { success: false, autoAccepted: false };
    }

    const existing = (existingRows || []) as FriendshipLookupRow[];
    if (existing.some((row) => row.status === 'accepted')) {
        return { success: true, autoAccepted: true };
    }

    const reversePending = existing.find(
        (row) =>
            row.requester_id === addresseeId &&
            row.addressee_id === user.id &&
            row.status === 'pending'
    );
    if (reversePending) {
        const { error: acceptError } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', reversePending.id);

        if (acceptError) {
            console.error('Error auto-accepting reverse pending friend request:', acceptError);
            return { success: false, autoAccepted: false };
        }

        return { success: true, autoAccepted: true };
    }

    const outgoing = existing.find(
        (row) => row.requester_id === user.id && row.addressee_id === addresseeId
    );
    if (outgoing) {
        if (outgoing.status === 'pending') {
            return { success: true, autoAccepted: false };
        }

        const nextStatus: 'pending' | 'accepted' = isPublic ? 'accepted' : 'pending';
        const { error: updateError } = await supabase
            .from('friendships')
            .update({ status: nextStatus })
            .eq('id', outgoing.id);

        if (updateError) {
            console.error('Error re-opening friend request:', updateError);
            return { success: false, autoAccepted: false };
        }

        return { success: true, autoAccepted: nextStatus === 'accepted' };
    }

    const { error } = await supabase
        .from('friendships')
        .insert({
            requester_id: user.id,
            addressee_id: addresseeId,
            status: isPublic ? 'accepted' : 'pending',
        });

    if (error) {
        // Another request may have been created concurrently.
        if ((error as { code?: string }).code === '23505') {
            const status = await getFriendshipStatus(addresseeId);
            return { success: true, autoAccepted: status === 'accepted' };
        }
        console.error('Error sending friend request:', error);
        return { success: false, autoAccepted: false };
    }

    return { success: true, autoAccepted: isPublic };
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
 * Cancel an outgoing friend request (only pending requests sent by the current user)
 */
export const cancelFriendRequest = async (addresseeId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', user.id)
        .eq('addressee_id', addresseeId)
        .eq('status', 'pending');

    if (error) {
        console.error('Error cancelling friend request:', error);
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
            requester:requester_id(id, full_name, membership_tier, avatar_url)
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
