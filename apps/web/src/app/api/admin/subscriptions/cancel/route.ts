import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase service configuration');
    }
    return createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function POST(request: Request) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: actor, error: actorError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (actorError) {
            return NextResponse.json({ error: actorError.message }, { status: 500 });
        }

        if (!actor || actor.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json() as { subscriptionId?: string };
        const subscriptionId = (body.subscriptionId || '').trim();
        if (!subscriptionId) {
            return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
        }

        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
        }

        const adminClient = getServiceClient();
        const { data: sub, error: subError } = await adminClient
            .from('subscriptions')
            .select('id, stripe_subscription_id, cancel_at_period_end, status')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

        if (subError) {
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }
        if (!sub) {
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        if (sub.cancel_at_period_end) {
            return NextResponse.json({
                success: true,
                alreadyCanceled: true,
                status: sub.status,
            });
        }

        const params = new URLSearchParams();
        params.set('cancel_at_period_end', 'true');

        const stripeRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${stripeSecretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            }
        );

        if (!stripeRes.ok) {
            const text = await stripeRes.text();
            return NextResponse.json(
                { error: 'Stripe request failed', details: text },
                { status: 502 }
            );
        }

        const stripeJson = await stripeRes.json() as { status?: string; cancel_at_period_end?: boolean };
        const nextStatus = stripeJson.status || sub.status;

        const { error: updateError } = await adminClient
            .from('subscriptions')
            .update({
                cancel_at_period_end: stripeJson.cancel_at_period_end ?? true,
                status: nextStatus,
                updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            status: nextStatus,
            cancel_at_period_end: stripeJson.cancel_at_period_end ?? true,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
