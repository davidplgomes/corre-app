/**
 * AppStore — Centralized State Store
 * 
 * React Context + useReducer pattern.
 * All application state lives here. The API layer writes to this store;
 * components read from it via selectors.
 * 
 * Architecture:
 *   API Layer -> dispatch(action) -> AppStore -> components (via selectors)
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { AppState, AppAction } from '../types/store.types';
import { UserProfile } from '../types/user.types';
import { appReducer, initialAppState } from './reducers';
import { AuthApi } from '../api/endpoints/auth.api';
import { UsersApi } from '../api/endpoints/users.api';
import { SubscriptionsApi } from '../api/endpoints/subscriptions.api';
import * as actions from './actions';
import { logger } from '../services/logging/Logger';

// ─── Context ───────────────────────────────────────────────

interface AppStoreContextValue {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    /** Load user profile from API and update store */
    loadProfile: (userId: string) => Promise<void>;
    /** Load subscription info and update store */
    loadSubscription: (userId: string) => Promise<void>;
    /** Sign up and set session */
    signUp: (email: string, password: string, fullName: string, neighborhood: string) => Promise<void>;
    /** Sign in and set session */
    signIn: (email: string, password: string) => Promise<void>;
    /** Sign out and clear all state */
    signOut: () => Promise<void>;
    /** Refresh the current profile */
    refreshProfile: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialAppState);

    const loadProfile = useCallback(async (userId: string) => {
        dispatch(actions.setProfile({ ...initialAppState.profile.profile } as unknown as UserProfile));
        dispatch({ type: 'PROFILE_SET_STATUS', payload: 'loading' });

        const response = await UsersApi.getProfile(userId);

        if (response.error || !response.data) {
            dispatch(actions.setProfileError(response.error?.message || 'Failed to load profile'));
            return;
        }

        const data = response.data as any;
        const profile: UserProfile = {
            id: data.id,
            email: data.email,
            fullName: data.full_name,
            neighborhood: data.neighborhood,
            bio: data.bio ?? null,
            city: data.city ?? null,
            instagramHandle: data.instagram_handle ?? null,
            avatarUrl: data.avatar_url
                ? `${data.avatar_url}?t=${new Date().getTime()}`
                : null,
            membershipTier: data.membership_tier,
            currentMonthPoints: data.current_month_points,
            totalLifetimePoints: data.total_lifetime_points,
            languagePreference: data.language_preference,
            qrCodeSecret: data.qr_code_secret,
            isMerchant: data.is_merchant,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
        };

        dispatch(actions.setProfile(profile));
        logger.info('STORE', 'Profile loaded', { userId });
    }, []);

    const loadSubscription = useCallback(async (userId: string) => {
        dispatch({ type: 'SUBSCRIPTION_SET_STATUS', payload: 'loading' });

        const response = await SubscriptionsApi.getCurrentSubscription(userId);

        if (response.error) {
            dispatch(actions.setSubscriptionError(response.error.message));
            return;
        }

        dispatch(actions.setCurrentSubscription(response.data));
        logger.info('STORE', 'Subscription loaded', { userId });
    }, []);

    const signUp = useCallback(async (email: string, password: string, fullName: string, neighborhood: string) => {
        dispatch({ type: 'AUTH_SET_STATUS', payload: 'loading' });

        const response = await AuthApi.signUp({ email, password, fullName, neighborhood });

        if (response.error || !response.data) {
            dispatch(actions.setAuthError(response.error?.message || 'Sign up failed'));
            throw new Error(response.error?.message || 'Sign up failed');
        }

        dispatch(actions.setSession(response.data.user, response.data.session));
        await loadProfile(response.data.user.id);
    }, [loadProfile]);

    const signIn = useCallback(async (email: string, password: string) => {
        dispatch({ type: 'AUTH_SET_STATUS', payload: 'loading' });

        const response = await AuthApi.signIn({ email, password });

        if (response.error || !response.data) {
            dispatch(actions.setAuthError(response.error?.message || 'Sign in failed'));
            throw new Error(response.error?.message || 'Sign in failed');
        }

        dispatch(actions.setSession(response.data.user, response.data.session));
        await loadProfile(response.data.user.id);
    }, [loadProfile]);

    const signOut = useCallback(async () => {
        await AuthApi.signOut();
        dispatch(actions.clearSession());
        dispatch(actions.clearProfile());
        dispatch(actions.setCurrentSubscription(null));
        logger.info('STORE', 'User signed out, all state cleared');
    }, []);

    const refreshProfile = useCallback(async () => {
        if (state.auth.user) {
            await loadProfile(state.auth.user.id);
        }
    }, [state.auth.user, loadProfile]);

    const value = useMemo(
        () => ({
            state,
            dispatch,
            loadProfile,
            loadSubscription,
            signUp,
            signIn,
            signOut,
            refreshProfile,
        }),
        [state, dispatch, loadProfile, loadSubscription, signUp, signIn, signOut, refreshProfile]
    );

    return React.createElement(AppStoreContext.Provider, { value }, children);
};

// ─── Hooks ─────────────────────────────────────────────────

/** Access the full app state */
export function useAppState(): AppState {
    const context = useContext(AppStoreContext);
    if (!context) {
        throw new Error('useAppState must be used within an AppStoreProvider');
    }
    return context.state;
}

/** Access the store dispatch */
export function useAppDispatch(): React.Dispatch<AppAction> {
    const context = useContext(AppStoreContext);
    if (!context) {
        throw new Error('useAppDispatch must be used within an AppStoreProvider');
    }
    return context.dispatch;
}

/** Access the store actions */
export function useAppStore(): AppStoreContextValue {
    const context = useContext(AppStoreContext);
    if (!context) {
        throw new Error('useAppStore must be used within an AppStoreProvider');
    }
    return context;
}
