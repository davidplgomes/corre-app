// Edge Function to release marketplace funds to the seller (Escrow unlock)
// Deploy: `supabase functions deploy release-marketplace-funds`

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

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
    const { order_id } = await req.json();
    if (!order_id) throw new Error('Missing order_id');

    // Setup Stripe and Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });

    // Auth Check (Only the buyer or an admin can release the funds)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    // We will allow the request if it's the valid buyer OR if it's the service_role key (e.g., from a CRON job later)
    const isServiceRole = authHeader.replace('Bearer ', '') === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (authError && !isServiceRole) throw new Error('Unauthorized');
    if (!user && !isServiceRole) throw new Error('Unauthorized');

    // Get Order and verify status
    const { data: order, error: orderError } = await supabase
      .from('marketplace_orders')
      .select(`
                id, 
                buyer_id, 
                seller_id, 
                seller_amount_cents, 
                status,
                listing:listing_id (id),
                seller_account:seller_accounts!seller_id(stripe_account_id)
            `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) throw new Error('Order not found or invalid');

    if (!isServiceRole && order.buyer_id !== user?.id) {
      throw new Error('Only the buyer can release the funds for this order');
    }

    if (order.status !== 'shipped' && order.status !== 'paid') {
      throw new Error(`Cannot release funds for an order with status: ${order.status}`);
    }

    // Check if destination account is properly set
    if (!order.seller_account || !order.seller_account.stripe_account_id) {
      throw new Error("Seller doesn't have a valid Stripe Connect account");
    }

    // Transfer funds via Stripe Transfer Group
    const transfer = await stripe.transfers.create({
      amount: order.seller_amount_cents,
      currency: 'eur',
      destination: order.seller_account.stripe_account_id,
      transfer_group: `order_${order.id}`,
      description: `Escrow release for order ${order.id}`
    });

    // Update database statuses
    await supabase
      .from('marketplace_orders')
      .update({ status: 'completed' })
      .eq('id', order.id);

    return new Response(JSON.stringify({ success: true, transfer_id: transfer.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: any) {
    console.error('Error releasing funds:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
