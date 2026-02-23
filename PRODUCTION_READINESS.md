# Corre App - Production Readiness Tracker

> Last updated: 2026-02-23
> Status: **Implementation Complete - Ready for Testing**

---

## Table of Contents
- [Launch Blockers](#launch-blockers)
- [Strava API Compliance](#strava-api-compliance)
- [Quick Wins](#quick-wins)
- [Deferred Items](#deferred-items)
- [Implementation Progress](#implementation-progress)
- [Verification Checklist](#verification-checklist)
- [Reference Documentation](#reference-documentation)

---

## Launch Blockers

These must be fixed before production launch.

### 1. Orders Table Missing Fields (DATA LOSS)
- [x] **Fixed** - Migration created: `20260224_production_readiness.sql`

**Issue:** Webhook writes `failure_reason` and expects `paid_at` but fields don't exist
**Impact:** Payment failure data lost, can't track when orders were paid
**Fix:** Add migration with missing columns

**Files:**
- `supabase/migrations/20260205_wallet_and_infrastructure.sql`
- `supabase/functions/stripe-webhook/index.ts` (line 188)

**Migration to add:**
```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_email TEXT;
```

---

### 2. Push Notifications Broken
- [x] **Fixed** - Column added in migration, `savePushToken()` updated

**Issue:** `savePushToken()` calls update() with no fields - token never saved
**Impact:** Zero push notifications will be delivered
**Fix:** Add `push_token` column to users table, update function

**File:** `apps/mobile/src/services/notifications.ts` (lines 82-88)

**Current broken code:**
```typescript
const { error } = await supabase
    .from('users')
    .update({
        // Note: You may need to add a push_token column
    })
```

**Migration needed:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
```

**Code fix needed:**
```typescript
const { error } = await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);
```

---

### 3. Password Reset Links Broken
- [x] **Fixed** - Deep link configuration added to RootNavigator

**Issue:** No `linking` prop in NavigationContainer
**Impact:** Password reset emails link nowhere, users locked out
**Fix:** Add deep link configuration for auth URLs

**File:** `apps/mobile/src/navigation/RootNavigator.tsx` (line 108)

**Code to add:**
```typescript
const linking = {
  prefixes: ['corre-app://', 'https://your-domain.com'],
  config: {
    screens: {
      ResetPassword: 'auth/reset',
      StravaConnect: 'strava-auth',
    }
  }
};

<NavigationContainer linking={linking}>
```

---

### 4. Row Level Security (RLS) Missing
- [x] **Fixed** - Policies added in migration for orders UPDATE and strava DELETE

**Issue:** No RLS policies on these tables - users can query anyone's data
**Impact:** SECURITY VULNERABILITY - data exposure

**Tables needing policies:**
| Table | Risk | Policy Needed |
|-------|------|---------------|
| `strava_connections` | Tokens exposed | SELECT/UPDATE/DELETE where user_id = auth.uid() |
| `point_transactions` | Points history exposed | SELECT where user_id = auth.uid() |
| `orders` | Order history exposed | SELECT/UPDATE where user_id = auth.uid() |
| `cart_items` | Cart data exposed | ALL where user_id = auth.uid() |

**Migration to add:**
```sql
-- Enable RLS
ALTER TABLE strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Strava connections
CREATE POLICY "Users can manage own strava connections" ON strava_connections
    FOR ALL USING (auth.uid() = user_id);

-- Point transactions
CREATE POLICY "Users can view own transactions" ON point_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

-- Cart items
CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid() = user_id);
```

---

### 5. Leaderboard Shows Mock Data
- [x] **Fixed** - Mock data removed, real data fetch with empty state

**Issue:** `MOCK_LEADERBOARD` used as primary data source
**Impact:** Leaderboard isn't real
**Fix:** Remove mock fallback, use real data

**File:** `apps/mobile/src/screens/leaderboard/Leaderboard.tsx` (lines 26-35)

---

## Strava API Compliance

> **Current Status:** Single Player Mode (1 athlete limit)
> **Goal:** Apply for production status (999+ athletes)

### Strava Requirements Checklist

#### Rate Limits
- **Default limits:** 200 requests/15min, 2000/day
- **Non-upload limits:** 100 requests/15min, 1000/day
- **Reset:** 15-min resets at 0/15/30/45, daily resets at midnight UTC

#### API Agreement Key Points
- [x] **7-day cache limit** - No Strava data cached longer than 7 days ✅ (implemented via cron)
- [x] **Data deletion within 48 hours** - When user disconnects or deletes ✅ (implemented)
- [x] **No AI/ML training** - Cannot use data for model training ✅ (N/A - not doing this)
- [x] **No data sales** - Cannot sell or license Strava data ✅ (N/A - not doing this)
- [x] **Display attribution** - Must show Strava logos where data displayed ✅ (implemented)

#### Brand Guidelines
- [x] **"Connect with Strava" button** - Must use official styling ✅ (implemented)
- [x] **"Powered by Strava" attribution** - Where data is displayed ✅ (implemented)
- [x] **"View on Strava" links** - Use text format with orange (#FC4C02) ✅ (implemented)
- [x] **No "Strava" in app name** - Cannot use Strava in your app's name ✅ (N/A - app is "Corre")

#### Webhook Compliance
- [x] **2-second response requirement** - Must respond within 2 seconds ✅ (implemented via EdgeRuntime.waitUntil)
- [x] **Handle all event types** - create, update, delete, deauthorization ✅ (implemented)
- [x] **Return HTTP 200** - Even on processing errors ✅ (implemented)
- [x] **Background processing** - Complex operations async ✅ (implemented)

---

### 6. No Rate Limiting / 429 Handling (CRITICAL)
- [x] **Fixed** - `withRetry()` utility added to strava-webhook with exponential backoff

**Issue:** Zero rate limiting logic - Strava will block your app if you exceed limits
**Impact:** App could be blocked from Strava API entirely

**Files needing fixes:**
- `supabase/functions/strava-webhook/index.ts` - `fetchStravaActivity()` no retry
- `supabase/functions/strava-webhook/index.ts` - `refreshStravaToken()` no retry
- `apps/mobile/src/services/supabase/strava.ts` - `triggerStravaSync()` could flood API

**Implementation needed:**
```typescript
// Exponential backoff utility
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Handle 429 specifically
      if (error.status === 429) {
        const retryAfter = error.headers?.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        continue;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 100;
      await sleep(delay);
    }
  }

  throw lastError;
}
```

---

### 7. Missing Strava Attribution on Data Display (REQUIRED)
- [x] **Fixed** - "via Strava" badge added to RunHistory, "Powered by Strava" added to Settings

**Issue:** "Powered by Strava" only on onboarding screen, not where data shown
**Impact:** Violates Strava brand guidelines - could block production approval

**Files missing attribution:**
- `apps/mobile/src/screens/profile/RunHistory.tsx` - activities show no Strava badge
- `apps/mobile/src/screens/profile/Settings.tsx` - connection status no attribution

**Fix needed:**
1. Add "Synced from Strava" badge to each Strava activity in RunHistory
2. Add Strava icon next to activity source
3. Add "Powered by Strava" to Settings near connection status
4. Use official Strava orange: `#FC4C02`

---

### 8. Strava Tokens Stored Unencrypted (SECURITY)
- [ ] **Fixed** (Deferred to post-launch)

**Issue:** access_token and refresh_token in plaintext in database
**Impact:** If database breached, all Strava tokens exposed

**File:** `supabase/migrations/20260126_strava_integration.sql` (lines 14-15)

**Note:** Code comments say "In production, encrypt this!" but not implemented

---

### 9. CORS Too Permissive (SECURITY)
- [ ] **Fixed** (Deferred to post-launch)

**Issue:** `Access-Control-Allow-Origin: *` allows any domain
**Impact:** Security vulnerability in edge function

**File:** `supabase/functions/strava-auth/index.ts` (line 15)

---

### Strava Production Status Application

**When to apply:** After items 6 & 7 are fixed

**Steps:**
1. [ ] Take screenshot of "Connect with Strava" button
2. [ ] Take screenshot of RunHistory with Strava attribution
3. [ ] Take screenshot of Settings with "Powered by Strava"
4. [ ] Go to https://www.strava.com/settings/api
5. [ ] Fill out Developer Program form
6. [ ] Submit for review

**Expected outcome:**
- Athlete limit increased from 1 to 999
- Rate limits potentially increased
- Review takes a few days to a few weeks

---

## Quick Wins

Low-effort fixes that improve security/UX.

### 10. Strengthen Password Validation
- [x] **Fixed** - Now requires 8+ chars, 1 uppercase, 1 number

**Issue:** Only 8 chars minimum, no complexity
**Fix:** Require 1 uppercase, 1 number minimum
**File:** `apps/mobile/src/utils/validation.ts` (lines 13-14)
**Effort:** 30 minutes

```typescript
export const validatePassword = (password: string): boolean => {
  // Minimum 8 chars, 1 uppercase, 1 number
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasMinLength && hasUppercase && hasNumber;
};
```

---

### 11. Remove Console Logs in Production
- [ ] **Fixed**

**Issue:** 77 console.log calls, risk of sensitive data exposure
**Fix:** Replace with Logger service or remove
**Effort:** 1-2 hours

---

## Deferred Items

Tracked for post-launch implementation.

| Item | Reason to Defer | Priority |
|------|-----------------|----------|
| Refund implementation | Can handle manually via Stripe dashboard | Medium |
| Receipt/invoice emails | Can add with Resend post-launch | Medium |
| Tax calculations (VAT) | Can add before scaling to EU | Low |
| Auth rate limiting | Low traffic initially | Medium |
| Offline support | Nice-to-have | Low |
| Search/filter | Users can scroll | Medium |
| Pagination | OK for initial user base | Medium |
| Crash reporting (Sentry) | Can add week 2 | High |
| PKCE for Strava OAuth | WebBrowser is secure enough | Low |
| Strava token encryption | Security improvement | Medium |
| Strava CORS restriction | Security improvement | Medium |

---

## Implementation Progress

### Day 1-2: Database & Backend
- [x] Task 1: Create migration for orders table
- [x] Task 2: Create RLS policies migration
- [x] Task 3: Fix push token storage

### Day 3: Authentication Fixes
- [x] Task 4: Add deep link configuration
- [x] Task 5: Strengthen password validation

### Day 4-5: Strava API Compliance
- [x] Task 6: Implement rate limiting & 429 handling
- [x] Task 7: Add Strava attribution to data display

### Day 6: Feature Fixes
- [x] Task 8: Fix Leaderboard data
- [ ] Task 9: Clean up console.log (optional)

### Day 7-10: Testing & Deployment
- [ ] Task 10: End-to-end verification
- [ ] Task 11: Strava production status application
- [ ] Task 12: Production deployment

---

## Verification Checklist

Before declaring "ready for production":

### Core Functionality
- [ ] **Orders table**: Run `SELECT * FROM orders LIMIT 1` - verify `failure_reason`, `paid_at` columns exist
- [ ] **RLS**: As user A, try `SELECT * FROM orders WHERE user_id != 'A'` - should return empty
- [ ] **Push token**: Sign up, check `users` table has `push_token` populated
- [ ] **Deep links**: Request password reset, click email link, verify app opens to reset screen
- [ ] **Leaderboard**: Open leaderboard, verify shows real user data (not "Mock User 1")
- [ ] **Payments**: Complete test payment, verify order status = 'paid' in DB

### Strava Compliance
- [ ] **Rate limiting**: Trigger rapid Strava syncs, verify requests are throttled
- [ ] **429 handling**: Mock a 429 response, verify exponential backoff kicks in
- [ ] **Attribution - RunHistory**: Open run history, verify Strava activities show "via Strava" badge
- [ ] **Attribution - Settings**: Open settings, verify "Powered by Strava" visible near connection
- [ ] **Screenshots**: Capture branded button and attribution for Strava application

---

## Reference Documentation

### Strava API
- [Rate Limits](https://developers.strava.com/docs/rate-limits/)
- [Brand Guidelines](https://developers.strava.com/guidelines/)
- [API Agreement](https://www.strava.com/legal/api)
- [API Settings](https://www.strava.com/settings/api)

### Key Strava Rules
1. **7-day cache limit** - Delete cached data after 7 days
2. **48-hour deletion** - Delete user data within 48 hours of disconnect
3. **Rate limits** - 200 req/15min, 2000/day (default)
4. **Webhooks required** - For production status
5. **Attribution required** - "Powered by Strava" where data shown
6. **No AI/ML training** - Cannot use data for model training

### Files Reference

| Category | File Path |
|----------|-----------|
| Orders Schema | `supabase/migrations/20260205_wallet_and_infrastructure.sql` |
| Stripe Webhook | `supabase/functions/stripe-webhook/index.ts` |
| Push Notifications | `apps/mobile/src/services/notifications.ts` |
| Navigation | `apps/mobile/src/navigation/RootNavigator.tsx` |
| RLS Policies | `apps/web/supabase/setup_admin_rls.sql` |
| Leaderboard | `apps/mobile/src/screens/leaderboard/Leaderboard.tsx` |
| Strava Auth | `supabase/functions/strava-auth/index.ts` |
| Strava Webhook | `supabase/functions/strava-webhook/index.ts` |
| Strava Service | `apps/mobile/src/services/supabase/strava.ts` |
| Run History | `apps/mobile/src/screens/profile/RunHistory.tsx` |
| Settings | `apps/mobile/src/screens/profile/Settings.tsx` |
| Validation | `apps/mobile/src/utils/validation.ts` |

---

## What's Already Working Well

These areas are properly implemented:

- **Strava webhooks** - All events handled (create/update/delete/deauth) with 2-second compliance
- **Strava rate limiting** - Exponential backoff with jitter, 429 handling with Retry-After
- **Strava attribution** - "via Strava" badges and "Powered by Strava" attribution
- **7-day cache compliance** - Auto-cleanup via daily cron job
- **Data deletion on disconnect** - Full cleanup implemented
- **"Connect with Strava" button** - Branded correctly with orange (#FC4C02)
- **Token refresh** - 5-min buffer, auto-refresh implemented
- **Secure token storage** - Using expo-secure-store
- **Deep linking** - Password reset, Strava OAuth, Stripe callbacks configured
- **Multi-language support** - EN, PT, ES implemented
- **Error boundaries** - App-level error boundary in place
- **Logging service** - Logger utility available
- **Password validation** - 8+ chars, 1 uppercase, 1 number required

---

## Notes

_Add implementation notes, decisions, and updates here as you work through the items._

### 2026-02-23
- Initial audit completed
- Identified 9 critical fixes (5 core + 4 Strava)
- Estimated timeline: 7-10 days
- Strava currently in Single Player Mode (1 athlete)

### 2026-02-23 (Implementation)
- Created migration `20260224_production_readiness.sql`:
  - Added `failure_reason`, `paid_at`, `customer_email` to orders table
  - Added `push_token` column to users table
  - Added UPDATE policy for orders
  - Added DELETE policy for strava_connections
- Fixed `savePushToken()` in notifications.ts to actually save token
- Added deep link configuration to RootNavigator with scheme `corre://`
- Added rate limiting with exponential backoff to strava-webhook
- Added "via Strava" badge to RunHistory activities
- Added "Powered by Strava" footer to RunHistory and Settings
- Removed MOCK_LEADERBOARD from Leaderboard screen
- Strengthened password validation (8+ chars, 1 uppercase, 1 number)

### 2026-02-23 (Strava Webhook Compliance)
- Added EdgeRuntime.waitUntil() for background processing to meet 2-second response requirement
- Implemented `processActivityInBackground()` for async activity sync
- Removed unused `handleActivitySync()` function (replaced by background version)
- All webhook events now return HTTP 200 immediately
- Complex operations (API calls, DB writes) execute in background

**Strava Webhook Compliance Summary:**
- ✅ 2-second response requirement (via EdgeRuntime.waitUntil)
- ✅ Handle all event types (create/update/delete/deauth)
- ✅ Exponential backoff with jitter for rate limits
- ✅ 429 handling with Retry-After header parsing
- ✅ Return HTTP 200 even on processing errors

### 2026-02-23 (UI/UX Fixes)
- Added password confirmation field to SignUp screen
- Removed neighborhood field from SignUp (kept in ProfileSetup)
- Fixed StravaConnect screen responsiveness for smaller screens (iPhone SE, etc.)
- Made content scrollable and reduced fixed dimensions

### 2026-02-23 (Password Reset Flow)
- Added `redirectTo: 'corre://auth/reset'` to `resetPasswordForEmail()` calls
- Added deep link URL handling in AuthContext for auth tokens
- Added `isPasswordRecovery` state to detect PASSWORD_RECOVERY event
- Updated RootNavigator to show ResetPasswordScreen when password recovery is detected
- ResetPasswordScreen now accepts `onComplete` callback for proper flow completion

---

## IMPORTANT: Supabase Configuration Required

### Password Reset Email Redirect (MUST FIX)

The password reset emails are redirecting to `localhost:3000` instead of the app. You need to update Supabase settings:

**Step 1: Update Site URL and Redirect URLs**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to: `https://corre.app` (or your production domain)
3. Add to **Redirect URLs**:
   - `corre://auth/reset`
   - `corre://strava-auth`
   - `corre://stripe-callback`
   - `https://corre.app/auth/reset` (for web fallback)

**Step 2: For Mobile Deep Links to Work**
Email clients don't support custom URL schemes like `corre://`. The flow is:
1. User clicks link in email → Opens Supabase hosted page
2. Supabase verifies token → Redirects to your Site URL with tokens
3. If Site URL is a web page that redirects to `corre://`, it opens the app

**Option A: Simple Web Redirect Page**
Host a simple HTML page at `https://corre.app/auth/reset` that redirects to the app:
```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0;url=corre://auth/reset">
    <script>window.location.href = "corre://auth/reset" + window.location.hash;</script>
</head>
<body>Redirecting to Corre App...</body>
</html>
```

**Option B: Use Expo's AuthSession (Alternative)**
For a fully in-app flow, consider using Expo's AuthSession with Supabase's PKCE flow.

**App Code Already Configured:**
- `app.config.js` → `scheme: 'corre'`
- `RootNavigator.tsx` → `linking.prefixes` and `linking.config.screens`
- `AuthContext.tsx` → Deep link URL parsing and PASSWORD_RECOVERY handling
- `auth.ts` and `auth.api.ts` → `redirectTo: 'corre://auth/reset'`

---

**Next Steps:**
1. ✅ Run the migration on Supabase (completed)
2. ✅ Deploy the edge functions (completed)
3. **Configure Supabase redirect URLs (see above)**
4. Test all flows end-to-end
5. Take Strava screenshots and apply for production status
