import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    ImageBackground,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { BackButton } from '../../components/common';
import { getOrderHistory, reconcileStaleShopOrders } from '../../services/supabase/wallet';
import { Order } from '../../types';
import { ChevronRightIcon } from '../../components/common/TabIcons';

interface OrderHistoryScreenProps {
    navigation: any;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; emoji: string }> = {
    pending: { color: '#F59E0B', label: 'PENDING', emoji: '⏳' },
    paid: { color: '#3B82F6', label: 'PAID', emoji: '✓' },
    processing: { color: '#8B5CF6', label: 'PREPARING', emoji: '⚙️' },
    ready_for_pickup: { color: '#6366F1', label: 'READY', emoji: '🏪' },
    picked_up: { color: '#10B981', label: 'PICKED UP', emoji: '✅' },
    shipped: { color: '#6366F1', label: 'SHIPPED', emoji: '📦' },
    delivered: { color: '#10B981', label: 'DELIVERED', emoji: '✅' },
    cancelled: { color: '#EF4444', label: 'CANCELLED', emoji: '✕' },
    canceled: { color: '#EF4444', label: 'CANCELLED', emoji: '✕' },
    payment_failed: { color: '#EF4444', label: 'FAILED', emoji: '⚠️' },
    refunded: { color: '#06B6D4', label: 'REFUNDED', emoji: '↩' },
    disputed: { color: '#F97316', label: 'DISPUTED', emoji: '⚖️' },
};

const OrderCard = ({ order, onPress }: { order: Order; onPress: () => void }) => {
    const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const chargedAmount = Number(order.cash_amount ?? order.total_amount ?? 0);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <BlurView intensity={20} tint="dark" style={styles.orderCard}>
            <TouchableOpacity
                style={styles.orderCardContent}
                onPress={onPress}
                activeOpacity={0.8}
            >
                {/* Header */}
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderNumber}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                </View>

                {/* Details */}
                <View style={styles.orderDetails}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Items</Text>
                            <Text style={styles.detailValue}>{order.items?.length || 0}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Total</Text>
                            <Text style={styles.detailValueHighlight}>€{chargedAmount.toFixed(2)}</Text>
                        </View>
                        {order.points_used > 0 && (
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Points</Text>
                                <Text style={styles.detailValueSuccess}>-{order.points_used} pts</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.orderFooter}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <ChevronRightIcon size={16} color={theme.colors.brand.primary} />
                </View>
            </TouchableOpacity>
        </BlurView>
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
            await reconcileStaleShopOrders(20);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadOrders();
    }, [loadOrders]);

    const stats = {
        total: orders.length,
        pickedUp: orders.filter(o => ['picked_up', 'delivered'].includes(o.status)).length,
        active: orders.filter(o => ['pending', 'paid', 'processing', 'ready_for_pickup', 'shipped', 'disputed'].includes(o.status)).length,
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            </View>
        );
    }

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
                                <Text style={styles.headerLabel}>YOUR</Text>
                                <Text style={styles.headerTitle}>ORDERS</Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats */}
                    {orders.length > 0 && (
                        <View style={styles.statsContainer}>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={styles.statValue}>{stats.total}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </BlurView>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={[styles.statValue, { color: theme.colors.success }]}>{stats.pickedUp}</Text>
                                <Text style={styles.statLabel}>Picked Up</Text>
                            </BlurView>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.active}</Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </BlurView>
                        </View>
                    )}

                    {orders.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Text style={styles.emptyIcon}>📦</Text>
                            </View>
                            <Text style={styles.emptyTitle}>No orders yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Your order history will appear here after your first purchase.
                            </Text>
                            <TouchableOpacity
                                style={styles.browseButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    navigation.navigate('Marketplace');
                                }}
                            >
                                <Text style={styles.browseButtonText}>BROWSE SHOP</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={orders}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <OrderCard
                                    order={item}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        navigation.navigate('OrderDetail', { orderId: item.id });
                                    }}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#FFF"
                                />
                            }
                            showsVerticalScrollIndicator={false}
                        />
                    )}
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
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },

    // Stats
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 10,
    },
    statPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        gap: 6,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 12,
    },

    // Order Card
    orderCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    orderCardContent: {
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    orderNumber: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    orderDate: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    orderDetails: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 14,
    },
    detailRow: {
        flexDirection: 'row',
        gap: 20,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 4,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
    detailValueHighlight: {
        fontSize: 17,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    detailValueSuccess: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.success,
    },
    orderFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    viewDetailsText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        marginRight: 4,
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyIcon: {
        fontSize: 44,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: 28,
    },
    browseButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    browseButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
});

export default OrderHistoryScreen;
