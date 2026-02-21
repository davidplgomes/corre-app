# CORRE App - Comprehensive TODO List

> Last updated: 2026-02-20
> Full audit completed - 3 analysis agents used

---

## CRITICAL - Must Fix Before Production

### 1. Seller Onboarding Demo Mode
- **File**: `apps/mobile/src/screens/marketplace/SellerOnboarding.tsx` (Lines 34-94)
- **Issue**: Uses simulated Stripe accounts (`acct_simulated_*`) that can't process real payments
- **Fix**: Implement real Stripe Connect account creation flow
- **Impact**: Marketplace sellers cannot receive actual payments

### 2. Marketplace Image Storage
- **File**: `apps/mobile/src/screens/marketplace/CreateListing.tsx` (Line 112)
- **Issue**: Product images uploading to 'avatars' bucket instead of 'marketplace-images'
- **Comment in code**: "Using avatars bucket temporary if marketplace-images doesn't exist"
- **Fix**: Create proper storage bucket and update upload path
- **Impact**: Data contamination, potential security/privacy issues

### 3. Leaderboard Mock Data
- **File**: `apps/mobile/src/screens/leaderboard/Leaderboard.tsx` (Lines 25-35, 72-95)
- **Issue**: Hardcoded MOCK_LEADERBOARD with 8 fake users, falls back to mock on error
- **Fix**: Remove mock data, implement proper "no data" state
- **Impact**: Users see fictional leaderboard entries

### 4. No Network Retry Logic
- **Files**: `apps/mobile/src/api/ApiClient.ts` and all services
- **Issue**: All network requests fail immediately with no retry mechanism
- **Fix**: Add exponential backoff retry to ApiClient and critical RPC calls
- **Impact**: Poor UX on flaky connections, payment failures

### 5. Push Token Storage Not Implemented
- **File**: `apps/mobile/src/services/notifications.ts` (Lines 80-95)
- **Issue**: `savePushToken()` has empty `.update()` call - no actual data saved
- **Comment**: "You may need to add a push_token column to the users table"
- **Fix**: Create proper schema and implement token storage
- **Impact**: Push notifications won't work

---

## HIGH PRIORITY - Should Fix Soon

### Webhooks & Edge Functions

- [ ] **Create Stripe Connect Webhook** (`supabase/functions/stripe-connect-webhook/index.ts`)
  - Handle `account.updated` - seller account status changes
  - Handle `payout.paid` - notify sellers when paid
  - Handle `payout.failed` - alert on payout failures
  - Handle `transfer.created` - track marketplace transfers

- [ ] **Add Missing Stripe Events** to `supabase/functions/stripe-webhook/index.ts`
  - `charge.refunded` - track refunds, update order status
  - `charge.dispute.created` - alert on chargebacks
  - `customer.subscription.trial_will_end` - notify before trial ends

### Payment Functions

- [ ] **Stripe Initialization Stub** - `apps/mobile/src/services/payments.ts` (Line 38-49)
  - `initializeStripe()` returns hardcoded `true` - not implemented

- [ ] **Saved Payment Methods Not Implemented** - `apps/mobile/src/services/payments.ts` (Line 245-252)
  - `getSavedPaymentMethods()` always returns empty array `[]`

### Missing CRUD Operations

- [ ] **Marketplace** (`apps/mobile/src/services/supabase/marketplace.ts`)
  - `getListingById()` - needed by ListingDetails.tsx
  - `updateListing()` - sellers can't edit listings
  - `deleteListing()` - sellers can't remove listings
  - `getSellerListings()` - no way to fetch own listings
  - `searchListings()` - no search/filter capability

- [ ] **Runs** (`apps/mobile/src/services/supabase/runs.ts`)
  - `deleteRun()` - no way to remove a run
  - `updateRun()` - no editing capability

- [ ] **Events** (`apps/mobile/src/services/supabase/events.ts`)
  - `cancelEvent()` - organizers can't cancel events
  - `getEventsByOrganizer()` - no way to list owned events

### Error Handling Improvements

- [ ] **Silent Failures** - Multiple files catch errors but don't show user feedback:
  - `HomeScreen.tsx` (Line 148, 154) - plan/data loading errors logged only
  - `Settings.tsx` (Line 94, 110) - settings errors logged only
  - `EventDetail.tsx` (Lines 80-84) - event loading error no UI
  - `PostDetails.tsx` (Lines 46-67) - no error state UI
  - `RunTracker.tsx` (Line 96) - location error logged, no retry button

### Form Validation

- [ ] **CreateEvent.tsx** (Lines 43-50) - Missing validations:
  - Location coordinates are valid numbers
  - Date is not in the past
  - Description length limits
  - Location name required

- [ ] **CreateListing.tsx** (Lines 68-73) - Missing validations:
  - Price format validation
  - Title/description length limits

---

## MEDIUM PRIORITY

### Missing Context Providers

- [ ] **PushNotificationContext** - notification state scattered, should be centralized
- [ ] **StravaConnectionContext** - connection state spread across calls
- [ ] **SubscriptionContext** - screens fetch subscription status independently
- [ ] **WalletContext** - points/balance fetched separately by each screen

### Inconsistent Patterns

