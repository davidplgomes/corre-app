/**
 * State Store Types
 * Defines the full application state shape and all action types
 * for the centralized state store.
 */

import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { UserProfile } from './user.types';
import { SubscriptionInfo } from './subscription.types';
import { ApiStatus } from './api.types';

/** Root application state */
export interface AppState {
    auth: AuthState;
    profile: ProfileState;
    subscription: SubscriptionState;
    ui: UIState;
}

/** Authentication state */
export interface AuthState {
    user: SupabaseAuthUser | null;
    session: Session | null;
    status: ApiStatus;
    error: string | null;
    isAuthenticated: boolean;
}

/** User profile state */
export interface ProfileState {
    profile: UserProfile | null;
    status: ApiStatus;
    error: string | null;
}

/** Subscription state */
export interface SubscriptionState {
    current: SubscriptionInfo | null;
    products: SubscriptionProduct[];
    transactions: SubscriptionTransaction[];
    status: ApiStatus;
    error: string | null;
}

/** Subscription product from Stripe */
export interface SubscriptionProduct {
    id: string;
    name: string;
    description: string | null;
    priceId: string;
    priceAmount: number;
    priceCurrency: string;
    priceInterval: 'month' | 'year';
    features: string[];
    metadata: Record<string, string>;
    active: boolean;
}

/** Subscription transaction */
export interface SubscriptionTransaction {
    id: string;
    subscriptionId: string | null;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed' | 'refunded';
    description: string | null;
    createdAt: string;
}

/** UI state */
export interface UIState {
    isLoading: boolean;
    globalError: string | null;
}

// ─── Action Types ───────────────────────────────────────────────

export type AppAction =
    | AuthAction
    | ProfileAction
    | SubscriptionAction
    | UIAction;

export type AuthAction =
    | { type: 'AUTH_SET_SESSION'; payload: { user: SupabaseAuthUser; session: Session } }
    | { type: 'AUTH_CLEAR_SESSION' }
    | { type: 'AUTH_SET_STATUS'; payload: ApiStatus }
    | { type: 'AUTH_SET_ERROR'; payload: string | null };

export type ProfileAction =
    | { type: 'PROFILE_SET'; payload: UserProfile }
    | { type: 'PROFILE_CLEAR' }
    | { type: 'PROFILE_SET_STATUS'; payload: ApiStatus }
    | { type: 'PROFILE_SET_ERROR'; payload: string | null }
    | { type: 'PROFILE_UPDATE_FIELD'; payload: Partial<UserProfile> };

export type SubscriptionAction =
    | { type: 'SUBSCRIPTION_SET_CURRENT'; payload: SubscriptionInfo | null }
    | { type: 'SUBSCRIPTION_SET_PRODUCTS'; payload: SubscriptionProduct[] }
    | { type: 'SUBSCRIPTION_SET_TRANSACTIONS'; payload: SubscriptionTransaction[] }
    | { type: 'SUBSCRIPTION_SET_STATUS'; payload: ApiStatus }
    | { type: 'SUBSCRIPTION_SET_ERROR'; payload: string | null };

export type UIAction =
    | { type: 'UI_SET_LOADING'; payload: boolean }
    | { type: 'UI_SET_GLOBAL_ERROR'; payload: string | null };
