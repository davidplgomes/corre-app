/**
 * State Store — Action Creators
 * Typed action creators that encapsulate API calls and dispatch results.
 * These are the ONLY way to modify state.
 */

import { AppAction } from '../types/store.types';
import { UserProfile } from '../types/user.types';
import { SubscriptionInfo } from '../types/subscription.types';
import { Session, User } from '@supabase/supabase-js';

// ─── Auth Actions ──────────────────────────────────────────

export const setSession = (user: User, session: Session): AppAction => ({
    type: 'AUTH_SET_SESSION',
    payload: { user, session },
});

export const clearSession = (): AppAction => ({
    type: 'AUTH_CLEAR_SESSION',
});

export const setAuthError = (error: string | null): AppAction => ({
    type: 'AUTH_SET_ERROR',
    payload: error,
});

// ─── Profile Actions ───────────────────────────────────────

export const setProfile = (profile: UserProfile): AppAction => ({
    type: 'PROFILE_SET',
    payload: profile,
});

export const clearProfile = (): AppAction => ({
    type: 'PROFILE_CLEAR',
});

export const updateProfileField = (updates: Partial<UserProfile>): AppAction => ({
    type: 'PROFILE_UPDATE_FIELD',
    payload: updates,
});

export const setProfileError = (error: string | null): AppAction => ({
    type: 'PROFILE_SET_ERROR',
    payload: error,
});

// ─── Subscription Actions ──────────────────────────────────

export const setCurrentSubscription = (subscription: SubscriptionInfo | null): AppAction => ({
    type: 'SUBSCRIPTION_SET_CURRENT',
    payload: subscription,
});

export const setSubscriptionProducts = (products: AppAction extends { type: 'SUBSCRIPTION_SET_PRODUCTS'; payload: infer P } ? P : never): AppAction => ({
    type: 'SUBSCRIPTION_SET_PRODUCTS',
    payload: products,
});

export const setSubscriptionTransactions = (transactions: AppAction extends { type: 'SUBSCRIPTION_SET_TRANSACTIONS'; payload: infer P } ? P : never): AppAction => ({
    type: 'SUBSCRIPTION_SET_TRANSACTIONS',
    payload: transactions,
});

export const setSubscriptionError = (error: string | null): AppAction => ({
    type: 'SUBSCRIPTION_SET_ERROR',
    payload: error,
});

// ─── UI Actions ────────────────────────────────────────────

export const setLoading = (loading: boolean): AppAction => ({
    type: 'UI_SET_LOADING',
    payload: loading,
});

export const setGlobalError = (error: string | null): AppAction => ({
    type: 'UI_SET_GLOBAL_ERROR',
    payload: error,
});
