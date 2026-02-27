# Web Sync QA Checklist (Partner + Admin)

Use this checklist to validate that web dashboards are fully synced with mobile and Supabase before release.

## 1) Preflight

- [ ] Web app starts and loads admin + partner dashboards.
- [ ] Logged-in admin user can access `/admin/dashboard/*`.
- [ ] Logged-in partner user can access `/partner/dashboard/*`.
- [ ] Non-admin users are blocked from admin routes.

## 2) Event Sync (Critical)

- [ ] In partner dashboard, create event with each type:
  - `routine`
  - `special`
  - `race`
- [ ] Confirm event appears in partner events list.
- [ ] Confirm event appears in admin events list.
- [ ] Confirm event appears in mobile app events feed.
- [ ] Edit event type/date/points from web and verify mobile reflects changes.
- [ ] Delete event from web and verify it disappears in mobile.
- [ ] Confirm no events exist with legacy types (`group_run`, `coffee_run`, `social`).

## 3) Coupon Sync

- [ ] Create coupon in partner dashboard with:
  - category
  - min tier
  - points required
  - valid_from / expires_at
  - stock_limit
- [ ] Confirm coupon appears in mobile coupons view.
- [ ] Redeem coupon in mobile and verify redemption appears in:
  - partner coupon redemptions page
  - partner analytics counters
- [ ] Edit coupon in web and verify mobile reflects updates.
- [ ] Deactivate coupon in web and verify mobile no longer offers redemption.

## 4) Place Sync

- [ ] Partner creates place in web.
- [ ] Place appears in partner places list.
- [ ] Edit and delete place both work.
- [ ] Confirm place ownership uses partner profile ID mapping (no missing/foreign rows).

## 5) Partner/Admin Identity Sync

- [ ] Admin creates partner account via admin dashboard.
- [ ] New user exists in `users` with role `partner`.
- [ ] Matching `partners` row exists with `user_id = users.id`.
- [ ] Partner can log in and manage only their own resources.

## 6) Subscription Ops Sync (Admin)

- [ ] In admin subscriptions table, `Cancel At End` works.
- [ ] `Resume` works for scheduled cancellations.
- [ ] `Refund` works for latest successful subscription charge.
- [ ] Mobile subscription screen reflects cancel/resume state.
- [ ] Refund action returns clear message when already refunded/no charge found.

## 7) Stripe + Webhook Integrity

- [ ] Stripe webhook endpoint is enabled for `stripe-webhook`.
- [ ] Test subscription payment updates `subscriptions` status and user tier.
- [ ] Test payment failure updates transaction/order status.
- [ ] Test refund updates transaction status to `refunded`.

## 8) RLS/Isolation Checks

- [ ] Partner A cannot read Partner B coupons/events/places.
- [ ] Partner redemptions query returns only own coupon redemptions.
- [ ] Admin can read/manage all partner data.

## 9) Final Regression Sweep

- [ ] CSV export works in admin subscriptions.
- [ ] Loading/empty/error states appear and are user-readable.
- [ ] No console errors on core pages during CRUD operations.
- [ ] `npx tsc -p apps/web/tsconfig.json --noEmit` passes.

## 10) Launch Gate

- [ ] All checks above passed in staging or production-like data.
- [ ] Any failed step has a tracked fix ticket.
- [ ] Sign-off recorded for:
  - partner dashboard
  - admin dashboard
  - Stripe billing operations
  - mobile/web sync
