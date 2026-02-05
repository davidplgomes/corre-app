// Wallet types for points with TTL and XP tracking
export interface PointTransaction {
    id: string;
    user_id: string;
    points_amount: number;
    points_remaining: number;
    source_type: 'routine' | 'special' | 'race' | 'purchase_refund';
    source_id: string | null;
    description: string | null;
    earned_at: string;
    expires_at: string;
    consumed_at: string | null;
    created_at: string;
}

export interface WalletBalance {
    total_available: number;
    expiring_soon: number; // Points expiring in next 7 days
    breakdown: {
        routine: number;
        special: number;
        race: number;
    };
    transactions: PointTransaction[];
}

export interface XPProgress {
    current_xp: number;
    level: 'starter' | 'pacer' | 'elite';
    next_level: 'pacer' | 'elite' | null;
    xp_to_next_level: number;
    renewal_discount: number; // 0, 5, or 10 percent
}

export interface CartItem {
    id: string;
    user_id: string;
    item_type: 'shop' | 'marketplace';
    item_id: string;
    quantity: number;
    created_at: string;
    // Joined data
    item?: ShopItemDetails | MarketplaceItemDetails;
}

export interface ShopItemDetails {
    id: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    stock: number;
}

export interface MarketplaceItemDetails {
    id: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    seller_id: string;
    seller?: {
        full_name: string;
        membership_tier: string;
    };
}

export interface Order {
    id: string;
    user_id: string;
    total_amount: number;
    points_used: number;
    cash_amount: number;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    stripe_payment_intent_id: string | null;
    shipping_address: ShippingAddress | null;
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    item_type: 'shop' | 'marketplace';
    item_id: string;
    quantity: number;
    unit_price: number;
    created_at: string;
    // Joined data
    item?: ShopItemDetails | MarketplaceItemDetails;
}

export interface ShippingAddress {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
}

export interface GuestPass {
    id: string;
    user_id: string;
    guest_email: string | null;
    guest_name: string | null;
    event_id: string | null;
    valid_month: string;
    used_at: string | null;
    created_at: string;
    // Joined data
    event?: {
        title: string;
        event_datetime: string;
    };
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: 'general' | 'event' | 'points' | 'order' | 'friend' | 'subscription';
    data: Record<string, any> | null;
    read_at: string | null;
    created_at: string;
}

export interface EventWaitlistEntry {
    id: string;
    event_id: string;
    user_id: string;
    position: number;
    tier_priority: number;
    joined_at: string;
    promoted_at: string | null;
    // Joined data
    user?: {
        full_name: string;
        membership_tier: string;
    };
}
