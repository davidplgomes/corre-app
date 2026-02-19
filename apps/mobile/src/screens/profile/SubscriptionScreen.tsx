import React, { useState, useEffect } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
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
    Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { VerifiedIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { FeatureComparisonTable } from '../../components/subscription/FeatureComparisonTable';
import { SubscriptionsApi } from '../../api/endpoints/subscriptions.api';
import { useStripe } from '@stripe/stripe-react-native';
import { StripeProductDisplay } from '../../types/subscription.types';

const { width } = Dimensions.get('window');

type SubscriptionScreenProps = {
    navigation: any;
    route: any;
};

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<StripeProductDisplay[]>([]);
    const [showComparison, setShowComparison] = useState(false);

    // Animations
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(50)).current;

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await SubscriptionsApi.getProducts();
                if (response.data) {
                    setPlans(response.data);
                } else {
                    console.error('Failed to fetch plans:', response.error);
                    Alert.alert(t('common.error'), t('subscription.failedToLoad', 'Failed to load subscription plans. Please try again later.'));
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
                console.error('Error fetching plans:', error);
                Alert.alert(t('common.error'), t('subscription.failedToLoad', 'Failed to load plans'));
            }
        };
        fetchPlans();
    }, []);

    const handleSubscribe = async (plan: StripeProductDisplay) => {
        if (!user?.id) {
            Alert.alert(t('common.error'), t('auth.pleaseLogin', 'Please log in to subscribe'));
            return;
        }

        setLoading(true);
        try {
            // 1. Create subscription on backend -> get clientSecret
            const { data, error } = await SubscriptionsApi.createSubscription({
                priceId: plan.priceId
            });

            if (error || !data?.clientSecret) {
                throw new Error(error?.message || 'Failed to initialize subscription');
            }

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'Corre App',
                paymentIntentClientSecret: data.clientSecret,
                defaultBillingDetails: {
                    email: user.email,
                },
                returnURL: 'correapp://stripe-redirect', // Ensure this is configured in creating configs
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code === 'Canceled') {
                    // User cancelled, do nothing
                    return;
                }
                throw new Error(paymentError.message);
            }

            // 4. Success!
            Alert.alert(
                t('subscription.success', 'Success! 🎉'),
                t('subscription.successMessage', { plan: plan.name, defaultValue: `You are now subscribed to ${plan.name}!\n\nYour subscription is now active.` }),
                [{ text: t('common.ok', 'OK'), onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error('Subscription error:', error);
            Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('subscription.failedToProcess', 'Failed to process subscription')
            );
        } finally {
            setLoading(false);
        }
    };

    const renderFeature = (text: string) => (
        <View style={styles.featureRow} key={text}>
            <View style={{ marginRight: 8, marginTop: 2 }}>
                <VerifiedIcon size={16} color={theme.colors.success} filled />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );

    const renderCard = (plan: StripeProductDisplay, index: number) => {
        // Determine style based on plan metadata or name
        // Use lowercase name matching for style assignment specific to Corre Brand
        const planNameLower = plan.name.toLowerCase();
        const isClub = planNameLower.includes('club') || planNameLower.includes('premium');
        const isPro = planNameLower.includes('pro');

        const borderColor = isClub ? '#FFD700' : (isPro ? theme.colors.brand.primary : 'rgba(255,255,255,0.1)');

        // Construct display price
        const priceFormatted = new Intl.NumberFormat('pt-BR', {
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
                {/* Popular/Best Value Badge logic handled based on metadata if available, else static for Pro */}
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

                {/* Plan Background */}
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
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <BackButton
                        onPress={() => {
                            const from = route.params?.from;
                            if (from === 'Home') {
                                // Hard reset the stack to just contain ProfileMain
                                navigation.dispatch(
                                    CommonActions.reset({
                                        index: 0,
                                        routes: [{ name: 'ProfileMain' }],
                                    })
                                );
                                // Then switch to Home tab
                                navigation.navigate('Home');
                            } else {
                                navigation.navigate('ProfileMain');
                            }
                        }}
                    />
                    <View>
                        <Text style={styles.headerLabel}>{t('subscription.plans')}</Text>
                        <Text style={styles.headerTitle}>{t('subscription.title')}</Text>
                    </View>
                </View>

                {/* Content ScrollView */}
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Toggle Button for Comparison */}
                    <TouchableOpacity
                        style={styles.comparisonToggle}
                        onPress={() => setShowComparison(!showComparison)}
                    >
                        <Text style={styles.comparisonToggleText}>
                            {showComparison ? t('subscription.viewPlans') : t('subscription.compareFeatures')}
                        </Text>
                    </TouchableOpacity>

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                            <Text style={styles.loadingText}>{t('subscription.processing')}</Text>
                        </View>
                    )}

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
                            {plans.length > 0 ? (
                                plans.map((plan, index) => renderCard(plan, index))
                            ) : (
                                !loading && (
                                    <View style={{ width: width - 40, alignItems: 'center', justifyContent: 'center', height: 200 }}>
                                        <Text style={{ color: theme.colors.text.secondary }}>{t('subscription.noPlansAvailable')}</Text>
                                    </View>
                                )
                            )}
                        </ScrollView>
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
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 60, // Increased padding
        alignItems: 'center',
    },
    cardContainer: {
        width: width * 0.85,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 24,
        marginRight: 20,
        // minHeight removed to allow content to dictate height
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    clubContainer: {
        borderColor: 'transparent',
        transform: [{ scale: 1.02 }], // Slight pop
    },
    clubBorder: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
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
    featureBullet: {
        color: theme.colors.success,
        marginRight: 10,
        fontSize: 16,
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
    // Badge Styles
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
