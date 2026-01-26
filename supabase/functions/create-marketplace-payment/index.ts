// Edge Function to create Payment Intent for Marketplace Orders
// Deploy: `supabase functions deploy create-marketplace-payment`

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno'

console.log("Marketplace Payment Function Up!")

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        const { listing_id } = await req.json();

        // Auth Check
        const authHeader = req.headers.get('Authorization')!;
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new Error('Unauthorized');

        // Get Listing
        const { data: listing, error: listingError } = await supabase
            .from('marketplace_listings')
            .select(`
            id, 
            price_cents, 
            status, 
            title, 
            seller:seller_id(id, full_name), 
            seller_account:seller_accounts!inner(stripe_account_id, charges_enabled)
        `)
            .eq('id', listing_id)
            .single();

        if (listingError || !listing) throw new Error('Listing not found');
        if (listing.status !== 'active') throw new Error('Listing is no longer active');

        // Check if seller can receive payments
        if (!listing.seller_account.charges_enabled) {
            throw new Error('Seller is not ready to receive payments yet');
        }

        // prevent buying own item
        if (listing.seller.id === user.id) {
            throw new Error('You cannot buy your own item');
        }

        // Init Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
            apiVersion: '2023-10-16',
        });

        // Calculate Fees (Platform Fee 5%)
        const amount = listing.price_cents;
        const application_fee_amount = Math.round(amount * 0.05);

        // Create Payment Intent with Destination Charge (Direct Charge logic also possible, but Destination is safer for platform liability)
        // Using `transfer_data` creates a Direct Charge on the Connected Account? No, that's `on_behalf_of`.
        // Let's use separate charges and transfers or destination charges.
        // Destination Charge: Charge on Platform, transfer remainder to Connect. Best for C2C.

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'brl',
            automatic_payment_methods: { enabled: true },
            application_fee_amount: application_fee_amount,
            transfer_data: {
                destination: listing.seller_account.stripe_account_id,
            },
            metadata: {
                listing_id: listing.id,
                buyer_id: user.id,
                seller_id: listing.seller.id,
                type: 'marketplace_order'
            },
        });

        // Create Order Record (Pending)
        const { error: orderError } = await supabase.from('marketplace_orders').insert({
            listing_id: listing.id,
            buyer_id: user.id,
            seller_id: listing.seller.id,
            amount_cents: amount,
            platform_fee_cents: application_fee_amount,
            seller_amount_cents: amount - application_fee_amount,
            stripe_payment_intent_id: paymentIntent.id,
            status: 'pending'
        });

        if (orderError) console.error('Error creating order record:', orderError);

        return new Response(JSON.stringify({
            clientSecret: paymentIntent.client_secret,
            publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY')
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error: any) {
        console.error('Error in create-payment:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
