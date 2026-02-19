// Wallet service for points (TTL-based) and XP management
import { supabase } from './client';
import {
    PointTransaction,
    WalletBalance,
    XPProgress,
    CartItem,
    Order,
    GuestPass,
    Notification
} from '../../types';

// XP thresholds for levels
const XP_THRESHOLDS = {
    starter: 0,
    pacer: 10000,
    elite: 15000,
};

const RENEWAL_DISCOUNTS = {
    starter: 0,
    pacer: 5,
    elite: 10,
};

/**
 * Get wallet balance with TTL breakdown
 */
export async function getWalletBalance(userId: string): Promise<WalletBalance> {
    const now = new Date().toISOString();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all active point transactions
    const { data: transactions, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .gt('points_remaining', 0)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true });

    if (error) {
        console.error('Error fetching wallet balance:', error);
        throw error;
    }

    const txs = (transactions || []) as PointTransaction[];

    // Calculate totals
    const total_available = txs.reduce((sum, tx) => sum + tx.points_remaining, 0);

    // Points expiring in next 7 days
    const expiring_soon = txs
        .filter(tx => tx.expires_at <= sevenDaysFromNow)
        .reduce((sum, tx) => sum + tx.points_remaining, 0);

    // Breakdown by source
    const breakdown = {
        routine: txs.filter(tx => tx.source_type === 'routine').reduce((sum, tx) => sum + tx.points_remaining, 0),
        special: txs.filter(tx => tx.source_type === 'special').reduce((sum, tx) => sum + tx.points_remaining, 0),
        race: txs.filter(tx => tx.source_type === 'race').reduce((sum, tx) => sum + tx.points_remaining, 0),
        purchase_refund: txs.filter(tx => tx.source_type === 'purchase_refund').reduce((sum, tx) => sum + tx.points_remaining, 0),
    };

    return {
        total_available,
        expiring_soon,
        breakdown,
        transactions: txs,
    };
}

/**
 * Get points transaction history (including consumed)
 */
export async function getPointsHistory(userId: string, limit = 50): Promise<PointTransaction[]> {
    const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching points history:', error);
        throw error;
    }

    return (data || []) as PointTransaction[];
}

/**
 * Get XP progress and level info
 */
export async function getXPProgress(userId: string): Promise<XPProgress> {
    const { data: user, error } = await supabase
        .from('users')
        .select('current_xp, xp_level')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching XP progress:', error);
        throw error;
    }

    const current_xp = user?.current_xp || 0;
    const level = (user?.xp_level || 'starter') as 'starter' | 'pacer' | 'elite';

    // Calculate next level info
    let next_level: 'pacer' | 'elite' | null = null;
    let xp_to_next_level = 0;

    if (level === 'starter') {
        next_level = 'pacer';
        xp_to_next_level = XP_THRESHOLDS.pacer - current_xp;
    } else if (level === 'pacer') {
        next_level = 'elite';
        xp_to_next_level = XP_THRESHOLDS.elite - current_xp;
    }

    return {
        current_xp,
        level,
        next_level,
        xp_to_next_level: Math.max(0, xp_to_next_level),
        renewal_discount: RENEWAL_DISCOUNTS[level],
    };
}

/**
 * Add points with TTL (called after check-ins, events, etc.)
 * This calls the database function for proper TTL calculation
 */
export async function addPointsWithTTL(
    userId: string,
    points: number,
    sourceType: 'routine' | 'special' | 'race',
    sourceId?: string,
    description?: string
): Promise<string> {
    const { data, error } = await supabase.rpc('add_points_with_ttl', {
        p_user_id: userId,
        p_points: points,
        p_source_type: sourceType,
        p_source_id: sourceId || null,
        p_description: description || null,
    });

    if (error) {
        console.error('Error adding points:', error);
        throw error;
    }

    return data as string;
}

/**
 * Add XP and Points together (for check-ins)
 */
export async function addXPAndPoints(
    userId: string,
    xp: number,
    points: number,
    sourceType: 'routine' | 'special' | 'race',
    sourceId?: string,
    description?: string
): Promise<{ new_xp: number; new_level: string; points_transaction_id: string }> {
    const { data, error } = await supabase.rpc('add_xp_and_points', {
        p_user_id: userId,
        p_xp: xp,
        p_points: points,
        p_source_type: sourceType,
        p_source_id: sourceId || null,
        p_description: description || null,
    });

    if (error) {
        console.error('Error adding XP and points:', error);
        throw error;
    }

    // RPC returns array, get first item
    const result = Array.isArray(data) ? data[0] : data;
    return result;
}

/**
 * Consume points using FIFO (oldest expiring first)
 */
export async function consumePoints(userId: string, pointsToConsume: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('consume_points_fifo', {
        p_user_id: userId,
        p_points_to_consume: pointsToConsume,
    });

    if (error) {
        console.error('Error consuming points:', error);
        throw error;
    }

    return data as boolean;
}

/**
 * Get available points (not expired)
 */
export async function getAvailablePoints(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_available_points', {
        p_user_id: userId,
    });

    if (error) {
        console.error('Error getting available points:', error);
        throw error;
    }

    return (data as number) || 0;
}

