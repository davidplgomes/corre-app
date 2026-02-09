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
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, Button } from '../../components/common';
import { getOrder } from '../../services/supabase/wallet';
import { Order } from '../../types';

interface OrderDetailScreenProps {
    navigation: any;
    route: {
        params: {
            orderId: string;
        };
    };
}

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
    const statusConfig = {
        pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', label: 'Pending', icon: 'time-outline' },
        paid: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Paid', icon: 'checkmark-circle-outline' },
        processing: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Processing', icon: 'cube-outline' },
        shipped: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', label: 'Shipped', icon: 'airplane-outline' },
        delivered: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Delivered', icon: 'checkmark-done-outline' },
        cancelled: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled', icon: 'close-circle-outline' },
    };

    const config = statusConfig[status];

    return (
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon as any} size={18} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
    );
};

const OrderTimeline = ({ order }: { order: Order }) => {
    const steps = [
        { key: 'created', label: 'Order Placed', date: order.created_at, complete: true },
        { key: 'paid', label: 'Payment Confirmed', date: order.status !== 'pending' ? order.created_at : null, complete: order.status !== 'pending' },
        { key: 'processing', label: 'Processing', date: null, complete: ['processing', 'shipped', 'delivered'].includes(order.status) },
        { key: 'shipped', label: 'Shipped', date: null, complete: ['shipped', 'delivered'].includes(order.status) },
        { key: 'delivered', label: 'Delivered', date: null, complete: order.status === 'delivered' },
    ];

    return (
        <View style={styles.timeline}>
            {steps.map((step, index) => (
                <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineLeft}>
                        <View style={[
                            styles.timelineDot,
                            step.complete && styles.timelineDotComplete
                        ]}>
                            {step.complete && (
                                <Ionicons name="checkmark" size={12} color="#FFF" />
                            )}
                        </View>
                        {index < steps.length - 1 && (
                            <View style={[
                                styles.timelineLine,
                                step.complete && styles.timelineLineComplete
                            ]} />
                        )}
                    </View>
                    <View style={styles.timelineContent}>
                        <Text style={[
                            styles.timelineLabel,
                            step.complete && styles.timelineLabelComplete
                        ]}>
                            {step.label}
                        </Text>
                        {step.date && (
                            <Text style={styles.timelineDate}>
                                {new Date(step.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
};

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);

    const { orderId } = route.params;

    const loadOrder = useCallback(async () => {
        try {
            const data = await getOrder(orderId);
            setOrder(data);
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrder();
    }, [loadOrder]);

    const handleTrackShipment = () => {
        // In production, this would open the tracking URL
        Linking.openURL('https://track.example.com');
    };

    const handleContactSupport = () => {
        Linking.openURL('mailto:support@corre.app?subject=Order%20' + order?.id);
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
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
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

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
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
                {/* Order Header */}
                <View style={styles.orderHeader}>
                    <View style={styles.orderIdRow}>
                        <Text style={styles.orderIdLabel}>Order</Text>
                        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                    </View>
                    <OrderStatusBadge status={order.status} />
                </View>

                {/* Order Date */}
                <Text style={styles.orderDate}>
                    Placed on {new Date(order.created_at).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                    })}
                </Text>

                {/* Order Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>
                    <OrderTimeline order={order} />
                </View>

                {/* Order Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <View style={styles.itemsCard}>
                        {order.items?.map((item, index) => (
                            <View key={index} style={styles.orderItem}>
                                <View style={styles.itemImageContainer}>
                                    {item.item?.image_url ? (
                                        <Image source={{ uri: item.item.image_url }} style={styles.itemImage} />
                                    ) : (
                                        <Ionicons name="cube-outline" size={24} color="#666" />
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

                {/* Order Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>€{((order.total_amount || 0) + (order.points_used || 0) / 100).toFixed(2)}</Text>
                        </View>
                        {order.points_used && order.points_used > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.discountLabel}>Points Discount ({order.points_used} pts)</Text>
                                <Text style={styles.discountValue}>-€{(order.points_used / 100).toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Shipping</Text>
                            <Text style={styles.summaryValue}>Free</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>€{(order.total_amount || 0).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Shipping Address */}
                {order.shipping_address && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Shipping Address</Text>
                        <View style={styles.addressCard}>
                            <Ionicons name="location-outline" size={20} color="#888" />
                            <View style={styles.addressContent}>
                                <Text style={styles.addressLine}>{order.shipping_address.name}</Text>
                                <Text style={styles.addressLine}>{order.shipping_address.line1}</Text>
                                {order.shipping_address.line2 && (
                                    <Text style={styles.addressLine}>{order.shipping_address.line2}</Text>
                                )}
                                <Text style={styles.addressLine}>
                                    {order.shipping_address.city}, {order.shipping_address.postal_code}
                                </Text>
                                <Text style={styles.addressLine}>{order.shipping_address.country}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionsSection}>
                    {order.status === 'shipped' && (
                        <Button
                            title="Track Shipment"
                            onPress={handleTrackShipment}
                            style={styles.actionButton}
                        />
                    )}
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
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },

    // Order Header
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
        color: '#888',
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
        color: '#888',
        marginBottom: 24,
    },

    // Section
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 12,
    },

    // Timeline
    timeline: {
        backgroundColor: '#1A1A1A',
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
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timelineDotComplete: {
        backgroundColor: theme.colors.brand.primary,
    },
    timelineLine: {
        width: 2,
        height: 32,
        backgroundColor: '#333',
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
        color: '#666',
    },
    timelineLabelComplete: {
        color: '#FFF',
    },
    timelineDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },

    // Items
    itemsCard: {
        backgroundColor: '#1A1A1A',
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
        backgroundColor: '#2A2A2A',
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
        color: '#888',
        marginTop: 4,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },

    // Summary
    summaryCard: {
        backgroundColor: '#1A1A1A',
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

    // Address
    addressCard: {
        flexDirection: 'row',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    addressContent: {
        flex: 1,
    },
    addressLine: {
        fontSize: 14,
        color: '#CCC',
        marginBottom: 2,
    },

    // Actions
    actionsSection: {
        marginTop: 8,
    },
    actionButton: {
        marginBottom: 16,
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
        color: '#888',
    },

    // Error State
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
