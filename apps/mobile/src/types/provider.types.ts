/**
 * Provider Interfaces
 * Abstract interfaces for database and payment providers.
 * Enables the app to be ported to other database/payment backends.
 */

import { ApiResponse } from './api.types';
import { UserProfile } from './user.types';
import { SubscriptionInfo, TransactionRecord, StripeProductDisplay, CreateSubscriptionRequest } from './subscription.types';
import { ChatConversation, ChatMessage } from './chat.types';

/** Abstract database provider */
export interface IDatabaseProvider {
    // Users
    getUser(userId: string): Promise<ApiResponse<UserProfile>>;
    updateUser(userId: string, updates: Partial<UserProfile>): Promise<ApiResponse<UserProfile>>;

    // Subscriptions
    getSubscription(userId: string): Promise<ApiResponse<SubscriptionInfo>>;
    upsertSubscription(subscription: Partial<SubscriptionInfo>): Promise<ApiResponse<SubscriptionInfo>>;

    // Transactions
    getTransactions(userId: string): Promise<ApiResponse<TransactionRecord[]>>;
    createTransaction(transaction: Omit<TransactionRecord, 'id' | 'createdAt'>): Promise<ApiResponse<TransactionRecord>>;

    // Chat
    getConversations(userId: string): Promise<ApiResponse<ChatConversation[]>>;
    getMessages(conversationId: string, limit?: number): Promise<ApiResponse<ChatMessage[]>>;
    sendMessage(conversationId: string, senderId: string, content: string): Promise<ApiResponse<ChatMessage>>;
}

/** Abstract payment provider */
export interface IPaymentProvider {
    /** Initialize the payment SDK */
    initialize(): Promise<boolean>;

    /** Fetch available products/prices */
    getProducts(): Promise<ApiResponse<StripeProductDisplay[]>>;

    /** Create a subscription for the user */
    createSubscription(userId: string, request: CreateSubscriptionRequest): Promise<ApiResponse<{ subscriptionId: string; clientSecret?: string }>>;

    /** Cancel a subscription */
    cancelSubscription(subscriptionId: string): Promise<ApiResponse<void>>;

    /** Get subscription status */
    getSubscriptionStatus(subscriptionId: string): Promise<ApiResponse<SubscriptionInfo>>;
}

/** Abstract analytics provider */
export interface IAnalyticsProvider {
    /** Initialize the analytics SDK */
    initialize(): Promise<void>;

    /** Track a custom event */
    trackEvent(name: string, properties?: Record<string, string | number | boolean>): void;

    /** Track a screen view */
    trackScreenView(screenName: string): void;

    /** Identify the user */
    identify(userId: string, traits?: Record<string, string | number | boolean>): void;

    /** Reset the user identity (on sign out) */
    reset(): void;
}

/** Abstract support provider */
export interface ISupportProvider {
    /** Initialize the support SDK */
    initialize(userId?: string): Promise<void>;

    /** Show the support chat widget */
    show(): void;

    /** Hide the support chat widget */
    hide(): void;

    /** Set user info for the support session */
    setUser(userId: string, email: string, name: string): void;
}

/** Abstract marketing provider */
export interface IMarketingProvider {
    /** Initialize the marketing SDK */
    initialize(): Promise<void>;

    /** Subscribe email to a list/form */
    subscribe(email: string, firstName?: string): Promise<ApiResponse<void>>;

    /** Tag a subscriber */
    tagSubscriber(email: string, tagId: string): Promise<ApiResponse<void>>;
}
