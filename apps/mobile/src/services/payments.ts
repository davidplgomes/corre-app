// Stripe Payment Service for Corre App
// Handles subscription management and one-time payments
import { Alert } from 'react-native';
import { supabase } from './supabase/client';

// Stripe configuration
// In production, these would come from environment variables
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

// Subscription plan IDs (these should match your Stripe product/price IDs)
export const SUBSCRIPTION_PLANS = {
    free: null,
    pro: 'price_corre_pro_monthly',
    club: 'price_corre_club_monthly',
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export interface SubscriptionStatus {
    isActive: boolean;
    plan: SubscriptionPlanKey;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    renewalDiscount: number;
}

export interface PaymentIntent {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
}

/**
 * Initialize Stripe SDK
 * Should be called at app startup
 */
export async function initializeStripe(): Promise<boolean> {
    try {
        // Note: The actual initStripe call happens in App.tsx or a provider
        // import { initStripe } from '@stripe/stripe-react-native';
        // await initStripe({ publishableKey: STRIPE_PUBLISHABLE_KEY });
        console.log('Stripe initialized via Provider');
        return true;
    } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        return false;
    }
}

/**
 * Get current subscription status for user
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        // Also get user level for discount
        const { data: user } = await supabase
            .from('users')
            .select('xp_level')
            .eq('id', userId)
            .single();

        // Calculate renewal discount based on XP level
        const discountMap: Record<string, number> = {
            starter: 0,
            pacer: 5,
            elite: 10,
        };
        const level = user?.xp_level || 'starter';

        // Map plan_id to internal key
        let plan: SubscriptionPlanKey = 'free';
        if (subscription?.plan_id === SUBSCRIPTION_PLANS.pro) plan = 'pro';
        if (subscription?.plan_id === SUBSCRIPTION_PLANS.club) plan = 'club';

        return {
            isActive: !!subscription && (subscription.status === 'active' || subscription.status === 'trialing'),
            plan,
            currentPeriodEnd: subscription?.current_period_end || null,
            cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
            renewalDiscount: discountMap[level] || 0,
        };
    } catch (error) {
        console.error('Error getting subscription status:', error);
        return {
            isActive: false,
            plan: 'free',
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            renewalDiscount: 0,
        };
    }
}

/**
 * Create a subscription checkout session
 * Returns the payment sheet parameters
 */
export async function createSubscriptionCheckout(
    userId: string,
    planKey: 'pro' | 'club'
): Promise<{ success: boolean; subscriptionId?: string; clientSecret?: string; error?: string }> {
    try {
        console.log(`Creating subscription checkout for plan: ${planKey}`);

        const priceId = SUBSCRIPTION_PLANS[planKey];
        if (!priceId) throw new Error('Invalid plan selected');

        const { data, error } = await supabase.functions.invoke('stripe-create-subscription', {
            body: { priceId }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        return {
            success: true,
            subscriptionId: data.subscriptionId,
            clientSecret: data.clientSecret
        };
    } catch (error: any) {
        console.error('Subscription checkout error:', error);
        return {
            success: false,
            error: error.message || 'Failed to process subscription'
        };
    }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string, subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('stripe-create-subscription', {
            body: { action: 'cancel', subscriptionId }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        return { success: true };
    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return {
            success: false,
            error: error.message || 'Failed to cancel subscription'
        };
    }
}

/**
 * Create payment intent for one-time purchase (marketplace/shop)
 */
export async function createPaymentIntent(
    userId: string,
    amount: number, // in cents
    pointsToUse: number = 0
): Promise<PaymentIntent | null> {
    try {
        const finalAmount = Math.max(50, amount - pointsToUse); // Minimum Stripe charge is usually 50 cents

        console.log(`Creating payment intent for user ${userId}: €${finalAmount / 100} (Points used: ${pointsToUse})`);

        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
                amount: finalAmount,
                currency: 'eur',
                metadata: {
                    user_id: userId,
                    type: 'shop_order',
                    points_used: pointsToUse
                }
            }
        });

        if (error) {
            console.error('Edge function error:', error);
            throw error;
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        return {
            id: data.id,
            clientSecret: data.clientSecret,
            amount: data.amount,
            currency: data.currency,
        };
    } catch (error) {
        console.error('Create payment intent error:', error);
        return null;
    }
}

/**
 * Confirm payment (for marketplace/shop purchases)
 *
 * IMPORTANT: This function DOES NOT mark the order as paid.
 * It only stores the payment intent ID. The Stripe webhook will
 * update the order status to 'paid' after payment succeeds.
 */
export async function confirmPayment(
    paymentIntentId: string,
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Store payment intent ID only - webhook will update status
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                stripe_payment_intent_id: paymentIntentId
                // DO NOT set status here - webhook handles it
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        return { success: true };
    } catch (error: any) {
        console.error('Confirm payment error:', error);
        return {
            success: false,
            error: error.message || 'Payment confirmation failed'
        };
    }
}

/**
 * Get saved payment methods
 */
export async function getSavedPaymentMethods(userId: string): Promise<any[]> {
    try {
        // In production, this would fetch from Stripe via Edge Function
        return [];
    } catch (error) {
        console.error('Get payment methods error:', error);
        return [];
    }
}

/**
 * Calculate maximum points that can be used for purchase
 * Pro and Club can use up to 20% of item value
 */
export function calculateMaxPointsDiscount(
    totalAmount: number,
    userTier: string,
    availablePoints: number
): number {
    // Free users cannot use points
    if (userTier === 'free') {
        return 0;
    }

    // Pro and Club can use up to 20% of the value
    const maxPointsPercent = Math.floor(totalAmount * 0.20);

    // Return the lesser of max allowed and available points
    return Math.min(maxPointsPercent, availablePoints);
}
