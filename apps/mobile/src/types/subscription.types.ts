/**
 * Subscription & Payment Types
 * Types for Stripe integration, abstracted behind provider interfaces.
 */

/** Current subscription info synced from Stripe */
export interface SubscriptionInfo {
    id: string;
    userId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    planId: string;
    planName: string;
    status: SubscriptionStatus;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
}

export type SubscriptionStatus =
    | 'active'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'past_due'
    | 'trialing'
    | 'unpaid'
    | 'free';

export type PlanType = 'free' | 'pro' | 'club';

/** Transaction record */
export interface TransactionRecord {
    id: string;
    userId: string;
    subscriptionId: string | null;
    stripePaymentIntentId: string | null;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed' | 'refunded';
    description: string | null;
    metadata: Record<string, string>;
    createdAt: string;
}

/** Create subscription request to edge function */
export interface CreateSubscriptionRequest {
    priceId: string;
}

/** Stripe product with price for display */
export interface StripeProductDisplay {
    productId: string;
    priceId: string;
    name: string;
    description: string | null;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    metadata: Record<string, string>;
}
