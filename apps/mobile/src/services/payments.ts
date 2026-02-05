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
        // Note: In a real implementation, you would use:
        // import { initStripe } from '@stripe/stripe-react-native';
        // await initStripe({ publishableKey: STRIPE_PUBLISHABLE_KEY });

        console.log('Stripe initialized (stub)');
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
        // In production, this would call a Supabase Edge Function that checks Stripe
        const { data: user, error } = await supabase
            .from('users')
            .select('membership_tier, xp_level')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Calculate renewal discount based on XP level
        const discountMap: Record<string, number> = {
            starter: 0,
            pacer: 5,
            elite: 10,
        };

        const tier = user?.membership_tier || 'free';
        const level = user?.xp_level || 'starter';

        return {
            isActive: tier !== 'free',
            plan: tier === 'basico' ? 'pro' : tier === 'baixa_pace' ? 'club' : 'free',
            currentPeriodEnd: null, // Would come from Stripe in production
            cancelAtPeriodEnd: false,
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
): Promise<{ success: boolean; error?: string }> {
    try {
        // In production, this calls a Supabase Edge Function:
        // const { data, error } = await supabase.functions.invoke('create-subscription', {
        //   body: { userId, priceId: SUBSCRIPTION_PLANS[planKey] }
        // });

        // For now, simulate the subscription process
        console.log(`Creating subscription checkout for plan: ${planKey}`);

        // Update user's membership tier (in production, this happens via webhook)
        const tierMap = { pro: 'basico', club: 'baixa_pace' };
        const { error: updateError } = await supabase
            .from('users')
            .update({ membership_tier: tierMap[planKey] })
            .eq('id', userId);

        if (updateError) throw updateError;

        // In production with real Stripe:
        // 1. Create Stripe Customer if not exists
        // 2. Create Subscription with the price ID
        // 3. Return client secret for payment confirmation
        // 4. Handle payment in the app using @stripe/stripe-react-native

        Alert.alert(
            'Subscription Updated',
            `You are now subscribed to Corre ${planKey.toUpperCase()}!`,
            [{ text: 'OK' }]
        );

        return { success: true };
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
export async function cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // In production, this calls a Supabase Edge Function:
        // const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        //   body: { userId }
        // });

        // For now, update tier to free
        const { error: updateError } = await supabase
            .from('users')
            .update({ membership_tier: 'free' })
            .eq('id', userId);

        if (updateError) throw updateError;

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
        // In production, this calls a Supabase Edge Function:
        // const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        //   body: { userId, amount, pointsToUse }
        // });

        // For now, return mock payment intent
        console.log(`Creating payment intent: €${amount / 100}, using ${pointsToUse} points`);

        return {
            id: `pi_mock_${Date.now()}`,
            clientSecret: `pi_mock_${Date.now()}_secret_mock`,
            amount: amount - pointsToUse, // Points reduce the cash amount
            currency: 'eur',
        };
    } catch (error) {
        console.error('Create payment intent error:', error);
        return null;
    }
}

/**
 * Confirm payment (for marketplace/shop purchases)
 */
export async function confirmPayment(
    paymentIntentId: string,
    userId: string,
    orderId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // In production, use @stripe/stripe-react-native:
        // const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });

        // Update order status
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'paid',
                stripe_payment_intent_id: paymentIntentId
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
