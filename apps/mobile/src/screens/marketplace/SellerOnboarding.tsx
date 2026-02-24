import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { VerifiedIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

type SellerOnboardingProps = {
    navigation: any;
};

type OnboardingStatus = 'loading' | 'not_created' | 'pending' | 'active';

export const SellerOnboarding: React.FC<SellerOnboardingProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<OnboardingStatus>('loading');

    // Check status on mount and when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            checkOnboardingStatus();
        }, [])
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
                // Account is ready, go back to previous screen
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
        if (!session?.access_token) {
            Alert.alert(t('common.error'), t('common.pleaseLogin', 'Please log in to continue'));
            return;
        }

        setLoading(true);
        try {
            // Call edge function to create Stripe Connect account and get onboarding URL
            const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
                body: { action: status === 'pending' ? 'refresh' : 'create' },
            });

            if (error) throw error;

            if (data.url) {
                // Open Stripe onboarding in browser
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    'corre://stripe-connect-return'
                );

                if (result.type === 'success' || result.type === 'dismiss') {
                    // Check status after returning from onboarding
                    await checkOnboardingStatus();
                }
            } else {
                throw new Error('No onboarding URL returned');
            }

        } catch (error: any) {
            console.error('Onboarding error:', error);
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
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <BackButton style={styles.backButton} />
                    <Text style={styles.headerTitle}>{t('seller.setupPayments', 'CONFIGURAR PAGAMENTOS').toUpperCase()}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <VerifiedIcon size={64} color={theme.colors.brand.primary} />
                    </View>

                    <Text style={styles.title}>{t('seller.receivePayments', 'Receba por suas vendas')}</Text>

                    <Text style={styles.description}>
                        {t('seller.connectDescription', 'Para vender no Marketplace, precisamos conectar uma conta bancária para você receber seus pagamentos de forma segura.')}
                    </Text>

                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>{t('seller.howItWorks', 'Como funciona?')}</Text>
                        <Text style={styles.infoText}>• {t('seller.stripeConnect', 'Usamos o Stripe Connect para pagamentos seguros.')}</Text>
                        <Text style={styles.infoText}>• {t('seller.directDeposit', 'O dinheiro cai direto na sua conta bancária.')}</Text>
                        <Text style={styles.infoText}>• {t('seller.platformFee', 'Taxa da plataforma: 5% por venda.')}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
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
                                    ? t('seller.continueSetup', 'CONTINUE SETUP').toUpperCase()
                                    : t('seller.connectAccount', 'CONNECT ACCOUNT').toUpperCase()
                                }
                            </Text>
                        )}
                    </TouchableOpacity>
                    {status === 'pending' && (
                        <Text style={styles.pendingHint}>
                            {t('seller.pendingHint', 'Your setup is incomplete. Tap above to continue.')}
                        </Text>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    infoCard: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 12,
    },
    infoText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
    button: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    pendingHint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
    },
});
