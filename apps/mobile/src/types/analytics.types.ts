/**
 * Analytics Types
 * Types for Google Analytics, PostHog, and the unified analytics facade.
 */

/** Analytics event */
export interface AnalyticsEvent {
    name: string;
    properties?: Record<string, string | number | boolean>;
    timestamp?: number;
}

/** Analytics user identity */
export interface AnalyticsUserIdentity {
    userId: string;
    email?: string;
    name?: string;
    plan?: string;
    properties?: Record<string, string | number | boolean>;
}

/** Screen view event */
export interface ScreenViewEvent {
    screenName: string;
    screenClass?: string;
}

/** Analytics provider interface */
export interface AnalyticsProviderConfig {
    enabled: boolean;
    apiKey: string;
    debug?: boolean;
}
