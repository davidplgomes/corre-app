import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

type OrderRow = {
  id: string;
  user_id: string | null;
  status: string;
  stripe_payment_intent_id: string | null;
  points_used: number | null;
  points_consumed_at: string | null;
  points_refunded_at: string | null;
  created_at: string;
};

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

const refundPointsIfNeeded = async (
  supabase: ReturnType<typeof createClient>,
  order: OrderRow,
  reason: string
): Promise<boolean> => {
  const pointsUsed = Number(order.points_used || 0);
  if (!order.user_id || pointsUsed <= 0) return false;
  if (!order.points_consumed_at) return false;
  if (order.points_refunded_at) return false;

  const { error: refundError } = await supabase.rpc("add_points_with_ttl", {
    p_user_id: order.user_id,
    p_points: pointsUsed,
    p_source_type: "purchase_refund",
    p_source_id: order.id,
    p_description: `Refund: ${reason}`,
  });

  if (refundError) {
    console.error(`Failed to refund points for order ${order.id}:`, refundError);
    return false;
  }

  const { error: markRefundedError } = await supabase
    .from("orders")
    .update({ points_refunded_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("points_refunded_at", null);

  if (markRefundedError) {
    console.error(`Failed to mark points_refunded_at for order ${order.id}:`, markRefundedError);
    return false;
  }

  return true;
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

    const body = await req.json().catch(() => ({}));
    const requestedMaxAge = Number(body?.max_age_minutes);
    const maxAgeMinutes = Number.isFinite(requestedMaxAge)
      ? Math.max(5, Math.min(24 * 60, Math.floor(requestedMaxAge)))
      : 20;

    const cutoffIso = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

    const { data: staleOrders, error: staleOrdersError } = await supabase
      .from("orders")
      .select(
        "id, user_id, status, stripe_payment_intent_id, points_used, points_consumed_at, points_refunded_at, created_at"
      )
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .limit(30);

    if (staleOrdersError) {
      return new Response(JSON.stringify({ error: "Failed to load stale orders." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const orders = (staleOrders || []) as OrderRow[];

    let checked = 0;
    let markedPaid = 0;
    let markedProcessing = 0;
    let markedFailed = 0;
    let pointsRefunded = 0;

    for (const order of orders) {
      checked += 1;

      if (!order.stripe_payment_intent_id) {
        const refunded = await refundPointsIfNeeded(supabase, order, "No payment intent found");
        await supabase
          .from("orders")
          .update({
            status: "payment_failed",
            failure_reason: "No payment intent found for stale pending order",
          })
          .eq("id", order.id);

        markedFailed += 1;
        if (refunded) pointsRefunded += 1;
        continue;
      }

      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);

        if (pi.status === "succeeded") {
          await supabase
            .from("orders")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", order.id);
          markedPaid += 1;
          continue;
        }

        if (pi.status === "processing" || pi.status === "requires_capture") {
          await supabase
            .from("orders")
            .update({ status: "processing" })
            .eq("id", order.id);
          markedProcessing += 1;
          continue;
        }

        if (
          pi.status === "requires_payment_method" ||
          pi.status === "requires_action" ||
          pi.status === "canceled"
        ) {
          const refunded = await refundPointsIfNeeded(
            supabase,
            order,
            `Stale pending order (${pi.status})`
          );

          await supabase
            .from("orders")
            .update({
              status: "payment_failed",
              failure_reason: `Payment intent status: ${pi.status}`,
            })
            .eq("id", order.id);

          markedFailed += 1;
          if (refunded) pointsRefunded += 1;
        }
      } catch (stripeError) {
        console.warn(`Could not inspect payment intent for order ${order.id}:`, stripeError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked,
        marked_paid: markedPaid,
        marked_processing: markedProcessing,
        marked_failed: markedFailed,
        points_refunded: pointsRefunded,
        max_age_minutes: maxAgeMinutes,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("reconcile-shop-orders error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to reconcile stale orders.",
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
