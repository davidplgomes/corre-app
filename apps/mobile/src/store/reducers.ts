/**
 * State Store — Reducers
 * Pure reducer functions for each state slice.
 * No side effects — these only compute new state from actions.
 */

import {
    AppState,
    AppAction,
    AuthState,
    ProfileState,
    SubscriptionState,
    UIState,
} from '../types/store.types';

/** Initial auth state */
export const initialAuthState: AuthState = {
    user: null,
    session: null,
    status: 'idle',
    error: null,
    isAuthenticated: false,
};

/** Initial profile state */
export const initialProfileState: ProfileState = {
    profile: null,
    status: 'idle',
    error: null,
};

/** Initial subscription state */
export const initialSubscriptionState: SubscriptionState = {
    current: null,
    products: [],
    transactions: [],
    status: 'idle',
    error: null,
};

/** Initial UI state */
export const initialUIState: UIState = {
    isLoading: false,
    globalError: null,
};

/** Initial full application state */
export const initialAppState: AppState = {
    auth: initialAuthState,
    profile: initialProfileState,
    subscription: initialSubscriptionState,
    ui: initialUIState,
};

/** Root reducer — delegates to slice reducers */
export function appReducer(state: AppState = initialAppState, action: AppAction): AppState {
    return {
        auth: authReducer(state.auth, action),
        profile: profileReducer(state.profile, action),
        subscription: subscriptionReducer(state.subscription, action),
        ui: uiReducer(state.ui, action),
    };
}

/** Auth slice reducer */
function authReducer(state: AuthState, action: AppAction): AuthState {
    switch (action.type) {
        case 'AUTH_SET_SESSION':
            return {
                ...state,
                user: action.payload.user,
                session: action.payload.session,
                isAuthenticated: true,
                status: 'success',
                error: null,
            };
        case 'AUTH_CLEAR_SESSION':
            return {
                ...initialAuthState,
                status: 'success',
            };
        case 'AUTH_SET_STATUS':
            return { ...state, status: action.payload };
        case 'AUTH_SET_ERROR':
            return { ...state, error: action.payload, status: 'error' };
        default:
            return state;
    }
}

/** Profile slice reducer */
function profileReducer(state: ProfileState, action: AppAction): ProfileState {
    switch (action.type) {
        case 'PROFILE_SET':
            return {
                ...state,
                profile: action.payload,
                status: 'success',
                error: null,
            };
        case 'PROFILE_CLEAR':
            return { ...initialProfileState };
        case 'PROFILE_SET_STATUS':
            return { ...state, status: action.payload };
        case 'PROFILE_SET_ERROR':
            return { ...state, error: action.payload, status: 'error' };
        case 'PROFILE_UPDATE_FIELD':
            if (!state.profile) return state;
            return {
                ...state,
                profile: { ...state.profile, ...action.payload },
            };
        default:
            return state;
    }
}

/** Subscription slice reducer */
function subscriptionReducer(state: SubscriptionState, action: AppAction): SubscriptionState {
    switch (action.type) {
        case 'SUBSCRIPTION_SET_CURRENT':
            return { ...state, current: action.payload, status: 'success', error: null };
        case 'SUBSCRIPTION_SET_PRODUCTS':
            return { ...state, products: action.payload };
        case 'SUBSCRIPTION_SET_TRANSACTIONS':
            return { ...state, transactions: action.payload };
        case 'SUBSCRIPTION_SET_STATUS':
            return { ...state, status: action.payload };
        case 'SUBSCRIPTION_SET_ERROR':
            return { ...state, error: action.payload, status: 'error' };
        default:
            return state;
    }
}

/** UI slice reducer */
function uiReducer(state: UIState, action: AppAction): UIState {
    switch (action.type) {
        case 'UI_SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'UI_SET_GLOBAL_ERROR':
            return { ...state, globalError: action.payload };
        default:
            return state;
    }
}
