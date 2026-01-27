import React, { useState, useEffect } from 'react';
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
import { VerifiedIcon, ChevronRightIcon } from '../../components/common/TabIcons';
import { FeatureComparisonTable } from '../../components/subscription/FeatureComparisonTable';
import { getPlans, subscribeToPlan, Plan } from '../../services/monetization.mock';

const { width } = Dimensions.get('window');

type SubscriptionScreenProps = {
    navigation: any;
};

export const SubscriptionScreen: React.FC<any> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [showComparison, setShowComparison] = useState(false);

    // Animations
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(50)).current;

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const fetchedPlans = await getPlans();
                setPlans(fetchedPlans);

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
                Alert.alert('Error', 'Failed to load plans');
            }
        };
        fetchPlans();
    }, []);

    const handleSubscribe = async (planName: string) => {
        if (!user?.id) {
            Alert.alert('Error', 'Please log in to subscribe');
            return;
        }

        if (planName === 'Free') {
            Alert.alert('Info', 'You are already on the Free plan');
            return;
        }

        setLoading(true);
        try {
            const planType = planName.toLowerCase() as 'pro' | 'club';
            const subscription = await subscribeToPlan(user.id, planType);

            Alert.alert(
                'Success! 🎉',
                `You are now subscribed to ${planName}!\n\nYour subscription is active until ${subscription.endDate?.toLocaleDateString()}.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to subscribe'
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

    const renderCard = (plan: Plan, index: number) => {
        const isClub = plan.name === 'club';
        const isPro = plan.name === 'pro';

        return (
            <Animated.View
                key={plan.name}
                style={[
                    styles.cardContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        borderColor: isClub ? '#FFD700' : (isPro ? theme.colors.brand.primary : 'rgba(255,255,255,0.1)')
                    }
                ]}
            >
                {/* Popular/Best Value Badge */}
                {isPro && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient colors={[theme.colors.brand.primary, theme.colors.brand.secondary]} style={styles.badge}>
                            <Text style={styles.badgeText}>MAIS POPULAR</Text>
                        </LinearGradient>
                    </View>
                )}
                {isClub && (
                    <View style={styles.badgeContainer}>
                        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.badge}>
                            <Text style={[styles.badgeText, { color: '#000' }]}>PREMIUM</Text>
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
                        <Text style={[styles.planName, { color: plan.color }]}>{plan.displayName.toUpperCase()}</Text>
                        <Text style={styles.planPrice}>{plan.priceFormatted}<Text style={styles.perMonth}>/mês</Text></Text>
                        <Text style={styles.planDesc}>{plan.description}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.featuresList}>
                        {plan.features.map((f: string) => renderFeature(f))}
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
                        onPress={() => handleSubscribe(plan.name)}
                    >
                        <Text style={[styles.subButtonText, isClub && { color: '#000' }]}>
                            {plan.name === 'free' ? 'Plano Atual' : 'Assinar ' + plan.displayName}
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
                    <TouchableOpacity
                        onPress={() => {
                            const from = route.params?.from;
                            if (from === 'Home') {
                                // Reset Profile stack to main screen first
                                navigation.navigate('ProfileMain');
                                // Then switch to Home tab
                                navigation.navigate('Home');
                            } else {
                                navigation.navigate('ProfileMain');
                            }
                        }}
                        style={styles.backBtn}
                    >
                        <View style={styles.backIcon}>
                            <ChevronRightIcon size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>PLANOS</Text>
                        <Text style={styles.headerTitle}>ASSINATURA</Text>
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
                            {showComparison ? '📊 Ver Planos' : '📋 Comparar Recursos'}
                        </Text>
                    </TouchableOpacity>

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                            <Text style={styles.loadingText}>Processando...</Text>
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
                            {plans.map(renderCard)}
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
    backBtn: {
        marginRight: 16,
    },
    backIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        transform: [{ rotate: '180deg' }],
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
