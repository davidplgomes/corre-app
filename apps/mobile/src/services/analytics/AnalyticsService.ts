/**
 * Analytics Service — Unified facade
 * Dispatches events to all enabled providers (Google Analytics, PostHog).
 * If a provider's API key is missing, it is silently disabled.
 */

import { CONFIG } from '../../constants/config';
import { logger } from '../logging/Logger';
import { IAnalyticsProvider } from '../../types/provider.types';
import PostHog from 'posthog-react-native';

/**
 * Google Analytics Provider
 * Firebase was removed from the project, so this provider is a no-op.
 */
class GoogleAnalyticsProvider implements IAnalyticsProvider {
    private enabled: boolean;

    constructor() {
        this.enabled = false;
    }

    async initialize(): Promise<void> {
        if (CONFIG.googleAnalytics.enabled) {
            logger.warn(
                'ANALYTICS',
                'Google Analytics key is configured, but Firebase analytics is not installed. Skipping provider.'
            );
        } else {
            logger.debug('ANALYTICS', 'Google Analytics disabled');
        }
    }

    trackEvent(name: string, properties?: Record<string, any>): void {
        if (!this.enabled) return;
    }

    trackScreenView(screenName: string): void {
        if (!this.enabled) return;
    }

    identify(userId: string): void {
        if (!this.enabled) return;
    }

    reset(): void {
        if (!this.enabled) return;
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
