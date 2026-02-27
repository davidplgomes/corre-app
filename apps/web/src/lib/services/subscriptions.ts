import { createClient } from '@/lib/supabase';
import type { Subscription } from '@/types';

/**
 * Get all subscriptions (admin only)
 */
export async function getAllSubscriptions(): Promise<Subscription[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get a single user's active subscription
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Cancel a subscription (sets cancel_at_period_end = true via edge function)
 */
export async function cancelSubscription(stripeSubscriptionId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.functions.invoke('stripe-create-subscription', {
        body: { action: 'cancel', subscriptionId: stripeSubscriptionId },
    });
    if (error) throw error;
}

/**
 * Get subscription revenue stats for a time period
 */
export async function getSubscriptionStats(since: Date) {
    const supabase = createClient();

    const [subsResult, txnsResult] = await Promise.all([
        supabase
            .from('subscriptions')
            .select('status, cancel_at_period_end'),
        supabase
            .from('transactions')
            .select('amount')
            .eq('status', 'succeeded')
            .gte('created_at', since.toISOString()),
    ]);

    const subs = subsResult.data || [];
    const txns = txnsResult.data || [];

    const activeCount = subs.filter(s => s.status === 'active' || s.status === 'trialing').length;
    const canceledCount = subs.filter(s =>
        s.status === 'canceled' || s.cancel_at_period_end
    ).length;

    const revenue = txns.reduce((acc, t) => acc + (Number(t.amount) || 0), 0) / 100;

    return { activeCount, canceledCount, revenue };
}
