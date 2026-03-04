import { SubscriptionInfo } from '../../../types/subscription.types';
import { resolveSubscriptionScreenViewState } from '../subscriptionViewState';

const buildSubscription = (
    overrides: Partial<SubscriptionInfo> = {}
): SubscriptionInfo => ({
    id: 'sub-row-1',
    userId: 'user-1',
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    planId: 'price_pro',
    planName: 'Corre Pro',
    status: 'active',
    currentPeriodStart: '2026-03-01T00:00:00.000Z',
    currentPeriodEnd: '2026-04-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
});

describe('resolveSubscriptionScreenViewState', () => {
    it('shows plans catalog for free tier even with active subscription row', () => {
        const viewState = resolveSubscriptionScreenViewState('free', buildSubscription({
            status: 'active',
            cancelAtPeriodEnd: false,
        }));

        expect(viewState.isFreeTierUser).toBe(true);
        expect(viewState.hasActivePaidSubscriptionRecord).toBe(true);
        expect(viewState.showCurrentPlanView).toBe(false);
    });

    it('shows plans catalog for free tier with no subscription row', () => {
        const viewState = resolveSubscriptionScreenViewState('free', null);

        expect(viewState.isFreeTierUser).toBe(true);
        expect(viewState.showCurrentPlanView).toBe(false);
    });

    it('shows current plan for pro tier with active subscription', () => {
        const viewState = resolveSubscriptionScreenViewState('pro', buildSubscription({
            status: 'active',
            cancelAtPeriodEnd: false,
        }));

        expect(viewState.isFreeTierUser).toBe(false);
        expect(viewState.hasActivePaidSubscriptionRecord).toBe(true);
        expect(viewState.showCurrentPlanView).toBe(true);
    });

    it('shows current plan for paid tier canceling at period end', () => {
        const viewState = resolveSubscriptionScreenViewState('club', buildSubscription({
            status: 'active',
            cancelAtPeriodEnd: true,
        }));

        expect(viewState.isFreeTierUser).toBe(false);
        expect(viewState.hasPaidCancelingAccess).toBe(true);
        expect(viewState.showCurrentPlanView).toBe(true);
    });

    it('falls back to plans catalog for paid tier with no active/canceling subscription row', () => {
        const viewState = resolveSubscriptionScreenViewState('pro', null);

        expect(viewState.isFreeTierUser).toBe(false);
        expect(viewState.hasActivePaidSubscriptionRecord).toBe(false);
        expect(viewState.hasPaidCancelingAccess).toBe(false);
        expect(viewState.showCurrentPlanView).toBe(false);
    });

    it('switches to plans catalog after tier downgrade to free with stale active row', () => {
        const staleSubscription = buildSubscription({
            status: 'trialing',
            cancelAtPeriodEnd: false,
            planName: 'Corre Club',
        });

        const viewState = resolveSubscriptionScreenViewState('free', staleSubscription);
        expect(viewState.showCurrentPlanView).toBe(false);
    });
});
