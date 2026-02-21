import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

/**
 * Stripe Sync Products Edge Function
 *
 * Fetches active subscription products and prices from Stripe
 * Returns formatted data for display in the mobile app.
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
            apiVersion: "2023-10-16",
        });

        // Fetch all active products with their default price
        const products = await stripe.products.list({
            active: true,
            expand: ['data.default_price'],
        });

        // Filter to subscription products only and format for display
        const subscriptionProducts = products.data
            .filter((product) => {
                const price = product.default_price as Stripe.Price | null;
                return price && price.type === 'recurring';
            })
            .map((product) => {
                const price = product.default_price as Stripe.Price;

                // Parse features from metadata or use defaults
                const features = product.metadata?.features
                    ? product.metadata.features.split(',').map(f => f.trim())
                    : getDefaultFeatures(product.name);

                return {
                    productId: product.id,
                    priceId: price.id,
                    name: product.name,
                    description: product.description || '',
                    amount: price.unit_amount || 0,
                    currency: price.currency,
                    interval: price.recurring?.interval || 'month',
                    features: features,
                    metadata: product.metadata || {},
                };
            })
            // Sort by price (lowest first)
            .sort((a, b) => a.amount - b.amount);

        return new Response(
            JSON.stringify(subscriptionProducts),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (error: any) {
        console.error('Error fetching products:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to fetch products' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});

/**
 * Provide default features based on plan name if not in metadata
 */
function getDefaultFeatures(planName: string): string[] {
    const name = planName.toLowerCase();

    if (name.includes('club') || name.includes('premium')) {
        return [
            'All Pro features',
            'Exclusive club events',
            'Priority support',
            'Custom training plans',
            'Club merchandise discounts'
        ];
    }

    if (name.includes('pro')) {
        return [
            'Unlimited events',
            'Advanced statistics',
            'Use points for discounts',
            'Early event access',
            'Ad-free experience'
        ];
    }

    return ['Basic features'];
}
