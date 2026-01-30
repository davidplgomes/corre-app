// Database types - synced with mobile app
// These match the Supabase tables used by the mobile app

export type MembershipTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type EventType = 'run' | 'group_run' | 'coffee_run' | 'meditation' | 'social';
export type UserRole = 'user' | 'partner' | 'admin';

export interface User {
    id: string;
    email: string;
    full_name: string;
    neighborhood: string | null;
    bio: string | null;
    city: string | null;
    instagram_handle: string | null;
    avatar_url: string | null;
    membership_tier: MembershipTier;
    current_month_points: number;
    total_lifetime_points: number;
    current_xp?: number;
    total_xp?: number;
    current_points?: number;
    level?: number;
    language_preference: 'en' | 'pt' | 'es';
    qr_code_secret: string;
    is_merchant: boolean;
    role: UserRole;
    privacy_visibility: 'friends' | 'anyone' | 'nobody';
    created_at: string;
    updated_at: string;
}

export interface Event {
    id: string;
    title: string;
    description: string | null;
    event_type: EventType;
    points_value: number;
    event_datetime: string;
    location_lat: number;
    location_lng: number;
    location_name: string | null;
    check_in_radius_meters: number;
    creator_id: string;
    created_at: string;
    updated_at: string;
}

export interface EventParticipant {
    id: string;
    event_id: string;
    user_id: string;
    joined_at: string;
    users?: Partial<User>;
}

export interface CheckIn {
    id: string;
    event_id: string;
    user_id: string;
    check_in_lat: number;
    check_in_lng: number;
    points_earned: number;
    checked_in_at: string;
}

export interface LeaderboardEntry {
    id: string;
    user_id: string;
    month: string;
    points: number;
    rank: number | null;
    created_at: string;
    updated_at: string;
    users?: Partial<User>;
}

export interface FeedPost {
    id: string;
    user_id: string;
    activity_type: 'run' | 'check_in' | 'post';
    content: string | null;
    media_url: string | null;
    meta_data: {
        distance?: string;
        time?: string;
        pace?: string;
        event_id?: string;
        location?: string;
        points?: number;
    } | null;
    created_at: string;
    users?: Partial<User>;
}

export interface MarketplaceItem {
    id: string;
    seller_id: string;
    title: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string;
    status: 'active' | 'sold';
    created_at: string;
    users?: Partial<User>;
}

export interface ShopItem {
    id: string;
    title: string;
    description: string | null;
    points_price: number;
    image_url: string | null;
    stock: number;
    is_active: boolean;
    created_at: string;
}

// Partner-specific types (for web dashboard)
export interface Partner {
    id: string;
    business_name: string | null;
    business_logo_url: string | null;
    business_description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PartnerPlace {
    id: string;
    partner_id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PartnerCoupon {
    id: string;
    partner_id: string;
    code: string;
    description: string;
    discount_percent: number;
    min_tier: MembershipTier;
    valid_from: string;
    valid_until: string | null;
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CouponRedemption {
    id: string;
    coupon_id: string;
    user_id: string;
    redeemed_at: string;
    users?: Partial<User>;
    partner_coupons?: Partial<PartnerCoupon>;
}

export interface Plan {
    id: string;
    name: string;
    price: number;
    description: string | null;
    features: any;
    created_at: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: 'active' | 'past_due' | 'cancelled';
    current_period_end: string | null;
    created_at: string;
    users?: Partial<User>;
    plans?: Partial<Plan>;
}
