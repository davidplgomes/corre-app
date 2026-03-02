import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, LoadingSpinner, BackButton } from '../../components/common';
import { clearCart } from '../../services/supabase/wallet';
import { createShopPaymentSession } from '../../services/payments';
import { supabase } from '../../services/supabase/client';

interface CheckoutScreenProps {
    navigation: any;
    route: {
        params: {
            cartItems: any[];
            subtotal: number;
            pointsToUse: number;
            total: number;
        };
    };
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation, route }) => {
    const { cartItems, subtotal, pointsToUse, total } = route.params;
    const { t } = useTranslation();
    const { user } = useAuth();
    const { confirmPayment } = useStripe();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'payment' | 'confirmation'>('payment');
    const [cardComplete, setCardComplete] = useState(false);

    /**
     * Poll order status waiting for webhook to confirm payment.
     * Returns final status: 'paid' | 'payment_failed' | 'timeout'
     */
    const pollOrderStatus = async (orderId: string, maxAttempts = 15): Promise<'paid' | 'payment_failed' | 'timeout'> => {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const { data: order } = await supabase
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single();

            if (order?.status === 'paid') {
                return 'paid';
            }
            if (order?.status === 'payment_failed') {
                return 'payment_failed';
            }
        }

        return 'timeout';
    };

    const handlePlaceOrder = async () => {
        if (!user?.id) return;

        if (!cardComplete) {
            Alert.alert(t('common.error'), t('checkout.enterCard', 'Please enter complete card details'));
            return;
        }

        setLoading(true);
        let orderId: string | null = null;
        try {
            const checkoutSession = await createShopPaymentSession(pointsToUse);

            if (!checkoutSession.success || !checkoutSession.data) {
                throw new Error(checkoutSession.error || 'Failed to create checkout session');
            }

            const { data: sessionData } = checkoutSession;
            orderId = sessionData.orderId;

            if (sessionData.pointsApproved !== pointsToUse) {
                Alert.alert(
                    t('checkout.pointsAdjusted', 'Points adjusted'),
                    t(
                        'checkout.pointsAdjustedMessage',
                        'Points were adjusted to the maximum discount allowed for this order.'
                    )
                );
            }

            const { error: stripeError } = await confirmPayment(sessionData.clientSecret, {
                paymentMethodType: 'Card',
            });

            if (stripeError) {
                if (stripeError.code === 'Canceled') {
                    if (orderId) {
                        const { error: cancelError } = await supabase.functions.invoke('cancel-shop-payment', {
                            body: { orderId },
                        });

                        if (cancelError) {
                            console.warn('Failed to cancel checkout order on backend:', cancelError);
                        }
                    }

                    Alert.alert(
                        t('checkout.paymentCancelled', 'Payment cancelled'),
                        t('checkout.paymentCancelledMessage', 'Your checkout was cancelled and no charge was made.')
                    );
                    return;
                }

                throw new Error(stripeError.message || 'Payment failed');
            }

            const finalStatus = await pollOrderStatus(orderId);

            if (finalStatus === 'payment_failed') {
                throw new Error('Payment was declined. Please try a different payment method.');
            }

            if (finalStatus === 'timeout') {
                Alert.alert(
                    t('checkout.processing', 'Payment Processing'),
                    t('checkout.processingMessage', 'Your payment is being processed. Check your order history for updates.'),
                    [
                        {
                            text: t('checkout.viewOrders', 'View Orders'),
                            onPress: () => {
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'OrderHistory' }],
                                });
                            },
                        },
                    ]
                );
                return;
            }

            await clearCart(user.id);
            setStep('confirmation');
        } catch (error: any) {
            console.error('Checkout error:', error);
            if (orderId) {
                await supabase
                    .from('orders')
                    .update({
                        status: 'payment_failed',
                        failure_reason: error?.message || 'Checkout failed',
                    })
                    .eq('id', orderId)
                    .neq('status', 'paid');
            }
            Alert.alert(t('common.error'), error.message || t('checkout.orderFailed', 'Failed to complete order'));
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>{t('checkout.processingOrder', 'Processing your order...')}</Text>
            </View>
        );
    }

    if (step === 'confirmation') {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="light-content" />
                <View style={styles.confirmationContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                    </View>
                    <Text style={styles.successTitle}>{t('checkout.orderPlaced', 'Order Placed!')}</Text>
                    <Text style={styles.successSubtitle}>
                        {t('checkout.orderConfirmation', "Thank you for your purchase. You'll receive a confirmation email shortly.")}
                    </Text>
                    <Button
                        title={t('checkout.viewOrders', 'View Orders')}
                        onPress={() => navigation.navigate('OrderHistory')}
                        style={styles.viewOrdersButton}
                    />
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Text style={styles.continueLink}>{t('checkout.continueShopping', 'Continue Shopping')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
                <Text style={styles.headerTitle}>{t('checkout.title', 'Checkout')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.sectionTitle}>{t('checkout.paymentMethod', 'Payment Method')}</Text>

                    <View style={styles.paymentOption}>
                        <View style={styles.paymentRadio}>
                            <View style={styles.radioOuter}>
                                <View style={styles.radioInner} />
                            </View>
                        </View>
                        <Ionicons name="card" size={24} color={theme.colors.brand.primary} />
                        <Text style={styles.paymentLabel}>{t('checkout.creditDebit', 'Credit/Debit Card')}</Text>
                    </View>

                    <View style={styles.cardInputs}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('checkout.cardDetails', 'Card Details')}</Text>
                            <CardField
                                postalCodeEnabled={false}
                                placeholders={{
                                    number: '4242 4242 4242 4242',
                                }}
                                cardStyle={{
                                    backgroundColor: theme.colors.background.elevated,
                                    textColor: '#FFFFFF',
                                    placeholderColor: '#666666',
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.1)',
                                }}
                                style={styles.cardField}
                                onCardChange={(cardDetails) => {
                                    setCardComplete(Boolean(cardDetails.complete));
                                }}
                            />
                            <Text style={styles.cardHint}>
                                🔒 {t('checkout.stripeSecure', 'Your card information is securely processed by Stripe')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.pickupInfoCard}>
                        <Ionicons name="storefront-outline" size={20} color={theme.colors.brand.primary} />
                        <Text style={styles.pickupInfoText}>
                            {t('checkout.localPickupOnly', 'All shop items are available for local pickup only.')}
                        </Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={styles.sectionTitle}>{t('checkout.orderSummary', 'Order Summary')}</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('checkout.items', 'Items')} ({cartItems.length})</Text>
                            <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
                        </View>
                        {pointsToUse > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.discountLabel}>{t('cart.pointsDiscount', 'Points Discount')}</Text>
                                <Text style={styles.discountValue}>-€{(pointsToUse / 100).toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{t('checkout.pickup', 'Pickup')}</Text>
                            <Text style={styles.summaryValue}>{t('checkout.localOnly', 'Local only')}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>{t('cart.total', 'Total')}</Text>
                            <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.bottomSection}>
                    <Button
                        title={`${t('checkout.pay', 'Pay')} €${total.toFixed(2)}`}
                        onPress={handlePlaceOrder}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: theme.colors.text.secondary,
        marginTop: 16,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {},
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,107,53,0.3)',
    },
    paymentRadio: {
        marginRight: 12,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.brand.primary,
    },
    paymentLabel: {
        fontSize: 16,
        color: '#FFF',
        marginLeft: 12,
    },
    cardInputs: {
        marginBottom: 16,
    },
    cardField: {
        width: '100%',
        height: 50,
        marginVertical: 8,
    },
    cardHint: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
        marginTop: 8,
        textAlign: 'center',
    },
    pickupInfoCard: {
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.background.elevated,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    pickupInfoText: {
        flex: 1,
        color: theme.colors.text.secondary,
        fontSize: 13,
        lineHeight: 18,
    },
    summaryCard: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 12,
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    summaryValue: {
        fontSize: 14,
        color: '#FFF',
    },
    discountLabel: {
        fontSize: 14,
        color: '#10B981',
    },
    discountValue: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    bottomSection: {
        padding: 16,
        paddingBottom: 34,
        backgroundColor: theme.colors.background.elevated,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    confirmationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    successSubtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    viewOrdersButton: {
        width: '100%',
    },
    continueLink: {
        fontSize: 14,
        color: theme.colors.brand.primary,
        marginTop: 16,
    },
});

export default CheckoutScreen;