- [ ] **Error Handling** - 6 different patterns across services:
  | File | Pattern |
  |------|---------|
  | wallet.ts | Throws errors |
  | coupons.ts | Returns `{success, error}` |
  | referrals.ts | Returns `{success, message}` |
  | checkins.ts | Returns `{success, error, data}` |
  - **Fix**: Standardize to single pattern

- [ ] **Duplicate Functions** - remove duplication:
  - `formatPace()` in both `runs.ts` (Line 235) and `strava.ts` (Line 377)
  - `formatDuration()` in both `runs.ts` (Line 245) and `strava.ts` (Line 395)

- [ ] **Query Selection** - some use `select('*')`, others specific columns
  - Prefer explicit column selection for performance

### Navigation Issues to Verify

- [ ] `HomeScreen.tsx` (Line 319) - verify Leaderboard nested under Feed correctly
- [ ] `CartScreen.tsx` (Line 176) - verify 'Marketplace' route exists (may be 'MarketplaceHome')
- [ ] `CheckoutScreen.tsx` (Line 206) - verify 'OrderHistory' route name

### UI/UX Improvements

- [ ] **Coupons.tsx** - Missing pull-to-refresh (Line 195)
- [ ] **CheckoutScreen.tsx** (Line 370) - Hardcoded country "Ireland", no picker
- [ ] **PartnerCouponScreen.tsx** - No loading state during pull-to-refresh

### Code Quality

- [ ] **45+ "any" type assertions** - Replace with proper TypeScript interfaces:
  - Navigation props across all screens
  - API response types
  - Feed data casting (`FeedPostItem.tsx` Line ~50)

- [ ] **File complexity** - Consider breaking down:
  - `HomeScreen.tsx` (750 lines)
  - `CheckoutScreen.tsx` (732 lines)
  - `Friends.tsx` (707 lines)
  - `LoyaltyCard.tsx` (656 lines)

### Unused Code

- [ ] **Remove unused export**: `createMarketplaceItem()` in marketplace.ts (Lines 62-89)
  - Comment: "mostly unused if we switch to CreateListing screen"

---

## LOW PRIORITY

### Code Cleanup

- [ ] **Console.log statements** - 240+ in codebase
  - Replace with structured logging using Logger service
  - Keep only essential debug logs

- [ ] **Commented code blocks** to remove:
  - `LoyaltyCard.tsx` (Line 432) - rotation comment
  - `ChangePasswordScreen.tsx` (~Line 400) - validation workaround
  - `Coupons.tsx` - mocking state comments

### Minor Issues

- [ ] **Unsafe math** in `payments.ts` (Line 172):
  ```typescript
  const finalAmount = Math.max(50, amount - pointsToUse);
  ```
  - No validation that `pointsToUse <= amount`

- [ ] **Hardcoded date format** in `leaderboard.ts` (Line 17):
  ```typescript
  .eq('month', currentMonth.toISOString().split('T')[0])
  ```
  - Should use date library

- [ ] **Fire-and-forget async** in multiple files:
  ```typescript
  import('./achievements').then(({ checkAndUnlockAchievement }) => {...});
  ```
  - No error handling if achievements module fails

### Documentation

- [ ] Complete remaining 5% of translations (pt.json, es.json, en.json)
- [ ] Add "Powered by Strava" branding where Strava data displayed

---

## STRIPE SUBSCRIPTIONS (Blocked)

- [ ] **Test subscription creation end-to-end**
  - Was failing with "Edge Function returned a non-2xx status code"
  - CORS headers added - needs re-testing once Supabase stabilizes

- [ ] **Verify environment variables in Supabase secrets**:
  ```
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_PUBLISHABLE_KEY
  ```

---

## COMPLETED

- [x] OAuth flow for Strava working
- [x] Strava webhook receiving events
- [x] Activity sync with points
- [x] 7-day data retention compliance migration applied
- [x] Token refresh logic implemented
- [x] Daily cron job for expired Strava data cleanup
- [x] Run Map navigation removed (Strava API compliance)
- [x] Create Event button removed (admin-only via web)

---

## STATISTICS

| Category | Count |
|----------|-------|
| Critical Issues | 5 |
| High Priority | 25+ |
| Medium Priority | 20+ |
| Low Priority | 15+ |
| Files needing attention | 30+ |
| Type "any" usages | 45+ |
| Console.log statements | 240+ |

---

## FILES MOST NEEDING ATTENTION

| Priority | File | Issues |
|----------|------|--------|
| CRITICAL | `SellerOnboarding.tsx` | Demo mode + fake Stripe accounts |
| CRITICAL | `CreateListing.tsx` | Wrong storage bucket |
| CRITICAL | `Leaderboard.tsx` | Mock data fallback |
| CRITICAL | `notifications.ts` | Push token not saved |
| HIGH | `HomeScreen.tsx` | 750 lines + silent errors |
| HIGH | `CheckoutScreen.tsx` | 732 lines + payment safety |
| HIGH | `payments.ts` | Multiple stubs |
| HIGH | `marketplace.ts` | Missing CRUD functions |
| MEDIUM | `wallet.ts` | Throws errors inconsistently |
| MEDIUM | `ApiClient.ts` | No retry logic |
