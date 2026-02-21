/**
 * Subscriptions API Endpoints
 * RESTful subscription operations. Talks to Stripe via edge functions.
 */

import { apiClient } from '../ApiClient';
import { logger } from '../../services/logging/Logger';
import { ApiResponse } from '../../types/api.types';
import { SubscriptionInfo, TransactionRecord, StripeProductDisplay, CreateSubscriptionRequest } from '../../types/subscription.types';

class SubscriptionsApiClass {
    private static instance: SubscriptionsApiClass;

    private constructor() { }

    static getInstance(): SubscriptionsApiClass {
        if (!SubscriptionsApiClass.instance) {
            SubscriptionsApiClass.instance = new SubscriptionsApiClass();
        }
        return SubscriptionsApiClass.instance;
    }

    /** Get available subscription products from Stripe */
    async getProducts(): Promise<ApiResponse<StripeProductDisplay[]>> {
        logger.info('SUBSCRIPTION', 'Fetching available products');

        return apiClient.invokeFunction<StripeProductDisplay[]>(
            'stripe-sync-products'
        );
    }

    /** Get current subscription for user */
    async getCurrentSubscription(userId: string): Promise<ApiResponse<SubscriptionInfo | null>> {
        logger.debug('SUBSCRIPTION', `Getting subscription for user: ${userId}`);

        return apiClient.query<SubscriptionInfo | null>('subscriptions.getCurrent', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) return { data: null, error };

            if (!data) {
                return { data: null, error: null };
            }

            // Map snake_case to camelCase
            const subscription: SubscriptionInfo = {
                id: data.id,
                userId: data.user_id,
                stripeCustomerId: data.stripe_customer_id,
                stripeSubscriptionId: data.stripe_subscription_id,
                planId: data.plan_id,
                planName: data.plan_name,
                status: data.status,
                currentPeriodStart: data.current_period_start,
                currentPeriodEnd: data.current_period_end,
                cancelAtPeriodEnd: data.cancel_at_period_end,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };

            return { data: subscription, error: null };
        });
    }

    /** Create a new subscription via Stripe edge function */
    async createSubscription(request: CreateSubscriptionRequest): Promise<ApiResponse<{ subscriptionId: string; clientSecret?: string }>> {
        logger.info('SUBSCRIPTION', 'Creating subscription', { priceId: request.priceId });

        return apiClient.invokeFunction<{ subscriptionId: string; clientSecret?: string }>(
            'stripe-create-subscription',
            { priceId: request.priceId }
        );
    }

    /** Cancel the current subscription */
    async cancelSubscription(subscriptionId: string): Promise<ApiResponse<void>> {
        logger.info('SUBSCRIPTION', `Cancelling subscription: ${subscriptionId}`);

        return apiClient.invokeFunction<void>(
            'stripe-create-subscription',
            { action: 'cancel', subscriptionId }
        );
    }

    /** Get transaction history for user */
    async getTransactions(userId: string): Promise<ApiResponse<TransactionRecord[]>> {
        logger.debug('SUBSCRIPTION', `Getting transactions for user: ${userId}`);

        return apiClient.query<TransactionRecord[]>('subscriptions.getTransactions', async () => {
            const supabase = apiClient.getSupabaseClient();
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error };

            const transactions: TransactionRecord[] = (data || []).map((t: Record<string, unknown>) => ({
                id: t.id as string,
                userId: t.user_id as string,
                subscriptionId: t.subscription_id as string | null,
                stripePaymentIntentId: t.stripe_payment_intent_id as string | null,
                amount: t.amount as number,
                currency: t.currency as string,
                status: t.status as TransactionRecord['status'],
                description: t.description as string | null,
                metadata: (t.metadata as Record<string, string>) || {},
                createdAt: t.created_at as string,
            }));

            return { data: transactions, error: null };
        });
    }
}

export const SubscriptionsApi = SubscriptionsApiClass.getInstance();
