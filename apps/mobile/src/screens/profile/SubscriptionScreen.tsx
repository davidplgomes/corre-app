import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    Dimensions,
    ActivityIndicator,
    Animated,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { VerifiedIcon, CardIcon, CalendarIcon, ChevronRightIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { FeatureComparisonTable } from '../../components/subscription/FeatureComparisonTable';
import { SubscriptionsApi } from '../../api/endpoints/subscriptions.api';
import { useStripe } from '@stripe/stripe-react-native';
import { StripeProductDisplay, SubscriptionInfo } from '../../types/subscription.types';
import { supabase } from '../../services/supabase/client';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type SubscriptionScreenProps = {
    navigation: any;
    route: any;
};

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation, route }) => {
    const { t, i18n } = useTranslation();
    const { user, profile, refreshProfile } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    // State
    const [loading, setLoading] = useState(false);
    const [plansLoading, setPlansLoading] = useState(true);
    const [plans, setPlans] = useState<StripeProductDisplay[]>([]);
    const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);
    const [showComparison, setShowComparison] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    // Animations
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(50)).current;
    const skeletonAnim = React.useRef(new Animated.Value(0.3)).current;

    // Check if user has active subscription
    const isSubscribed = currentSubscription &&
        ['active', 'trialing'].includes(currentSubscription.status) &&
        !currentSubscription.cancelAtPeriodEnd;

    const isCancelled = currentSubscription?.cancelAtPeriodEnd === true;

    // Skeleton pulse animation
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(skeletonAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(skeletonAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    // Fetch data on focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [user?.id])
    );

    const fetchData = async () => {
        if (!user?.id) return;

        try {
            setPlansLoading(true);

            // Fetch current subscription and plans in parallel
            const [subResponse, plansResponse] = await Promise.all([
                SubscriptionsApi.getCurrentSubscription(user.id),
                SubscriptionsApi.getProducts()
            ]);

            if (subResponse.data) {
                setCurrentSubscription(subResponse.data);
            }

            if (plansResponse.data) {
                setPlans(plansResponse.data);
            }

            // Start Entry Animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

        } catch (error) {
            console.error('Error fetching subscription data:', error);
        } finally {
            setPlansLoading(false);
        }
    };

    const waitForSubscriptionActivation = async (
        userId: string,
        stripeSubscriptionId?: string,
        maxAttempts = 15
    ): Promise<'active' | 'failed' | 'timeout'> => {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            let query = supabase
                .from('subscriptions')
                .select('status')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (stripeSubscriptionId) {
                query = query.eq('stripe_subscription_id', stripeSubscriptionId);
            }

            const { data: sub, error } = await query.maybeSingle();
            if (error) {
                console.warn('Subscription polling error:', error);
                continue;
            }

            const status = sub?.status;
            if (!status) continue;
            if (status === 'active' || status === 'trialing') return 'active';
            if (status === 'incomplete_expired' || status === 'unpaid' || status === 'canceled') return 'failed';
        }

        return 'timeout';
    };

    const handleSubscribe = async (plan: StripeProductDisplay) => {
        if (!user?.id) {
            Alert.alert(t('common.error'), t('auth.pleaseLogin', 'Please log in to subscribe'));
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // 1. Create subscription on backend -> get clientSecret
            const { data, error } = await SubscriptionsApi.createSubscription({
                priceId: plan.priceId
            });

            if (error) {
                throw new Error(error?.message || 'Failed to initialize subscription');
            }

            if (!data?.clientSecret) {
                await fetchData();
                await refreshProfile();
                Alert.alert(
                    t('subscription.processing', 'Processing'),
                    t('subscription.processingMessage', 'Your subscription request was received. Please refresh in a moment.')
                );
                return;
            }

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Corre App',
                paymentIntentClientSecret: data.clientSecret,
                defaultBillingDetails: {
                    email: user.email,
                },
                returnURL: 'corre://stripe-callback',
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code === 'Canceled') {
                    return;
                }
                throw new Error(paymentError.message);
            }

            // 4. Wait for webhook/database sync
            const activationResult = await waitForSubscriptionActivation(
                user.id,
                data.subscriptionId
            );

            await refreshProfile();
            await fetchData();

            if (activationResult === 'failed') {
                throw new Error(t('subscription.failedToProcess', 'Failed to process subscription'));
            }

            if (activationResult === 'timeout') {
                Alert.alert(
                    t('subscription.processing', 'Processing'),
                    t('subscription.processingMessage', 'Payment was received. Your subscription is still syncing and should appear shortly.')
                );
                return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                t('subscription.success', 'Welcome to the Club! 🎉'),
                t('subscription.successMessage', { plan: plan.name, defaultValue: `You are now subscribed to ${plan.name}!\n\nYour subscription is now active.` }),
                [{ text: t('common.ok', 'OK') }]
            );
        } catch (error) {
            console.error('Subscription error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('subscription.failedToProcess', 'Failed to process subscription')
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!currentSubscription?.stripeSubscriptionId) return;

        Alert.alert(
            t('subscription.cancelTitle', 'Cancel Subscription?'),
            t('subscription.cancelMessage', 'Your subscription will remain active until the end of the current billing period. You will lose access to premium features after that date.'),
            [
                { text: t('common.no', 'No'), style: 'cancel' },
                {
                    text: t('common.yes', 'Yes, Cancel'),
                    style: 'destructive',
                    onPress: async () => {
                        setCancelLoading(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                        try {
                            const response = await SubscriptionsApi.cancelSubscription(
                                currentSubscription.stripeSubscriptionId!
                            );

                            if (response.error) {
                                throw new Error(response.error.message);
                            }

                            await refreshProfile();
                            await fetchData();

                            Alert.alert(
                                t('subscription.cancelled', 'Subscription Cancelled'),
                                t('subscription.cancelledMessage', 'Your subscription has been cancelled. You will have access until the end of your billing period.')
                            );
                        } catch (error) {
                            console.error('Cancel error:', error);
                            Alert.alert(
                                t('common.error'),
                                error instanceof Error ? error.message : t('subscription.cancelFailed', 'Failed to cancel subscription')
                            );
                        } finally {
                            setCancelLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleContactSupport = () => {
        Haptics.selectionAsync();
        Linking.openURL('mailto:support@correapp.com?subject=Subscription%20Support');
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const renderFeature = (text: string) => (
        <View style={styles.featureRow} key={text}>
            <View style={{ marginRight: 8, marginTop: 2 }}>
                <VerifiedIcon size={16} color={theme.colors.success} filled />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );

    // ==================== ACTIVE SUBSCRIPTION VIEW ====================
    const renderActiveSubscription = () => {
        if (!currentSubscription) return null;

        const planName = currentSubscription.planName || profile?.membershipTier || 'Pro';
        const isClub = planName.toLowerCase().includes('club');
        const isPro = planName.toLowerCase().includes('pro');
        const accentColor = isClub ? '#FFD700' : theme.colors.brand.primary;

        return (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {/* Current Plan Card */}
                <View style={[styles.currentPlanCard, { borderColor: accentColor }]}>
                    {isClub ? (
                        <LinearGradient
                            colors={['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)']}
                            style={StyleSheet.absoluteFill}
                        />
                    ) : (
                        <LinearGradient
                            colors={['rgba(255, 87, 34, 0.15)', 'rgba(0,0,0,0)']}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    {/* Plan Badge */}
                    <View style={styles.currentPlanHeader}>
                        <LinearGradient
                            colors={isClub ? ['#FFD700', '#FFA500'] : [theme.colors.brand.primary, theme.colors.brand.secondary]}
                            style={styles.currentPlanBadge}
                        >
                            <Text style={[styles.currentPlanBadgeText, isClub && { color: '#000' }]}>
                                {planName.toUpperCase()}
                            </Text>
                        </LinearGradient>

                        {isCancelled && (
                            <View style={styles.cancelledBadge}>
                                <Text style={styles.cancelledBadgeText}>
                                    {t('subscription.cancelling', 'CANCELLING')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Status */}
                    <View style={styles.statusSection}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: isCancelled ? '#FFA500' : theme.colors.success }]} />
                            <Text style={styles.statusText}>
                                {isCancelled
                                    ? t('subscription.activeUntil', 'Active until end of period')
                                    : t('subscription.active', 'Active')
                                }
                            </Text>
                        </View>
                    </View>

                    {/* Plan Details */}
                    <View style={styles.planDetails}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <CalendarIcon size={18} color={theme.colors.text.secondary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>
                                    {isCancelled
                                        ? t('subscription.accessUntil', 'Access until')
                                        : t('subscription.nextBilling', 'Next billing date')
                                    }
                                </Text>
                                <Text style={styles.detailValue}>
                                    {formatDate(currentSubscription.currentPeriodEnd)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <CardIcon size={18} color={theme.colors.text.secondary} />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>{t('subscription.memberSince', 'Member since')}</Text>
                                <Text style={styles.detailValue}>
                                    {formatDate(currentSubscription.currentPeriodStart)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Benefits Recap */}
                    <View style={styles.benefitsSection}>
                        <Text style={styles.benefitsTitle}>{t('subscription.yourBenefits', 'Your Benefits')}</Text>
                        <View style={styles.benefitsList}>
                            {renderFeature(t('subscription.benefit1', '10% discount at partner stores'))}
                            {renderFeature(t('subscription.benefit2', 'Priority event registration'))}
                            {renderFeature(t('subscription.benefit3', 'Monthly rewards'))}
                            {isClub && renderFeature(t('subscription.benefit4', 'VIP event access'))}
                            {isClub && renderFeature(t('subscription.benefit5', 'Guest passes'))}
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsSection}>
                    {/* Upgrade to Club (if on Pro) */}
                    {isPro && !isClub && plans.find(p => p.name.toLowerCase().includes('club')) && (
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => {
                                const clubPlan = plans.find(p => p.name.toLowerCase().includes('club'));
                                if (clubPlan) handleSubscribe(clubPlan);
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                style={styles.upgradeButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.upgradeButtonText}>
                                    {t('subscription.upgradeToClub', 'Upgrade to Club')}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Support Button */}
                    <TouchableOpacity
                        style={styles.supportButton}
                        onPress={handleContactSupport}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.supportButtonText}>
                            {t('subscription.contactSupport', 'Contact Support')}
                        </Text>
                        <ChevronRightIcon size={16} color={theme.colors.text.secondary} />
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    {!isCancelled && (
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancelSubscription}
                            disabled={cancelLoading}
                            activeOpacity={0.7}
                        >
                            {cancelLoading ? (
                                <ActivityIndicator size="small" color="#FF4444" />
                            ) : (
                                <Text style={styles.cancelButtonText}>
                                    {t('subscription.cancelSubscription', 'Cancel Subscription')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Resubscribe if cancelled */}
                    {isCancelled && (
                        <TouchableOpacity
                            style={[styles.resubscribeButton, { backgroundColor: accentColor }]}
                            onPress={() => {
                                // Find the matching plan and resubscribe
                                const matchingPlan = plans.find(p =>
                                    p.name.toLowerCase().includes(planName.toLowerCase())
                                );
                                if (matchingPlan) handleSubscribe(matchingPlan);
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.resubscribeButtonText, isClub && { color: '#000' }]}>
                                {t('subscription.resubscribe', 'Resubscribe')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        );
    };

    // ==================== PLAN SELECTION VIEW ====================
    const renderSkeletonCard = (index: number) => (
        <Animated.View
            key={`skeleton-${index}`}
            style={[
                styles.cardContainer,
                { opacity: skeletonAnim, borderColor: 'rgba(255,255,255,0.1)' }
            ]}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ width: 80, height: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 12 }} />
                    <View style={{ width: 140, height: 36, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 8 }} />
                    <View style={{ width: 200, height: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                </View>
                <View style={styles.divider} />
                <View style={styles.featuresList}>
                    {[1, 2, 3, 4].map(i => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }}>
                            <View style={{ width: 16, height: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, marginRight: 8 }} />
                            <View style={{ width: 160 + (i * 15), height: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
                        </View>
                    ))}
                </View>
                <View style={{ height: 50, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 25, marginTop: 30 }} />
            </View>
        </Animated.View>
    );

    const renderCard = (plan: StripeProductDisplay, index: number) => {
        const planNameLower = plan.name.toLowerCase();
        const isClub = planNameLower.includes('club') || planNameLower.includes('premium');
        const isPro = planNameLower.includes('pro');

        const borderColor = isClub ? '#FFD700' : (isPro ? theme.colors.brand.primary : 'rgba(255,255,255,0.1)');

        const priceFormatted = new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'pt-BR', {
            style: 'currency',
            currency: plan.currency.toUpperCase()
        }).format(plan.amount / 100);

        return (
            <Animated.View
                key={plan.productId}
                style={[
                    styles.cardContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        borderColor: borderColor
                    }
                ]}
            >
                {isPro && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.secondary]} style={styles.badge}>
                            <Text style={styles.badgeText}>{t('subscription.mostPopular')}</Text>
                        </LinearGradient>
                    </View>
                )}
                {isClub && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.badge}>
                            <Text style={[styles.badgeText, { color: '#000' }]}>{t('subscription.premium')}</Text>
                        </LinearGradient>
                    </View>
                )}

                {isClub ? (
                    <LinearGradient
                        colors={['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)']}
                        style={StyleSheet.absoluteFill}
                    />
                ) : isPro ? (
                    <LinearGradient
                        colors={['rgba(255, 87, 34, 0.15)', 'rgba(0,0,0,0)']}
                        style={StyleSheet.absoluteFill}
                    />
                ) : null}

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.planName, { color: isClub ? '#FFD700' : (isPro ? theme.colors.brand.primary : '#FFF') }]}>
                            {plan.name.toUpperCase()}
                        </Text>
                        <Text style={styles.planPrice}>{priceFormatted}<Text style={styles.perMonth}>{t('subscription.perMonth')}</Text></Text>
                        <Text style={styles.planDesc}>{plan.description}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.featuresList}>
                        {plan.features.map((f: string, i: number) => renderFeature(f))}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.subButton,
                            {
                                backgroundColor: isClub ? '#FFD700' : (isPro ? theme.colors.brand.primary : theme.colors.gray[800]),
                                shadowColor: isClub ? '#FFD700' : (isPro ? theme.colors.brand.primary : '#000'),
                            }
                        ]}
                        activeOpacity={0.8}
                        onPress={() => handleSubscribe(plan)}
                    >
                        <Text style={[styles.subButtonText, isClub && { color: '#000' }]}>
                            {t('subscription.subscribe')} {plan.name}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    const renderPlanSelection = () => (
        <>
            <TouchableOpacity
                style={styles.comparisonToggle}
                onPress={() => setShowComparison(!showComparison)}
            >
                <Text style={styles.comparisonToggleText}>
                    {showComparison ? t('subscription.viewPlans') : t('subscription.compareFeatures')}
                </Text>
            </TouchableOpacity>

            {showComparison ? (
                <View style={styles.comparisonContainer}>
                    <FeatureComparisonTable />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={width * 0.85 + 20}
                    decelerationRate="fast"
                    pagingEnabled={false}
                    nestedScrollEnabled={true}
                >
                    {plansLoading ? (
                        <>
                            {renderSkeletonCard(0)}
                            {renderSkeletonCard(1)}
                        </>
                    ) : plans.length > 0 ? (
                        plans.map((plan, index) => renderCard(plan, index))
                    ) : (
                        <View style={{ width: width - 40, alignItems: 'center', justifyContent: 'center', height: 200 }}>
                            <Text style={{ color: theme.colors.text.secondary }}>{t('subscription.noPlansAvailable')}</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <BackButton
                        onPress={() => {
                            const from = route.params?.from;
                            if (from === 'Home') {
                                navigation.dispatch(
                                    CommonActions.reset({
                                        index: 0,
                                        routes: [{ name: 'ProfileMain' }],
                                    })
                                );
                                navigation.navigate('Home');
                            } else {
                                navigation.navigate('ProfileMain');
                            }
                        }}
                    />
                    <View>
                        <Text style={styles.headerLabel}>
                            {isSubscribed ? t('subscription.manage', 'MANAGE') : t('subscription.plans')}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {isSubscribed ? t('subscription.yourPlan', 'Your Plan') : t('subscription.title')}
                        </Text>
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: isSubscribed ? 20 : 0 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                            <Text style={styles.loadingText}>{t('subscription.processing')}</Text>
                        </View>
                    )}

                    {plansLoading ? (
                        <View style={{ padding: 20 }}>
                            {renderSkeletonCard(0)}
                        </View>
                    ) : isSubscribed || isCancelled ? (
                        renderActiveSubscription()
                    ) : (
                        renderPlanSelection()
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },

    // Current Plan Styles
    currentPlanCard: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 2,
        marginBottom: 20,
    },
    currentPlanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 0,
        gap: 12,
    },
    currentPlanBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    currentPlanBadgeText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    cancelledBadge: {
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    cancelledBadgeText: {
        color: '#FFA500',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statusSection: {
        padding: 20,
        paddingTop: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        color: theme.colors.text.secondary,
        fontSize: 14,
    },
    planDetails: {
        paddingHorizontal: 20,
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        color: theme.colors.text.tertiary,
        fontSize: 12,
        marginBottom: 2,
    },
    detailValue: {
        color: theme.colors.text.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    benefitsSection: {
        padding: 20,
        paddingTop: 24,
    },
    benefitsTitle: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
    },
    benefitsList: {
        gap: 4,
    },

    // Actions Section
    actionsSection: {
        gap: 12,
    },
    upgradeButton: {
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    upgradeButtonGradient: {
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upgradeButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background.elevated,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    supportButtonText: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    cancelButtonText: {
        color: '#FF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    resubscribeButton: {
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resubscribeButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // Plan Selection Styles (existing)
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 60,
        alignItems: 'center',
    },
    cardContainer: {
        width: width * 0.85,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 24,
        marginRight: 20,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    cardContent: {
        padding: 30,
        flex: 1,
        zIndex: 1,
    },
    cardHeader: {
        marginBottom: 20,
    },
    planName: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 8,
    },
    planPrice: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    perMonth: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
        fontWeight: 'normal',
    },
    planDesc: {
        color: theme.colors.text.secondary,
        marginTop: 4,
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border.default,
        marginVertical: 20,
    },
    featuresList: {
        flex: 1,
    },
    featureRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    featureText: {
        color: theme.colors.text.primary,
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    subButton: {
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    subButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    comparisonToggle: {
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: theme.colors.background.elevated,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        alignItems: 'center',
    },
    comparisonToggleText: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    comparisonContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: theme.colors.text.primary,
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    badgeContainer: {
        position: 'absolute',
        top: 20,
        right: 0,
        zIndex: 10,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
