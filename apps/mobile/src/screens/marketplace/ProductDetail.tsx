import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { CloseIcon } from '../../components/common/TabIcons';
import { supabase } from '../../services/supabase/client';
import { getWalletBalance, consumePoints } from '../../services/supabase/wallet';
import { useAuth } from '../../contexts/AuthContext';

type ProductDetailProps = {
    route: any;
    navigation: any;
};

export const ProductDetail: React.FC<ProductDetailProps> = ({ route, navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { product } = route.params || {};
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    if (!product) {
        return null;
    }

    const handleRedeem = async () => {
        // 1. If Community Item -> Pay with Stripe
        const isCommunity = !product.points_price && !product.points;
        const listingId = product.id;

        if (isCommunity) {
            try {
                // Call Edge Function
                const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
                    body: { listing_id: listingId }
                });

                if (error) throw error;
                if (data?.error) throw new Error(data.error);

                // Init Stripe Sheet
                const { error: initError } = await initPaymentSheet({
                    merchantDisplayName: 'Corre Marketplace',
                    paymentIntentClientSecret: data.clientSecret,
                    appearance: {
                        colors: {
                            primary: theme.colors.brand.primary,
                            background: '#1A1A1A',
                            componentBackground: '#2A2A2A',
                            primaryText: '#FFFFFF',
                            secondaryText: '#AAAAAA',
                            placeholderText: '#666666',
                        },
                    }
                });

                if (initError) throw initError;

                // Present
                const { error: stripeError } = await presentPaymentSheet();

                if (stripeError) {
                    if (stripeError.code === 'Canceled') return;
                    throw stripeError;
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Sucesso', 'Compra realizada com sucesso!');
                navigation.goBack();

            } catch (err: any) {
                console.error('Payment error:', err);
                Alert.alert('Erro no Pagamento', err.message || 'Não foi possível iniciar o pagamento.');
            }
            return;
        }

        // 2. If Shop Item -> Redeem with Points
        if (!user) return;

        try {
            const pointsCost = product.points || 0;
            if (pointsCost > 0) {
                // Check balance
                const balance = await getWalletBalance(user.id);
                if (balance.total_available < pointsCost) {
                    Alert.alert('Saldo Insuficiente', `Você precisa de ${pointsCost} pontos. Seu saldo: ${balance.total_available}`);
                    return;
                }

                // Confirm redemption
                Alert.alert(
                    'Confirmar Resgate',
                    `Deseja resgatar este item por ${pointsCost} pontos?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Confirmar',
                            onPress: async () => {
                                try {
                                    await consumePoints(user.id, pointsCost);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    Alert.alert(t('common.success'), 'Item resgatado com sucesso! Verifique seu email.');
                                    navigation.goBack();
                                } catch (error: any) {
                                    console.error('Redemption error:', error);
                                    Alert.alert('Erro', 'Falha ao resgatar item.');
                                }
                            }
                        }
                    ]
                );
            } else {
                // Free item or error
                Alert.alert('Info', 'Este item não tem custo de pontos definido.');
            }

        } catch (error) {
            console.error('Wallet check error:', error);
            Alert.alert('Erro', 'Não foi possível verificar seu saldo.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/run_bg_club.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <ScrollView style={styles.scrollView} bounces={false}>
                    {/* Image Section */}
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: product.image_url || product.image }} style={styles.image} />
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.goBack();
                            }}
                            style={styles.backButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <CloseIcon size={20} color="#FFF" />
                        </TouchableOpacity>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.imageOverlay}
                        />
                    </View>

                    {/* Content Glass */}
                    <BlurView intensity={20} tint="dark" style={styles.contentGlass}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.brand}>{product.brand}</Text>
                                <Text style={styles.title}>{product.title}</Text>
                            </View>
                            <View style={styles.pointsBadge}>
                                <Text style={styles.pointsValue}>{product.points_price || product.points || product.price}</Text>
                                <Text style={styles.pointsLabel}>{(product.points_price || product.points) ? 'pts' : 'EUR'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('marketplace.description').toUpperCase()}</Text>
                            <Text style={styles.description}>
                                {product.description || t('marketplace.description') + '...'}
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('marketplace.details').toUpperCase()}</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('marketplace.category')}</Text>
                                <Text style={styles.detailValue}>{product.category}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>{t('marketplace.availability')}</Text>
                                <Text style={styles.detailValue}>{t('marketplace.inStock')}</Text>
                            </View>
                        </View>

                        {/* Space for bottom button */}
                        <View style={{ height: 120 }} />
                    </BlurView>
                </ScrollView>

                {/* Bottom Action - Fixed at bottom with proper margin */}
                <View style={styles.footerContainer}>
                    <BlurView intensity={30} tint="dark" style={styles.footerGlass}>
                        <TouchableOpacity
                            style={styles.redeemButton}
                            onPress={handleRedeem}
                        >
                            <Text style={styles.redeemText}>
                                {(product.points_price || product.points) ? t('coupons.redeem').toUpperCase() : t('marketplace.contactSeller').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </ImageBackground>
        </View>
    );
};

// Simple LinearGradient replacement
const LinearGradient = ({ colors, style }: any) => (
    <View style={[style, { backgroundColor: 'transparent' }]} />
);

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
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scrollView: {
        flex: 1,
    },
    imageContainer: {
        height: 400,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
    },
    contentGlass: {
        padding: theme.spacing[6],
        marginTop: -40,
        overflow: 'hidden',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent black
        minHeight: 500, // Ensure it fills down
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[6],
    },
    brand: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.bold as any,
        marginBottom: theme.spacing[1],
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        maxWidth: 220,
    },
    pointsBadge: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    pointsValue: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    pointsLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: theme.spacing[6],
    },
    section: {
        marginBottom: theme.spacing[6],
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: theme.spacing[3],
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    description: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 26,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    detailLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    detailValue: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: '700',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 80, // Moved up to avoid navbar overlap
        left: 0,
        right: 0,
    },
    footerGlass: {
        padding: 20,
        paddingBottom: 30, // Extra padding for safe area
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    redeemButton: {
        backgroundColor: theme.colors.brand.primary, // Solid orange
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    redeemText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF', // White text
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
