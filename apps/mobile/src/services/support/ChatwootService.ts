/**
 * Chatwoot Support Service
 * Integrates Chatwoot for live support chat.
 * Automatically disabled if CHATWOOT_WEBSITE_TOKEN is not set.
 */

import { CONFIG } from '../../constants/config';
import { logger } from '../logging/Logger';
import { ISupportProvider } from '../../types/provider.types';

class ChatwootService implements ISupportProvider {
    private static instance: ChatwootService;
    private enabled: boolean;
    private listeners: ((visible: boolean) => void)[] = [];
    private userListeners: ((user: { identifier: string; email: string; name: string }) => void)[] = [];

    private constructor() {
        this.enabled = !!CONFIG.chatwoot.enabled && !!CONFIG.chatwoot.websiteToken && !!CONFIG.chatwoot.baseUrl;
    }

    static getInstance(): ChatwootService {
        if (!ChatwootService.instance) {
            ChatwootService.instance = new ChatwootService();
        }
        return ChatwootService.instance;
    }

    async initialize(userId?: string): Promise<void> {
        if (!this.enabled) {
            logger.debug('SUPPORT', 'Chatwoot disabled (missing config)');
            return;
        }
        logger.info('SUPPORT', 'Chatwoot initialized', { userId });
    }

    /**
     * Show the Chatwoot widget
     */
    show(): void {
        if (!this.enabled) return;
        logger.debug('SUPPORT', 'Showing Chatwoot widget');
        this.notifyListeners(true);
    }

    /**
     * Hide the Chatwoot widget
     */
    hide(): void {
        if (!this.enabled) return;
        logger.debug('SUPPORT', 'Hiding Chatwoot widget');
        this.notifyListeners(false);
    }

    /**
     * Set the user details for Chatwoot
     */
    setUser(userId: string, email: string, name: string): void {
        if (!this.enabled) return;
        logger.debug('SUPPORT', 'Setting Chatwoot user', { userId });
        this.notifyUserListeners({ identifier: userId, email, name });
    }

    // Listener Management
    subscribe(listener: (visible: boolean) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(visible: boolean): void {
        this.listeners.forEach(listener => listener(visible));
    }

    subscribeUser(listener: (user: { identifier: string; email: string; name: string }) => void): () => void {
        this.userListeners.push(listener);
        return () => {
            this.userListeners = this.userListeners.filter(l => l !== listener);
        };
    }

    private notifyUserListeners(user: { identifier: string; email: string; name: string }): void {
        this.userListeners.forEach(listener => listener(user));
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

export const chatwootService = ChatwootService.getInstance();
