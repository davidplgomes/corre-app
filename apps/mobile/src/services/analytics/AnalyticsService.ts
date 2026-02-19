/**
 * Analytics Service — Unified facade
 * Dispatches events to all enabled providers (Google Analytics, PostHog).
 * If a provider's API key is missing, it is silently disabled.
 */

import { CONFIG } from '../../constants/config';
import { logger } from '../logging/Logger';
import { IAnalyticsProvider } from '../../types/provider.types';
import analytics from '@react-native-firebase/analytics';
import PostHog from 'posthog-react-native';

/**
 * Google Analytics Provider (via Firebase)
 */
class GoogleAnalyticsProvider implements IAnalyticsProvider {
    private enabled: boolean;

    constructor() {
        this.enabled = !!CONFIG.googleAnalytics.enabled; // Force boolean
    }

    async initialize(): Promise<void> {
        if (!this.enabled) {
            logger.debug('ANALYTICS', 'Google Analytics disabled (no API key)');
            return;
        }
        logger.info('ANALYTICS', 'Google Analytics initialized');
        // Firebase analytics is auto-initialized by the native SDK
    }

    async trackEvent(name: string, properties?: Record<string, any>): Promise<void> {
        if (!this.enabled) return;
        try {
            await analytics().logEvent(name, properties);
            logger.debug('ANALYTICS', `[GA] Track: ${name}`, properties);
        } catch (error) {
            logger.error('ANALYTICS', `[GA] Failed to track event: ${name}`, error);
        }
    }

    async trackScreenView(screenName: string): Promise<void> {
        if (!this.enabled) return;
        try {
            await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
            logger.debug('ANALYTICS', `[GA] Screen: ${screenName}`);
        } catch (error) {
            logger.error('ANALYTICS', `[GA] Failed to track screen: ${screenName}`, error);
        }
    }

    async identify(userId: string): Promise<void> {
        if (!this.enabled) return;
        try {
            await analytics().setUserId(userId);
            logger.debug('ANALYTICS', `[GA] Identify: ${userId}`);
        } catch (error) {
            logger.error('ANALYTICS', `[GA] Failed to identify user`, error);
        }
    }

    async reset(): Promise<void> {
        if (!this.enabled) return;
        try {
            await analytics().setUserId(null);
        } catch (error) {
            logger.error('ANALYTICS', `[GA] Failed to reset user`, error);
        }
    }
}

/**
 * PostHog Provider
 */
class PostHogProvider implements IAnalyticsProvider {
    private enabled: boolean;
    private client: PostHog | null = null;

    constructor() {
        this.enabled = !!CONFIG.posthog.enabled && !!CONFIG.posthog.apiKey;
    }

    async initialize(): Promise<void> {
        if (!this.enabled) {
            logger.debug('ANALYTICS', 'PostHog disabled (no API key)');
            return;
        }

        try {
            this.client = new PostHog(CONFIG.posthog.apiKey!, {
                host: CONFIG.posthog.host || 'https://app.posthog.com',
                flushAt: 1, // Flush immediately for dev usually, maybe higher for prod
                enableSessionReplay: false
            });
            logger.info('ANALYTICS', 'PostHog initialized');
        } catch (error) {
            logger.error('ANALYTICS', 'Failed to initialize PostHog', error);
            this.enabled = false;
        }
    }

    trackEvent(name: string, properties?: Record<string, any>): void {
        if (!this.enabled || !this.client) return;
        this.client.capture(name, properties);
        logger.debug('ANALYTICS', `[PostHog] Track: ${name}`, properties);
    }

    trackScreenView(screenName: string): void {
        if (!this.enabled || !this.client) return;
        this.client.screen(screenName);
        logger.debug('ANALYTICS', `[PostHog] Screen: ${screenName}`);
    }

    identify(userId: string, traits?: Record<string, any>): void {
        if (!this.enabled || !this.client) return;
        this.client.identify(userId, traits);
        logger.debug('ANALYTICS', `[PostHog] Identify: ${userId}`);
    }

    reset(): void {
        if (!this.enabled || !this.client) return;
        this.client.reset();
    }
}

/**
 * Unified Analytics Service
 * Dispatches events to all enabled providers.
 */
class AnalyticsService {
    private static instance: AnalyticsService;
    private providers: IAnalyticsProvider[] = [];
    private initialized = false;

    private constructor() {
        this.providers = [
            new GoogleAnalyticsProvider(),
            new PostHogProvider(),
        ];
    }

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /** Initialize all enabled providers */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        logger.info('ANALYTICS', 'Initializing analytics providers');
        await Promise.all(this.providers.map((p) => p.initialize()));
        this.initialized = true;
    }

    /** Track a custom event across all providers */
    trackEvent(name: string, properties?: Record<string, string | number | boolean>): void {
        this.providers.forEach((p) => p.trackEvent(name, properties));
    }

    /** Track a screen view across all providers */
    trackScreenView(screenName: string): void {
        this.providers.forEach((p) => p.trackScreenView(screenName));
    }

    /** Identify user across all providers */
    identify(userId: string, traits?: Record<string, string | number | boolean>): void {
        this.providers.forEach((p) => p.identify(userId, traits));
    }

    /** Reset user identity across all providers */
    reset(): void {
        this.providers.forEach((p) => p.reset());
    }
}

export const analyticsService = AnalyticsService.getInstance();
