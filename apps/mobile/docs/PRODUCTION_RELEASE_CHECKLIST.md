# Corre Mobile Production Release Checklist

## Commands

- Run configuration and secrets preflight:
  - `npm run preflight:mobile`
- Run mobile quality gate:
  - `npm run release:mobile`

## Required Environment Variables

### Mobile runtime (EAS env / `.env`)

- `EXPO_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`)
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (or `STRIPE_PUBLISHABLE_KEY`)
- `EXPO_PUBLIC_STRAVA_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_PASSWORD_RESET_URL`
- `EXPO_PUBLIC_APP_ENV=production` (or `APP_ENV=production`)

### Supabase Edge Functions secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_VERIFY_TOKEN`

## Configuration checks

- App scheme is `corre`
- Stripe redirects use `corre://stripe-callback`
- Strava redirects use `corre://strava-auth`
- iOS permission strings include camera, location, and photo library descriptions
- Android release build is `app-bundle`
- Dangerous Android permissions are blocked/removed:
  - `SYSTEM_ALERT_WINDOW`
  - `WRITE_EXTERNAL_STORAGE`
  - `RECORD_AUDIO`

## Store submission checks (manual)

- App Store Connect:
  - App metadata and localized descriptions
  - Screenshots for required device sizes
  - Support URL and Privacy Policy URL
  - In-app purchases/subscriptions metadata complete
- Google Play:
  - Store listing, screenshots, and feature graphic
  - Data Safety form completed accurately
  - Content rating questionnaire completed
  - Privacy Policy URL set

