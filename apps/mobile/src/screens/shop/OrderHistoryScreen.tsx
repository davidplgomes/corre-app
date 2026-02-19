import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, BackButton } from '../../components/common';
import { getOrderHistory } from '../../services/supabase/wallet';
import { Order } from '../../types';

interface OrderHistoryScreenProps {
    navigation: any;
}

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
    const statusConfig = {
        pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', label: 'Pending' },
        paid: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Paid' },
        processing: { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Processing' },
        shipped: { color: '#6366F1', bg: 'rgba(99, 102, 241, 0.1)', label: 'Shipped' },
        delivered: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Delivered' },
        cancelled: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' },
    };

    const config = statusConfig[status];

    return (
        <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
    );
};

const OrderCard = ({ order, onPress }: { order: Order; onPress: () => void }) => {
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <TouchableOpacity style={styles.orderCard} onPress={onPress}>
            <View style={styles.orderHeader}>
                <View>
                    <Text style={styles.orderNumber}>Order #{order.id.slice(0, 8)}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <OrderStatusBadge status={order.status} />
            </View>

            <View style={styles.orderDetails}>
                <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>Items</Text>
                    <Text style={styles.orderValue}>{order.items?.length || 0}</Text>
                </View>
                <View style={styles.orderRow}>
                    <Text style={styles.orderLabel}>Total</Text>
                    <Text style={styles.orderTotal}>€{Number(order.total_amount).toFixed(2)}</Text>
                </View>
                {order.points_used > 0 && (
                    <View style={styles.orderRow}>
                        <Text style={styles.pointsLabel}>Points Used</Text>
                        <Text style={styles.pointsValue}>{order.points_used}</Text>
                    </View>
                )}
            </View>

            <View style={styles.orderFooter}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.brand.primary} />
            </View>
        </TouchableOpacity>
    );
};

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);

    const loadOrders = useCallback(async () => {
        if (!user?.id) return;

        try {
            const orderData = await getOrderHistory(user.id);
            setOrders(orderData);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrders();
    }, [loadOrders]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <BackButton style={styles.backButton} />
                <Text style={styles.headerTitle}>Order History</Text>
                <View style={{ width: 40 }} />
            </View>

            {orders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={64} color="#666" />
                    <Text style={styles.emptyTitle}>No orders yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Your order history will appear here after your first purchase.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.brand.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
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
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },

    // Order Card
    orderCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    orderDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderDetails: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    orderLabel: {
        fontSize: 14,
        color: '#888',
    },
    orderValue: {
        fontSize: 14,
        color: '#FFF',
    },
    orderTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    pointsLabel: {
        fontSize: 12,
        color: '#10B981',
    },
    pointsValue: {
        fontSize: 12,
        color: '#10B981',
    },
    orderFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    viewDetailsText: {
        fontSize: 14,
        color: theme.colors.brand.primary,
        marginRight: 4,
    },
});

export default OrderHistoryScreen;
