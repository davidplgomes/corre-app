/**
 * ConvertKit (Kit) Marketing Service
 * Handles email subscriptions and subscriber tagging.
 * Automatically disabled if CONVERTKIT_API_KEY is not set.
 */

import { CONFIG } from '../../constants/config';
import { logger } from '../logging/Logger';
import { IMarketingProvider } from '../../types/provider.types';
import { ApiResponse } from '../../types/api.types';

class ConvertKitService implements IMarketingProvider {
    private static instance: ConvertKitService;
    private enabled: boolean;
    private baseUrl = 'https://api.convertkit.com/v3';

    private constructor() {
        this.enabled = CONFIG.convertKit.enabled;
    }

    static getInstance(): ConvertKitService {
        if (!ConvertKitService.instance) {
            ConvertKitService.instance = new ConvertKitService();
        }
        return ConvertKitService.instance;
    }

    async initialize(): Promise<void> {
        if (!this.enabled) {
            logger.debug('MARKETING', 'ConvertKit disabled (no API key)');
            return;
        }
        logger.info('MARKETING', 'ConvertKit initialized');
    }

    /** Subscribe email to the configured form */
    async subscribe(email: string, firstName?: string): Promise<ApiResponse<void>> {
        if (!this.enabled) {
            return { data: null, error: { code: 'DISABLED', message: 'ConvertKit is disabled' }, status: 'error' };
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/forms/${CONFIG.convertKit.formId}/subscribe`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: CONFIG.convertKit.apiKey,
                        email,
                        first_name: firstName,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                logger.error('MARKETING', 'ConvertKit subscribe error', new Error(errorData.message));
                return { data: null, error: { code: 'SUBSCRIBE_ERROR', message: errorData.message }, status: 'error' };
            }

            logger.info('MARKETING', 'Email subscribed', { email });
            return { data: undefined as unknown as void, error: null, status: 'success' };
        } catch (error) {
            logger.error('MARKETING', 'ConvertKit subscribe exception', error);
            return { data: null, error: { code: 'EXCEPTION', message: String(error) }, status: 'error' };
        }
    }

    /** Tag a subscriber */
    async tagSubscriber(email: string, tagId: string): Promise<ApiResponse<void>> {
        if (!this.enabled) {
            return { data: null, error: { code: 'DISABLED', message: 'ConvertKit is disabled' }, status: 'error' };
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/tags/${tagId}/subscribe`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: CONFIG.convertKit.apiKey,
                        email,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                return { data: null, error: { code: 'TAG_ERROR', message: errorData.message }, status: 'error' };
            }

            logger.info('MARKETING', 'Subscriber tagged', { email, tagId });
            return { data: undefined as unknown as void, error: null, status: 'success' };
        } catch (error) {
            logger.error('MARKETING', 'ConvertKit tag exception', error);
            return { data: null, error: { code: 'EXCEPTION', message: String(error) }, status: 'error' };
        }
    }
}

export const convertKitService = ConvertKitService.getInstance();
