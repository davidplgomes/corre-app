import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ImageBackground,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { VerifiedIcon, CheckCircleIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { isPaidMembershipTier } from '../../constants/tiers';

type SellerOnboardingProps = {
    navigation: any;
};

type OnboardingStatus = 'loading' | 'not_created' | 'pending' | 'active';

const FEATURES = [
    { icon: '🔒', title: 'Secure Payments', desc: 'Powered by Stripe Connect' },
    { icon: '💸', title: 'Direct Deposits', desc: 'Money goes to your bank' },
    { icon: '📊', title: '5% Platform Fee', desc: 'Only when you sell' },
];

export const SellerOnboarding: React.FC<SellerOnboardingProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { session, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<OnboardingStatus>('loading');

    const promptUpgradeAndExit = useCallback(() => {
        Alert.alert(
            t('marketplace.communitySellRequiresPaidTitle', 'Paid Plan Required'),
            t(
                'marketplace.communitySellRequiresPaidDescription',
                'Selling in the community marketplace is available only for Pro and Club members.'
            ),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel', onPress: () => navigation.goBack() },
                {
                    text: t('marketplace.upgradeToProClub', 'Upgrade to Pro/Club'),
                    onPress: () => navigation.navigate('Profile', { screen: 'SubscriptionScreen' }),
                },
            ]
        );
    }, [navigation, t]);

    useFocusEffect(
        useCallback(() => {
            if (!isPaidMembershipTier(profile?.membershipTier)) {
                setStatus('not_created');
                promptUpgradeAndExit();
                return;
            }
            checkOnboardingStatus();
        }, [profile?.membershipTier, promptUpgradeAndExit])
    );

    const checkOnboardingStatus = async () => {
        if (!session?.access_token) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
                body: { action: 'status' },
            });

            if (error) throw error;

            if (data.status === 'active' && data.charges_enabled) {
                setStatus('active');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    t('common.success'),
                    t('seller.accountReady', 'Your seller account is ready! You can now create listings.'),
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else if (data.status === 'pending') {
                setStatus('pending');
            } else {
                setStatus('not_created');
            }
        } catch (error) {
            console.error('Error checking status:', error);
            setStatus('not_created');
        } finally {
            setLoading(false);
        }
    };

    const handleOnboarding = async () => {
        if (!isPaidMembershipTier(profile?.membershipTier)) {
            promptUpgradeAndExit();
            return;
        }

        if (!session?.access_token) {
            Alert.alert(t('common.error'), t('common.pleaseLogin', 'Please log in to continue'));
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
                body: { action: status === 'pending' ? 'refresh' : 'create' },
            });

            if (error) throw error;

            if (data.url) {
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    'corre://stripe-connect-return'
                );

                if (result.type === 'success' || result.type === 'dismiss') {
                    await checkOnboardingStatus();
                }
            } else {
                throw new Error('No onboarding URL returned');
            }

        } catch (error: any) {
            console.error('Onboarding error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                t('common.error'),
                t('seller.onboardingFailed', 'Failed to start onboarding. Please try again.')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/run_bg_club.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <BackButton onPress={() => {
                                Haptics.selectionAsync();
                                navigation.goBack();
                            }} />
                            <View style={styles.headerTitles}>
                                <Text style={styles.headerLabel}>{t('seller.becomeASeller', 'BECOME A SELLER')}</Text>
                                <Text style={styles.headerTitle}>{t('seller.setupPayments', 'PAYMENTS')}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Main Content */}
                    <View style={styles.content}>
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            <VerifiedIcon size={48} color={theme.colors.brand.primary} />
                        </View>

                        <Text style={styles.title}>
                            {t('seller.receivePayments', 'Start Earning')}
                        </Text>
                        <Text style={styles.subtitle}>
                            {t('seller.connectDescription', 'Connect your bank account to receive payments securely through Stripe.')}
                        </Text>

                        {/* Features */}
                        <BlurView intensity={20} tint="dark" style={styles.featuresCard}>
                            {FEATURES.map((feature, index) => (
                                <View key={index} style={[styles.featureRow, index < FEATURES.length - 1 && styles.featureRowBorder]}>
                                    <View style={styles.featureIcon}>
                                        <Text style={styles.featureEmoji}>{feature.icon}</Text>
                                    </View>
                                    <View style={styles.featureText}>
                                        <Text style={styles.featureTitle}>{feature.title}</Text>
                                        <Text style={styles.featureDesc}>{feature.desc}</Text>
                                    </View>
                                    <CheckCircleIcon size={20} color="rgba(255,255,255,0.3)" />
                                </View>
                            ))}
                        </BlurView>

                        {/* Status Indicator */}
                        {status === 'pending' && (
                            <BlurView intensity={15} tint="dark" style={styles.statusCard}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>
                                    {t('seller.pendingHint', 'Setup incomplete - tap below to continue')}
                                </Text>
                            </BlurView>
                        )}
                    </View>

                    {/* Footer */}
                    <BlurView intensity={30} tint="dark" style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, (loading || status === 'loading') && styles.buttonDisabled]}
                            onPress={handleOnboarding}
                            disabled={loading || status === 'loading'}
                        >
                            {loading || status === 'loading' ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {status === 'pending'
                                        ? t('seller.continueSetup', 'CONTINUE SETUP')
                                        : t('seller.connectAccount', 'CONNECT ACCOUNT')
                                    }
                                </Text>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.disclaimer}>
                            {t('seller.disclaimer', 'By continuing, you agree to Stripe\'s Terms of Service')}
                        </Text>
                    </BlurView>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitles: {
        marginLeft: 8,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },

    // Content
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 20,
    },

    // Features Card
    featuresCard: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    featureRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureEmoji: {
        fontSize: 18,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },

    // Status Card
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        gap: 10,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFC107',
    },
    statusText: {
        fontSize: 13,
        color: '#FFC107',
        fontWeight: '600',
    },

    // Footer
    footer: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 100,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    button: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 18,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 15,
        letterSpacing: 1,
    },
    disclaimer: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        marginTop: 12,
    },
});
