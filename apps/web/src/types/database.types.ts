// Database types — single source of truth for web dashboard
// Must stay in sync with Supabase migrations.

// ─── Enums ────────────────────────────────────────────────

/** Matches users.membership_tier constraint */
export type MembershipTier = 'free' | 'pro' | 'club' | 'basico' | 'baixa_pace' | 'parceiros';

/**
 * Event types synced with the mobile app points model.
 * routine=base, special=bonus, race=max.
 */
export type EventType = 'routine' | 'special' | 'race';

/** Dashboard access role (users.role column) */
export type UserRole = 'user' | 'partner' | 'admin';

export type DiscountType = 'percentage' | 'fixed' | 'freebie';

// ─── Core tables ──────────────────────────────────────────

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
    current_xp: number;
    xp_level: string | null;
    language_preference: 'en' | 'pt' | 'es';
    qr_code_secret: string;
    is_merchant: boolean;
    role: UserRole;
    push_token: string | null;
    onboarding_completed: boolean;
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

// ─── Marketplace ──────────────────────────────────────────

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
    price_cents: number;
    allow_points_discount: boolean;
    max_points_discount_percent: number;
    // Legacy compatibility with older mobile/web clients.
    points_price?: number | null;
    image_url: string | null;
    stock: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ─── Partner / Places ─────────────────────────────────────

/**
 * Business profile for a partner user.
 * Joined to users via user_id (one-to-one).
 */
export interface Partner {
    id: string;
    user_id: string;
    business_name: string | null;
    business_logo_url: string | null;
    business_description: string | null;
    contact_email: string | null;
    website_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PartnerApplication {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    phone_country_code: string | null;
    business_name: string;
    club_benefits: string | null;
    staff_benefits: string | null;
    poc_name: string | null;
    category: string | null;
    category_other: string | null;
    membership: 'Free' | 'Monthly' | 'Annual' | null;
    start_date: string | null;
    logo_url: string | null;
    business_description: string | null;
    contact_email: string | null;
    website_url: string | null;
    instagram_handle: string | null;
    business_address: string | null;
    city: string | null;
    country: string | null;
    partnership_focus: string[];
    notes: string | null;
    status: 'pending' | 'approved' | 'rejected';
    review_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_partner_user_id: string | null;
    created_partner_id: string | null;
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

// ─── Coupons ──────────────────────────────────────────────

/**
 * Unified partner_coupons schema (migration 20260227100044).
 *
 * Mobile fields: title, description, partner (display name), code,
 *   points_required, discount_type, discount_value, category,
 *   expires_at, stock_limit, redeemed_count, image_url, terms, referral_link
 *
 * Web fields added in Sprint 1: partner_id, min_tier, valid_from
 *
 * Column name mapping (old web name → correct DB name):
 *   valid_until    → expires_at
 *   max_uses       → stock_limit
 *   current_uses   → redeemed_count
 *   discount_percent → use discount_value with discount_type='percentage'
 */
export interface PartnerCoupon {
    id: string;
    // Ownership
    partner_id: string | null;
    // Display (mobile app)
    title: string;
    partner: string;
    description: string;
    code: string;
    // Discount
    discount_type: DiscountType;
    discount_value: number | null;
    // Audience
    category: 'fashion' | 'health' | 'sports' | 'apps' | 'drinks' | 'other';
    min_tier: MembershipTier;
    // Validity
    points_required: number;
    valid_from: string;
    expires_at: string;
    is_active: boolean;
    // Usage
    stock_limit: number | null;
    redeemed_count: number;
    // Optional
    image_url: string | null;
    terms: string | null;
    referral_link: string | null;
    created_at: string;
    updated_at: string;
}

export interface CouponRedemption {
    id: string;
    coupon_id: string;
    user_id: string;
    code_used: string;
    points_spent: number;
    redeemed_at: string;
    is_used: boolean;
    used_at: string | null;
    users?: Partial<User>;
    partner_coupons?: Partial<PartnerCoupon>;
}

// ─── Transactions ─────────────────────────────────────────

export interface Transaction {
    id: string;
    user_id: string | null;
    stripe_payment_intent_id: string | null;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed' | 'refunded';
    description: string | null;
    created_at: string;
}

// ─── Subscriptions ────────────────────────────────────────

export interface Plan {
    id: string;
    name: string;
    price: number;
    description: string | null;
    features: Record<string, unknown>;
    created_at: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    plan_id: string;
    plan_name: string;
    status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid' | 'free';
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
    updated_at: string;
    users?: Partial<User>;
    plans?: Partial<Plan>;
}
