import { toCanonicalTier } from '../../constants/tiers';
import { SubscriptionInfo } from '../../types/subscription.types';

export interface SubscriptionScreenViewState {
    isFreeTierUser: boolean;
    hasActivePaidSubscriptionRecord: boolean;
    hasPaidCancelingAccess: boolean;
    showCurrentPlanView: boolean;
}

/**
 * Resolve which layout the subscription screen should render.
 * Free-tier users always see the plans catalog, even if stale subscription rows exist.
 */
export const resolveSubscriptionScreenViewState = (
    membershipTier?: string | null,
    currentSubscription?: SubscriptionInfo | null
): SubscriptionScreenViewState => {
    const canonicalTier = toCanonicalTier(membershipTier);
    const isFreeTierUser = canonicalTier === 'free';

    const hasActivePaidSubscriptionRecord = Boolean(
        currentSubscription &&
        ['active', 'trialing'].includes(currentSubscription.status) &&
        !currentSubscription.cancelAtPeriodEnd
    );

    const hasPaidCancelingAccess = Boolean(
        !isFreeTierUser &&
        currentSubscription?.cancelAtPeriodEnd === true
    );

    const showCurrentPlanView = !isFreeTierUser && (
        hasActivePaidSubscriptionRecord || hasPaidCancelingAccess
    );

    return {
        isFreeTierUser,
        hasActivePaidSubscriptionRecord,
        hasPaidCancelingAccess,
        showCurrentPlanView,
    };
};
