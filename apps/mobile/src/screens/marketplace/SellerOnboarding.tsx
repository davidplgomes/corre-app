import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { VerifiedIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

type SellerOnboardingProps = {
    navigation: any;
};

export const SellerOnboarding: React.FC<SellerOnboardingProps> = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'pending' | 'active'>('pending');

    const handleOnboarding = async () => {
        setLoading(true);
        try {
            // 1. Call Edge Function to get Onboarding Link
            // Since we don't have this function yet, we'll simulate the "Link Creation" 
            // In production: Create Stripe account via API, get account link, open in browser.

            Alert.alert(
                'Modo de Demonstração',
                'Em produção, isso redirecionaria para o Stripe Connect Onboarding.\n\nPara fins de teste, vamos ativar sua conta agora.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Simular Ativação', onPress: simulateActivation }
                ]
            );

        } catch (error: any) {
            console.error('Onboarding error:', error);
            Alert.alert('Erro', 'Falha ao iniciar onboarding');
        } finally {
            setLoading(false);
        }
    };

    const simulateActivation = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Check if seller account exists
            const { data: existing } = await supabase
                .from('seller_accounts')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (existing) {
                await supabase
                    .from('seller_accounts')
                    .update({
                        charges_enabled: true,
                        payouts_enabled: true,
                        onboarding_complete: true
                    })
                    .eq('user_id', user.id);
            } else {
                await supabase
                    .from('seller_accounts')
                    .insert({
                        user_id: user.id,
                        stripe_account_id: `acct_simulated_${Date.now()}`,
                        charges_enabled: true,
                        payouts_enabled: true,
                        onboarding_complete: true
                    });
            }

            Alert.alert('Sucesso!', 'Sua conta de vendedor foi ativada.');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao ativar conta simulada');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <BackButton style={styles.backButton} />
                    <Text style={styles.headerTitle}>CONFIGURAR PAGAMENTOS</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <VerifiedIcon size={64} color={theme.colors.brand.primary} />
                    </View>

                    <Text style={styles.title}>Receba por suas vendas</Text>

                    <Text style={styles.description}>
                        Para vender no Marketplace, precisamos conectar uma conta bancária para você receber seus pagamentos de forma segura.
                    </Text>

                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Como funciona?</Text>
                        <Text style={styles.infoText}>• Usamos o Stripe Connect para pagamentos seguros.</Text>
                        <Text style={styles.infoText}>• O dinheiro cai direto na sua conta bancária.</Text>
                        <Text style={styles.infoText}>• Taxa da plataforma: 5% por venda.</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleOnboarding}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>CONECTAR CONTA</Text>
                        )}
                    </TouchableOpacity>
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
});
