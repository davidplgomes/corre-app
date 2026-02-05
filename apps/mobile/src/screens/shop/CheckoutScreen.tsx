import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, LoadingSpinner } from '../../components/common';
import { clearCart, consumePoints } from '../../services/supabase/wallet';
import { createPaymentIntent, confirmPayment } from '../../services/payments';
import { supabase } from '../../services/supabase/client';
import { ShippingAddress } from '../../types';

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
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'shipping' | 'payment' | 'confirmation'>('shipping');

    const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
        name: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Ireland',
    });

    const updateAddress = (field: keyof ShippingAddress, value: string) => {
        setShippingAddress(prev => ({ ...prev, [field]: value }));
    };

    const validateShipping = (): boolean => {
        if (!shippingAddress.name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return false;
        }
        if (!shippingAddress.line1.trim()) {
            Alert.alert('Error', 'Please enter your address');
            return false;
        }
        if (!shippingAddress.city.trim()) {
            Alert.alert('Error', 'Please enter your city');
            return false;
        }
        if (!shippingAddress.postal_code.trim()) {
            Alert.alert('Error', 'Please enter your postal code');
            return false;
        }
        return true;
    };

    const handleContinueToPayment = () => {
        if (validateShipping()) {
            setStep('payment');
        }
    };

    const handlePlaceOrder = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            // Create order in database
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    total_amount: subtotal,
                    points_used: pointsToUse,
                    cash_amount: total,
                    status: 'pending',
                    shipping_address: shippingAddress,
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Create order items
            const orderItems = cartItems.map(item => ({
                order_id: order.id,
                item_type: item.item_type,
                item_id: item.item_id,
                quantity: item.quantity,
                unit_price: item.item?.price || 0,
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Create payment intent
            const paymentIntent = await createPaymentIntent(
                user.id,
                Math.round(total * 100), // Convert to cents
                pointsToUse
            );

            if (!paymentIntent) {
                throw new Error('Failed to create payment');
            }

            // Confirm payment (in production, this would show Stripe payment sheet)
            const { success, error: paymentError } = await confirmPayment(
                paymentIntent.id,
                user.id,
                order.id
            );

            if (!success) {
                throw new Error(paymentError || 'Payment failed');
            }

            // Consume points if used
            if (pointsToUse > 0) {
                await consumePoints(user.id, pointsToUse);
            }

            // Clear cart
            await clearCart(user.id);

            // Navigate to confirmation
            setStep('confirmation');

        } catch (error: any) {
            console.error('Checkout error:', error);
            Alert.alert('Error', error.message || 'Failed to complete order');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Processing your order...</Text>
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
                    <Text style={styles.successTitle}>Order Placed!</Text>
                    <Text style={styles.successSubtitle}>
                        Thank you for your purchase. You'll receive a confirmation email shortly.
                    </Text>
                    <Button
                        title="View Orders"
                        onPress={() => navigation.navigate('OrderHistory')}
                        style={styles.viewOrdersButton}
                    />
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Text style={styles.continueLink}>Continue Shopping</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => step === 'shipping' ? navigation.goBack() : setStep('shipping')}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Steps */}
            <View style={styles.progressContainer}>
                <View style={styles.progressStep}>
                    <View style={[styles.stepCircle, styles.stepActive]}>
                        <Text style={styles.stepNumber}>1</Text>
                    </View>
                    <Text style={[styles.stepLabel, styles.stepLabelActive]}>Shipping</Text>
                </View>
                <View style={[styles.progressLine, step === 'payment' && styles.progressLineActive]} />
                <View style={styles.progressStep}>
                    <View style={[styles.stepCircle, step === 'payment' && styles.stepActive]}>
                        <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <Text style={[styles.stepLabel, step === 'payment' && styles.stepLabelActive]}>Payment</Text>
                </View>
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
                    {step === 'shipping' && (
                        <>
                            <Text style={styles.sectionTitle}>Shipping Address</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={shippingAddress.name}
                                    onChangeText={(v) => updateAddress('name', v)}
                                    placeholder="John Doe"
                                    placeholderTextColor="#666"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address Line 1</Text>
                                <TextInput
                                    style={styles.input}
                                    value={shippingAddress.line1}
                                    onChangeText={(v) => updateAddress('line1', v)}
                                    placeholder="123 Main Street"
                                    placeholderTextColor="#666"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Address Line 2 (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={shippingAddress.line2}
                                    onChangeText={(v) => updateAddress('line2', v)}
                                    placeholder="Apartment, suite, etc."
                                    placeholderTextColor="#666"
                                />
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.inputLabel}>City</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={shippingAddress.city}
                                        onChangeText={(v) => updateAddress('city', v)}
                                        placeholder="Dublin"
                                        placeholderTextColor="#666"
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.inputLabel}>Postal Code</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={shippingAddress.postal_code}
                                        onChangeText={(v) => updateAddress('postal_code', v)}
                                        placeholder="D01 1234"
                                        placeholderTextColor="#666"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Country</Text>
                                <View style={styles.countrySelect}>
                                    <Text style={styles.countryText}>{shippingAddress.country}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#888" />
                                </View>
                            </View>
                        </>
                    )}

                    {step === 'payment' && (
                        <>
                            <Text style={styles.sectionTitle}>Payment Method</Text>

                            <View style={styles.paymentOption}>
                                <View style={styles.paymentRadio}>
                                    <View style={styles.radioOuter}>
                                        <View style={styles.radioInner} />
                                    </View>
                                </View>
                                <Ionicons name="card" size={24} color={theme.colors.brand.primary} />
                                <Text style={styles.paymentLabel}>Credit/Debit Card</Text>
                            </View>

                            <View style={styles.cardInputs}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Card Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="1234 5678 9012 3456"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                        <Text style={styles.inputLabel}>Expiry</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="MM/YY"
                                            placeholderTextColor="#666"
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                        <Text style={styles.inputLabel}>CVC</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="123"
                                            placeholderTextColor="#666"
                                            keyboardType="numeric"
                                            secureTextEntry
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Order Summary */}
                            <View style={styles.summaryCard}>
                                <Text style={styles.sectionTitle}>Order Summary</Text>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Items ({cartItems.length})</Text>
                                    <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
                                </View>
                                {pointsToUse > 0 && (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.discountLabel}>Points Discount</Text>
                                        <Text style={styles.discountValue}>-€{(pointsToUse / 100).toFixed(2)}</Text>
                                    </View>
                                )}
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Shipping</Text>
                                    <Text style={styles.summaryValue}>Free</Text>
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </ScrollView>

                {/* Bottom Button */}
                <View style={styles.bottomSection}>
                    {step === 'shipping' ? (
                        <Button
                            title="Continue to Payment"
                            onPress={handleContinueToPayment}
                        />
                    ) : (
                        <Button
                            title={`Pay €${total.toFixed(2)}`}
                            onPress={handlePlaceOrder}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
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
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },

    // Progress
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingVertical: 16,
    },
    progressStep: {
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    stepNumber: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    stepLabel: {
        color: '#666',
        fontSize: 12,
        marginTop: 6,
    },
    stepLabelActive: {
        color: '#FFF',
    },
    progressLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#333',
        marginHorizontal: 12,
    },
    progressLineActive: {
        backgroundColor: theme.colors.brand.primary,
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

    // Inputs
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    row: {
        flexDirection: 'row',
    },
    countrySelect: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    countryText: {
        color: '#FFF',
        fontSize: 16,
    },

    // Payment
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
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
        marginBottom: 24,
    },

    // Summary
    summaryCard: {
        backgroundColor: '#1A1A1A',
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
        color: '#888',
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

    // Bottom
    bottomSection: {
        padding: 16,
        paddingBottom: 34,
        backgroundColor: '#1A1A1A',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },

    // Confirmation
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
        color: '#888',
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
