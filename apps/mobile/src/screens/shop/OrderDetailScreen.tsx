import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Image,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, Button, BackButton } from '../../components/common';
import { getOrder, reconcileStaleShopOrders } from '../../services/supabase/wallet';
import { Order } from '../../types';

interface OrderDetailScreenProps {
    navigation: any;
    route: {
        params: {
            orderId: string;
        };
    };
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', label: 'Pending', icon: 'time-outline' },
    paid: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Paid', icon: 'checkmark-circle-outline' },
    processing: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Preparing', icon: 'cube-outline' },
    ready_for_pickup: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', label: 'Ready for Pickup', icon: 'storefront-outline' },
    picked_up: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Picked Up', icon: 'checkmark-done-outline' },
    shipped: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', label: 'Shipped', icon: 'airplane-outline' },
    delivered: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Delivered', icon: 'checkmark-done-outline' },
    cancelled: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled', icon: 'close-circle-outline' },
    canceled: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled', icon: 'close-circle-outline' },
    payment_failed: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Payment Failed', icon: 'alert-circle-outline' },
    refunded: { color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)', label: 'Refunded', icon: 'return-up-back-outline' },
    disputed: { color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)', label: 'Disputed', icon: 'warning-outline' },
};

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
    const config = statusConfig[status] || statusConfig.pending;

    return (
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={18} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
    );
};

const OrderTimeline = ({ order }: { order: Order }) => {
    const status = String(order.status || '');
    const paymentConfirmed = ['paid', 'processing', 'ready_for_pickup', 'picked_up', 'shipped', 'delivered', 'refunded', 'disputed'].includes(status);
    const inPreparation = ['processing', 'ready_for_pickup', 'picked_up', 'shipped', 'delivered'].includes(status);
    const readyForPickup = ['ready_for_pickup', 'picked_up', 'shipped', 'delivered'].includes(status);
    const pickedUp = ['picked_up', 'delivered'].includes(status);

    const steps = [
        { key: 'created', label: 'Order Placed', date: order.created_at, complete: true },
        { key: 'paid', label: 'Payment Confirmed', date: paymentConfirmed ? order.created_at : null, complete: paymentConfirmed },
        { key: 'processing', label: 'Preparing', date: null, complete: inPreparation },
        { key: 'ready', label: 'Ready for Pickup', date: null, complete: readyForPickup },
        { key: 'picked', label: 'Picked Up', date: null, complete: pickedUp },
    ];

    return (
        <View style={styles.timeline}>
            {steps.map((step, index) => (
                <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                        <View style={[styles.timelineDot, step.complete && styles.timelineDotComplete]}>
                            {step.complete ? <Ionicons name="checkmark" size={12} color="#FFF" /> : null}
                        </View>
                        {index < steps.length - 1 ? (
                            <View style={[styles.timelineLine, step.complete && styles.timelineLineComplete]} />
                        ) : null}
                    </View>
                    <View style={styles.timelineContent}>
                        <Text style={[styles.timelineLabel, step.complete && styles.timelineLabelComplete]}>
                            {step.label}
                        </Text>
                        {step.date ? (
                            <Text style={styles.timelineDate}>
                                {new Date(step.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        ) : null}
                    </View>
                </View>
            ))}
        </View>
    );
};

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ navigation, route }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);

    const { orderId } = route.params;
    const subtotalAmount = Number(order?.total_amount || 0);
    const pointsDiscountAmount = Number(order?.points_used || 0) / 100;
    const chargedAmount = Number(
        order?.cash_amount ??
        Math.max(0, subtotalAmount - pointsDiscountAmount)
    );

    const loadOrder = useCallback(async () => {
        if (!user?.id) return;

        try {
            await reconcileStaleShopOrders(20);
            const data = await getOrder(orderId);
            setOrder(data);
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orderId, user?.id]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrder();
    }, [loadOrder]);

    const handleContactSupport = () => {
        Linking.openURL(`mailto:support@corre.app?subject=Order%20${order?.id || ''}`);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="light-content" />
                <View style={styles.header}>
                    <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
                    <Text style={styles.headerTitle}>Order Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorState}>
                    <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
                    <Text style={styles.errorTitle}>Order Not Found</Text>
                    <Button
                        title="Go Back"
                        onPress={() => navigation.goBack()}
                        style={styles.errorButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
                <Text style={styles.headerTitle}>Order Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand.primary}
                    />
                }
            >
                <View style={styles.orderHeader}>
                    <View style={styles.orderIdRow}>
                        <Text style={styles.orderIdLabel}>Order</Text>
                        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <OrderStatusBadge status={order.status} />
                </View>

                <Text style={styles.orderDate}>
                    Placed on {new Date(order.created_at).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                    })}
                </Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>
                    <OrderTimeline order={order} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <View style={styles.itemsCard}>
                        {order.items?.map((item, index) => (
                            <View key={index} style={styles.orderItem}>
                                <View style={styles.itemImageContainer}>
                                    {item.item?.image_url ? (
                                        <Image source={{ uri: item.item.image_url }} style={styles.itemImage} />
                                    ) : (
                                        <Ionicons name="cube-outline" size={24} color={theme.colors.text.tertiary} />
                                    )}
                                </View>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemTitle} numberOfLines={2}>{item.item?.title || 'Item'}</Text>
                                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                                </View>
                                <Text style={styles.itemPrice}>€{((item.item?.price || 0) * item.quantity).toFixed(2)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>€{subtotalAmount.toFixed(2)}</Text>
                        </View>
                        {order.points_used && order.points_used > 0 ? (
                            <View style={styles.summaryRow}>
                                <Text style={styles.discountLabel}>Points Discount ({order.points_used} pts)</Text>
                                <Text style={styles.discountValue}>-€{pointsDiscountAmount.toFixed(2)}</Text>
                            </View>
                        ) : null}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Pickup</Text>
                            <Text style={styles.summaryValue}>Local</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>€{chargedAmount.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionsSection}>
                    <TouchableOpacity style={styles.supportButton} onPress={handleContactSupport}>
                        <Ionicons name="help-circle-outline" size={20} color="#888" />
                        <Text style={styles.supportText}>Need help? Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    orderIdLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    orderId: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    orderDate: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 12,
    },
    timeline: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 16,
        padding: 16,
    },
    timelineStep: {
        flexDirection: 'row',
    },
    timelineLeft: {
        alignItems: 'center',
        marginRight: 12,
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.gray[700],
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotComplete: {
        backgroundColor: theme.colors.brand.primary,
    },
    timelineLine: {
        width: 2,
        height: 32,
        backgroundColor: theme.colors.gray[700],
    },
    timelineLineComplete: {
        backgroundColor: theme.colors.brand.primary,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 24,
    },
    timelineLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.tertiary,
    },
    timelineLabelComplete: {
        color: '#FFF',
    },
    timelineDate: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    itemsCard: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 16,
        overflow: 'hidden',
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    itemImageContainer: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: theme.colors.background.input,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    itemDetails: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    itemQuantity: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 4,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    summaryCard: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 16,
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
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    actionsSection: {
        marginTop: 8,
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    supportText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    errorState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
        marginBottom: 24,
    },
    errorButton: {
        minWidth: 150,
    },
});

export default OrderDetailScreen;
