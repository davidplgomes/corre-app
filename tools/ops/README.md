# Supabase + Stripe Ops

Operational scripts to manage Supabase and Stripe from this repository.

## Quick start

1. Authenticate CLIs:
   - `supabase login`
   - `stripe login`
2. Verify tools:
   - `npm run ops:check`
3. Link Supabase project:
   - `npm run supabase:link`
4. Sync secrets from `.env` to Supabase:
   - `npm run supabase:secrets:sync`
5. Deploy edge functions:
   - `npm run supabase:functions:deploy`

The Stripe scripts use `STRIPE_API_KEY` if set; otherwise they fall back to `STRIPE_SECRET_KEY` from `.env`.
The Supabase scripts can run non-interactively if `SUPABASE_ACCESS_TOKEN` is present in `.env`.
If not present, they also try `.mcp.json` at `mcpServers.supabase.headers.Authorization`.

## Stripe webhook integration

### Provision hosted webhook endpoints (recommended for production)

- `npm run stripe:webhooks:provision`

Notes:
- Creates platform and Connect webhook endpoints for:
  - `${SUPABASE_URL}/functions/v1/stripe-webhook`
  - `${SUPABASE_URL}/functions/v1/stripe-connect-webhook`
- If new secrets are generated, script prints them once and tries to push them to linked Supabase project.
- To force endpoint recreation and secret rotation:
  - `npm run stripe:webhooks:provision:force`
- Force mode removes existing endpoints for those same URLs first, then recreates one clean endpoint per URL.

### Live listen/forward from Stripe CLI

- Forward to deployed Supabase functions:
  - `npm run stripe:webhooks:listen`
- Forward to local Supabase functions (`supabase start` + `supabase functions serve ...`):
  - `npm run stripe:webhooks:listen:local`

### Trigger test events

- `npm run stripe:webhooks:trigger -- payment_intent.succeeded`
- `npm run stripe:webhooks:trigger -- customer.subscription.updated`
- `npm run stripe:webhooks:trigger -- account.updated`

## Supabase function deploy behavior

`npm run supabase:functions:deploy` deploys with two modes:

- Public callbacks/webhooks (`--no-verify-jwt`):
  - `stripe-webhook`
  - `stripe-connect-webhook`
  - `strava-webhook`
  - `strava-auth`
- Protected functions (JWT required):
  - `stripe-create-subscription`
  - `create-payment-intent`
  - `create-marketplace-payment`
  - `stripe-connect-onboarding`
  - `release-marketplace-funds`
  - `send-guest-pass-email`
  - `stripe-sync-products`

## Supabase secret sync behavior

`npm run supabase:secrets:sync` syncs non-reserved secrets required by Stripe/Strava functions.
Supabase reserved variables like `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not pushed by this script.
