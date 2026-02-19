/**
 * Types barrel file
 * Re-exports all types from the types directory.
 */

export type { Database, User, Event, EventParticipant, CheckIn, LeaderboardEntry, Neighborhood, FeedPost, MarketplaceItem, ShopItem, PostLike, PostComment } from './database.types';
export type { UserProfile, AuthUser, SignUpData, LoginData, UpdateProfileData } from './user.types';
export type { EventData, CreateEventData, UpdateEventData, EventWithParticipants, CheckInData, CheckInResult, Location } from './event.types';
export type { ApiResponse, ApiError, ApiStatus, PaginatedResponse, ApiRequestConfig, AuthTokenPayload, SignUpRequest, SignInRequest, ChangePasswordRequest, ResetEmailRequest, UpdateProfileRequest, UpdateEmailRequest } from './api.types';
export type { AppState, AuthState, ProfileState, SubscriptionState, UIState, AppAction, AuthAction, ProfileAction, SubscriptionAction, UIAction, SubscriptionProduct, SubscriptionTransaction } from './store.types';
export type { SubscriptionInfo, SubscriptionStatus, TransactionRecord, CreateSubscriptionRequest, StripeProductDisplay } from './subscription.types';
export type { ChatConversation, ChatMessage, ChatPreview } from './chat.types';
export type { AnalyticsEvent, AnalyticsUserIdentity, ScreenViewEvent, AnalyticsProviderConfig } from './analytics.types';
export type { IDatabaseProvider, IPaymentProvider, IAnalyticsProvider, ISupportProvider, IMarketingProvider } from './provider.types';

// ─── Types needed by existing screens (wallet, shop, notifications) ────
// These are properly typed to match the EXISTING legacy screens and services
// to ensure the app compiles without refactoring those huge screens yet.

export interface WalletBalance {
    total_available: number;
    expiring_soon: number;
    breakdown: {
        routine: number;
        special: number;
        race: number;
        purchase_refund: number;
    };
    transactions?: PointTransaction[];
}

export interface XPProgress {
    current_xp: number;
    xp_to_next_level: number;
    next_level: string | null;
    level: string; // 'starter' | 'pacer' | 'elite'
    renewal_discount: number;
}

export interface PointTransaction {
    id: string;
    points_amount: number; // or 'amount' depending on usage, checking errors it seems 'points_amount' or 'amount'
    points_remaining: number;
    source_type: 'routine' | 'special' | 'race' | 'purchase_refund';
    description: string;
    created_at: string;
    earned_at?: string;
    expires_at: string;
}

export interface CartItem {
    id: string;
    user_id: string;
    item_type: 'shop' | 'marketplace';
    item_id: string; // The ID of the item in the shop/marketplace table
    quantity: number;
    created_at: string;
    // Joined fields often added by query
    item?: {
        title: string;
        price: number;
        image_url: string | null;
    };
    // Flattened fields sometimes used
    name?: string;
    price_cents?: number;
    image_url?: string | null;
}

export interface Order {
    id: string;
    user_id: string;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total_amount: number; // Stored as cents usually, but called total_amount in legacy?
    points_used: number;
    items: CartItem[];
    shipping_address: ShippingAddress | null;
    created_at: string;
    updated_at: string;
}

export interface ShippingAddress {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
}

export interface GuestPass {
    id: string;
    code: string;
    status: 'active' | 'used' | 'expired';
    guest_name?: string;
    guest_email?: string;
    event_id: string;
    event?: {
        title: string;
        event_datetime: string;
    };
    created_at: string;
    expires_at: string;
    used_at?: string;
}

export interface Notification {
    id: string;
    type: 'general' | 'event' | 'points' | 'order' | 'friend' | 'subscription';
    title: string;
    body: string;
    read_at: string | null; // Legacy uses read_at, not read boolean
    data?: Record<string, unknown>;
    created_at: string;
}
