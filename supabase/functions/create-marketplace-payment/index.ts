// Edge Function to create Payment Intent for Marketplace Orders
// Deploy: `supabase functions deploy create-marketplace-payment`

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

console.log("Marketplace Payment Function Up!");

const PAID_TIERS = new Set(["pro", "club", "basico", "baixa_pace", "parceiros"]);

const isPaidMembershipTier = (tier?: string | null): boolean => {
    if (!tier) return false;
    return PAID_TIERS.has(String(tier).toLowerCase());
};

class HttpError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

Deno.serve(async (req: Request) => {
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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new HttpError(401, "Unauthorized");
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new HttpError(401, "Unauthorized");

        const { data: buyer, error: buyerError } = await supabase
            .from('users')
            .select('membership_tier')
            .eq('id', user.id)
            .single();

        if (buyerError || !buyer) {
            throw new HttpError(400, "Could not load buyer profile");
        }

        if (!isPaidMembershipTier(buyer.membership_tier)) {
            throw new HttpError(403, "Community marketplace purchases require a Pro or Club membership");
        }

        // Get Listing
        const { data: listing, error: listingError } = await supabase
            .from('marketplace_listings')
            .select(`
            id, 
            price_cents, 
            status, 
            title, 
            seller:seller_id(id, full_name, membership_tier), 
            seller_account:seller_accounts!inner(stripe_account_id, charges_enabled)
        `)
            .eq('id', listing_id)
            .single();

        if (listingError || !listing) throw new HttpError(404, 'Listing not found');
        if (listing.status !== 'active') throw new HttpError(400, 'Listing is no longer active');

        // Check if seller can receive payments
        if (!listing.seller_account.charges_enabled) {
            throw new HttpError(400, 'Seller is not ready to receive payments yet');
        }

        // prevent buying own item
        if (listing.seller.id === user.id) {
            throw new HttpError(400, 'You cannot buy your own item');
        }

        // Server-side block for non-paid sellers
        if (!isPaidMembershipTier(listing.seller.membership_tier)) {
            throw new HttpError(403, 'Seller must have an active Pro or Club membership to sell on the marketplace');
        }

        // Init Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
            apiVersion: '2023-10-16',
        });

        // Calculate Fees (Platform Fee 5%)
        const amount = listing.price_cents;
        const application_fee_amount = Math.round(amount * 0.05);

        // Create Payment Intent with Separate Charges (Escrow)
        // We hold the money in the Platform account and assign a transfer_group.
        // We will explicitly transfer the money via `stripe.transfers.create` later (when item is delivered).
        const orderId = crypto.randomUUID();

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // amount is in cents (e.g., 5000 = €50.00)
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            transfer_group: `order_${orderId}`,
            metadata: {
                order_id: orderId,
                listing_id: listing.id,
                buyer_id: user.id,
                seller_id: listing.seller.id,
                type: 'marketplace_order'
            },
        });

        // Create Order Record (Pending)
        const { error: orderError } = await supabase.from('marketplace_orders').insert({
            id: orderId,
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
        const status = error instanceof HttpError ? error.status : 400;
        return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
