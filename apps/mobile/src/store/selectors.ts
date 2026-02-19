/**
 * State Store — Selectors
 * Memoized selector hooks for components to read state.
 * Components should use these instead of reading state directly.
 */

import { useCallback, useMemo } from 'react';
import { useAppState } from './AppStore';
import { UserProfile } from '../types/user.types';
import { SubscriptionInfo } from '../types/subscription.types';
import { SubscriptionProduct, SubscriptionTransaction } from '../types/store.types';
import { ApiStatus } from '../types/api.types';

// ─── Auth Selectors ────────────────────────────────────────

/** Is the user authenticated? */
export function useIsAuthenticated(): boolean {
    const state = useAppState();
    return state.auth.isAuthenticated;
}

/** Get the current Supabase auth user */
export function useAuthUser() {
    const state = useAppState();
    return state.auth.user;
}

/** Get the current session */
export function useSession() {
    const state = useAppState();
    return state.auth.session;
}

/** Get auth loading status */
export function useAuthStatus(): ApiStatus {
    const state = useAppState();
    return state.auth.status;
}

/** Get auth error */
export function useAuthError(): string | null {
    const state = useAppState();
    return state.auth.error;
}

// ─── Profile Selectors ────────────────────────────────────

/** Get the user profile */
export function useProfile(): UserProfile | null {
    const state = useAppState();
    return state.profile.profile;
}

/** Get profile loading status */
export function useProfileStatus(): ApiStatus {
    const state = useAppState();
    return state.profile.status;
}

/** Get a specific profile field */
export function useProfileField<K extends keyof UserProfile>(field: K): UserProfile[K] | undefined {
    const state = useAppState();
    return state.profile.profile?.[field];
}

// ─── Subscription Selectors ────────────────────────────────

/** Get current subscription */
export function useCurrentSubscription(): SubscriptionInfo | null {
    const state = useAppState();
    return state.subscription.current;
}

/** Get available products */
export function useSubscriptionProducts(): SubscriptionProduct[] {
    const state = useAppState();
    return state.subscription.products;
}

/** Get transaction history */
export function useTransactionHistory(): SubscriptionTransaction[] {
    const state = useAppState();
    return state.subscription.transactions;
}

/** Get subscription loading status */
export function useSubscriptionStatus(): ApiStatus {
    const state = useAppState();
    return state.subscription.status;
}

/** Check if user has active subscription */
export function useHasActiveSubscription(): boolean {
    const state = useAppState();
    const sub = state.subscription.current;
    return sub !== null && (sub.status === 'active' || sub.status === 'trialing');
}

// ─── UI Selectors ──────────────────────────────────────────

/** Is anything loading globally? */
export function useIsLoading(): boolean {
    const state = useAppState();
    return state.ui.isLoading;
}

/** Get global error */
export function useGlobalError(): string | null {
    const state = useAppState();
    return state.ui.globalError;
}
