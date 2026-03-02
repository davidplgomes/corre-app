import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, stripe_payment_intent_id, points_used, points_consumed_at, points_refunded_at"
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    if (["paid", "refunded", "ready_for_pickup", "picked_up", "shipped", "delivered"].includes(order.status)) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyFinalized: true,
          status: order.status,
        }),
        { headers: corsHeaders }
      );
    }

    if (order.stripe_payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        if (
          pi &&
          ["requires_payment_method", "requires_confirmation", "requires_action", "requires_capture"].includes(
            pi.status
          )
        ) {
          await stripe.paymentIntents.cancel(order.stripe_payment_intent_id);
        }
      } catch (stripeError) {
        console.warn(`Could not cancel payment intent for order ${order.id}:`, stripeError);
      }
    }

    let refundedPoints = false;
    const pointsUsed = Number(order.points_used || 0);
    if (
      pointsUsed > 0 &&
      order.user_id &&
      order.points_consumed_at &&
      !order.points_refunded_at
    ) {
      const { error: refundError } = await supabase.rpc("add_points_with_ttl", {
        p_user_id: order.user_id,
        p_points: pointsUsed,
        p_source_type: "purchase_refund",
        p_source_id: order.id,
        p_description: "Refund: checkout canceled by user",
      });

      if (refundError) {
        console.error(`Failed to refund points for canceled order ${order.id}:`, refundError);
      } else {
        refundedPoints = true;
      }
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "payment_failed",
        failure_reason: "Payment canceled by user",
        ...(refundedPoints ? { points_refunded_at: new Date().toISOString() } : {}),
      })
      .eq("id", order.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update canceled order state" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        refundedPoints,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("cancel-shop-payment error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to cancel checkout",
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