// ============ Cart Functions ============

/**
 * Get cart items for user with full product details
 */
export async function getCartItems(userId: string): Promise<CartItem[]> {
    const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching cart:', error);
        throw error;
    }

    if (!cartItems || cartItems.length === 0) {
        return [];
    }

    // Separate shop and marketplace items
    const shopItemIds = cartItems
        .filter(item => item.item_type === 'shop')
        .map(item => item.item_id);

    const marketplaceItemIds = cartItems
        .filter(item => item.item_type === 'marketplace')
        .map(item => item.item_id);

    // Fetch shop items details
    let shopItems: any[] = [];
    if (shopItemIds.length > 0) {
        const { data, error: shopError } = await supabase
            .from('corre_shop_items')
            .select('id, title, points_price, image_url, stock')
            .in('id', shopItemIds);

        if (!shopError && data) {
            shopItems = data;
        }
    }

    // Fetch marketplace items details
    let marketplaceItems: any[] = [];
    if (marketplaceItemIds.length > 0) {
        const { data, error: marketplaceError } = await supabase
            .from('marketplace_listings')
            .select('id, title, price_cents, images, is_available')
            .in('id', marketplaceItemIds);

        if (!marketplaceError && data) {
            marketplaceItems = data;
        }
    }

    // Merge cart items with product details
    const itemsWithDetails = cartItems.map(cartItem => {
        if (cartItem.item_type === 'shop') {
            const shopItem = shopItems.find(item => item.id === cartItem.item_id);
            return {
                ...cartItem,
                item: shopItem ? {
                    title: shopItem.title,
                    price: shopItem.points_price / 100, // Convert points to euros (mock conversion)
                    image_url: shopItem.image_url,
                    stock: shopItem.stock,
                } : null,
            };
        } else {
            const marketplaceItem = marketplaceItems.find(item => item.id === cartItem.item_id);
            return {
                ...cartItem,
                item: marketplaceItem ? {
                    title: marketplaceItem.title,
                    price: marketplaceItem.price_cents / 100, // Convert cents to euros
                    image_url: marketplaceItem.images?.[0] || null, // Use first image
                    is_available: marketplaceItem.is_available,
                } : null,
            };
        }
    });

    return itemsWithDetails as CartItem[];
}

/**
 * Add item to cart
 */
export async function addToCart(
    userId: string,
    itemType: 'shop' | 'marketplace',
    itemId: string,
    quantity: number = 1
): Promise<CartItem> {
    const { data, error } = await supabase
        .from('cart_items')
        .upsert({
            user_id: userId,
            item_type: itemType,
            item_id: itemId,
            quantity,
        }, {
            onConflict: 'user_id,item_type,item_id',
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding to cart:', error);
        throw error;
    }

    return data as CartItem;
}

/**
 * Update cart item quantity
 */
export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
        await removeFromCart(cartItemId);
        return;
    }

    const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

    if (error) {
        console.error('Error updating cart:', error);
        throw error;
    }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(cartItemId: string): Promise<void> {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

    if (error) {
        console.error('Error removing from cart:', error);
        throw error;
    }
}

/**
 * Clear entire cart
 */
export async function clearCart(userId: string): Promise<void> {
    const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Error clearing cart:', error);
        throw error;
    }
}

// ============ Order Functions ============

/**
 * Get order history
 */
export async function getOrderHistory(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (*)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }

    return (data || []) as Order[];
}

/**
 * Get single order by ID
 */
export async function getOrder(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (*)
    `)
        .eq('id', orderId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching order:', error);
        throw error;
    }

    return data as Order;
}

// ============ Guest Pass Functions ============

/**
 * Get current month's guest pass
 */
export async function getCurrentGuestPass(userId: string): Promise<GuestPass | null> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('guest_passes')
        .select(`
      *,
      events:event_id (title, event_datetime)
    `)
        .eq('user_id', userId)
        .eq('valid_month', currentMonth)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching guest pass:', error);
        throw error;
    }

    return data as GuestPass;
}

/**
 * Create or use guest pass
 */
export async function useGuestPass(
    userId: string,
    guestName: string,
    guestEmail: string,
    eventId: string
): Promise<GuestPass> {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('guest_passes')
        .upsert({
            user_id: userId,
            valid_month: currentMonth,
            guest_name: guestName,
            guest_email: guestEmail,
            event_id: eventId,
            used_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,valid_month',
        })
        .select()
        .single();

    if (error) {
        console.error('Error using guest pass:', error);
        throw error;
    }

    return data as GuestPass;
}

// ============ Notification Functions ============

/**
 * Get notifications for user
 */
export async function getNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (unreadOnly) {
        query = query.is('read_at', null);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
    }

    return (data || []) as Notification[];
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

    if (error) {
        console.error('Error counting notifications:', error);
        throw error;
    }

    return count || 0;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

    if (error) {
        console.error('Error marking notification read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

    if (error) {
        console.error('Error marking all notifications read:', error);
        throw error;
    }
}
