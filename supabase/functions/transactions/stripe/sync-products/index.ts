import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Sync Products Edge Function
 * 
 * Fetches all active products and their prices from Stripe.
 * Called by the Subscriptions page to dynamically display available plans.
 * 
 * Returns: StripeProductDisplay[]
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
});

Deno.serve(async (req: Request) => {
    try {
        // Verify JWT (user must be authenticated)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Fetch active products with prices
        const products = await stripe.products.list({
            active: true,
            expand: ["data.default_price"],
        });

        const displayProducts = products.data
            .filter((product) => product.default_price && typeof product.default_price !== "string")
            .map((product) => {
                const price = product.default_price as Stripe.Price;
                return {
                    productId: product.id,
                    priceId: price.id,
                    name: product.name,
                    description: product.description,
                    amount: price.unit_amount || 0,
                    currency: price.currency,
                    interval: price.recurring?.interval || "month",
                    features: product.features?.map((f) => f.name || "") || [],
                    metadata: product.metadata,
                };
            })
            .sort((a, b) => a.amount - b.amount);

        return new Response(JSON.stringify(displayProducts), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Sync products error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
