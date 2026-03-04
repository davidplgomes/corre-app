import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

type CartRow = {
  item_id: string;
  item_type: "shop" | "marketplace";
  quantity: number;
};

type ShopItemRow = {
  id: string;
  title: string;
  price_cents: number | null;
  points_price: number | null;
  stock: number | null;
  is_active: boolean | null;
  allow_points_discount: boolean | null;
  max_points_discount_percent: number | null;
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

const toPriceCents = (item: ShopItemRow): number => {
  if (typeof item.price_cents === "number" && Number.isFinite(item.price_cents)) {
    return Math.max(0, Math.round(item.price_cents));
  }
  if (typeof item.points_price === "number" && Number.isFinite(item.points_price)) {
    return Math.max(0, Math.round(item.points_price));
  }
  return 0;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let orderIdForRollback: string | null = null;
  let consumedPoints = 0;

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
    const requestedPoints = Math.max(0, Math.floor(Number(body?.points_to_use) || 0));

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      return new Response(JSON.stringify({ error: "Could not load user profile." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { data: cartRows, error: cartError } = await supabase
      .from("cart_items")
      .select("item_id, item_type, quantity")
      .eq("user_id", user.id);

    if (cartError) {
      return new Response(JSON.stringify({ error: "Failed to read cart." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const normalizedCart = (cartRows || []) as CartRow[];
    if (!normalizedCart.length) {
      return new Response(JSON.stringify({ error: "Your cart is empty." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const hasMarketplaceItems = normalizedCart.some((row) => row.item_type !== "shop");
    if (hasMarketplaceItems) {
      return new Response(
        JSON.stringify({
          error:
            "Marketplace items must be purchased from the listing screen. Remove them from cart before checkout.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const itemIds = [...new Set(normalizedCart.map((row) => row.item_id))];
    const { data: itemRows, error: itemError } = await supabase
      .from("corre_shop_items")
      .select(
        "id, title, price_cents, points_price, stock, is_active, allow_points_discount, max_points_discount_percent"
      )
      .in("id", itemIds);

    if (itemError) {
      return new Response(JSON.stringify({ error: "Failed to read shop items." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const itemsById = new Map((itemRows as ShopItemRow[]).map((row) => [row.id, row]));

    let subtotalCents = 0;
    let itemMaxPointsDiscount = 0;
    const orderItems: Array<{ item_type: "shop"; item_id: string; quantity: number; unit_price: number }> = [];

    for (const cartRow of normalizedCart) {
      const item = itemsById.get(cartRow.item_id);
      if (!item) {
        return new Response(JSON.stringify({ error: "Some cart items are no longer available." }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      if (item.is_active === false) {
        return new Response(JSON.stringify({ error: `${item.title} is no longer active.` }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const quantity = Math.max(1, Math.floor(Number(cartRow.quantity) || 1));
      const stock = typeof item.stock === "number" ? item.stock : 0;
      if (stock < quantity) {
        return new Response(
          JSON.stringify({ error: `${item.title} only has ${stock} unit(s) available.` }),
          { status: 400, headers: corsHeaders }
        );
      }

      const unitPriceCents = toPriceCents(item);
      const lineSubtotal = unitPriceCents * quantity;
      subtotalCents += lineSubtotal;

      if (item.allow_points_discount !== false) {
        const maxPercent = Math.max(0, Math.min(100, Number(item.max_points_discount_percent ?? 20)));
        itemMaxPointsDiscount += Math.floor(lineSubtotal * (maxPercent / 100));
      }

      orderItems.push({
        item_type: "shop",
        item_id: item.id,
        quantity,
        unit_price: unitPriceCents / 100,
      });
    }

    if (subtotalCents <= 0) {
      return new Response(JSON.stringify({ error: "Cart total is invalid." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const minimumChargeCents = 50;
    if (subtotalCents < minimumChargeCents) {
      return new Response(
        JSON.stringify({
          error: "Minimum card charge is €0.50 after discount.",
          pointsApproved: 0,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Plans and points are decoupled: points discount cap applies independently of plan tier.
    const membershipCap = Math.floor(subtotalCents * 0.2);

    const { data: availablePointsRaw, error: pointsError } = await supabase.rpc("get_available_points", {
      p_user_id: user.id,
    });

    if (pointsError) {
      return new Response(JSON.stringify({ error: "Failed to load points balance." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const availablePoints = Math.max(0, Math.floor(Number(availablePointsRaw) || 0));
    const minimumChargeCap = Math.max(0, subtotalCents - minimumChargeCents);
    const maxAllowedPoints = Math.min(
      availablePoints,
      membershipCap,
      itemMaxPointsDiscount,
      minimumChargeCap
    );
    const approvedPoints = Math.min(requestedPoints, maxAllowedPoints);
    const cashAmountCents = subtotalCents - approvedPoints;

    if (cashAmountCents < minimumChargeCents) {
      return new Response(
        JSON.stringify({
          error: "Minimum card charge is €0.50 after discount.",
          pointsApproved: approvedPoints,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: subtotalCents / 100,
        points_used: approvedPoints,
        cash_amount: cashAmountCents / 100,
        status: "pending",
        shipping_address: null,
        customer_email: userRow.email || user.email || null,
      })
      .select("id")
      .single();

    if (orderError || !orderRow) {
      return new Response(JSON.stringify({ error: "Failed to create order." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    orderIdForRollback = orderRow.id;

    const { error: orderItemsError } = await supabase.from("order_items").insert(
      orderItems.map((orderItem) => ({
        order_id: orderRow.id,
        ...orderItem,
      }))
    );

    if (orderItemsError) {
      await supabase.from("orders").delete().eq("id", orderRow.id);
      return new Response(JSON.stringify({ error: "Failed to create order items." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (approvedPoints > 0) {
      const { data: consumeOk, error: consumeError } = await supabase.rpc("consume_points_fifo", {
        p_user_id: user.id,
        p_points_to_consume: approvedPoints,
      });

      if (consumeError || consumeOk !== true) {
        await supabase.from("orders").delete().eq("id", orderRow.id);
        return new Response(
          JSON.stringify({
            error: "Not enough points available anymore. Please refresh your cart and retry.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      consumedPoints = approvedPoints;

      await supabase
        .from("orders")
        .update({ points_consumed_at: new Date().toISOString() })
        .eq("id", orderRow.id);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: cashAmountCents,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "shop_order",
        user_id: user.id,
        order_id: orderRow.id,
        points_used: String(approvedPoints),
      },
    });

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        stripe_payment_intent_id: paymentIntent.id,
      })
      .eq("id", orderRow.id);

    if (updateOrderError) {
      throw new Error("Failed to persist payment intent on order.");
    }

    return new Response(
      JSON.stringify({
        orderId: orderRow.id,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        subtotalCents,
        pointsApproved: approvedPoints,
        cashAmountCents,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("create-shop-payment error:", error);

    // Best-effort rollback when order exists.
    if (orderIdForRollback) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        let pointsRefundedAt: string | null = null;
        const { data: rollbackOrder } = await supabase
          .from("orders")
          .select("user_id")
          .eq("id", orderIdForRollback)
          .single();

        if (consumedPoints > 0 && rollbackOrder?.user_id) {
          await supabase.rpc("add_points_with_ttl", {
            p_user_id: rollbackOrder.user_id,
            p_points: consumedPoints,
            p_source_type: "purchase_refund",
            p_source_id: orderIdForRollback,
            p_description: "Refund: checkout session initialization failed",
          });
          pointsRefundedAt = new Date().toISOString();
        }

        const failureReason = error instanceof Error ? error.message : "Checkout session initialization failed";
        await supabase
          .from("orders")
          .update({
            status: "payment_failed",
            failure_reason: failureReason,
            ...(pointsRefundedAt ? { points_refunded_at: pointsRefundedAt } : {}),
          })
          .eq("id", orderIdForRollback);
      } catch (rollbackError) {
        console.error("create-shop-payment rollback error:", rollbackError);
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create payment session.",
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});
