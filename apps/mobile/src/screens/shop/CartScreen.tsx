import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    StatusBar,
    Alert,
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
import { getCartItems, removeFromCart, updateCartQuantity, clearCart } from '../../services/supabase/wallet';
import { getAvailablePoints } from '../../services/supabase/wallet';
import { calculateMaxPointsDiscount } from '../../services/payments';
import { TrashIcon } from '../../components/common/TabIcons';

interface CartScreenProps {
    navigation: any;
}

interface CartItemWithDetails {
    id: string;
    user_id: string;
    item_type: 'shop' | 'marketplace';
    item_id: string;
    quantity: number;
    created_at: string;
    item?: {
        title: string;
        price: number;
        image_url: string | null;
        allow_points_discount?: boolean;
        max_points_discount_percent?: number;
    };
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cartItems, setCartItems] = useState<CartItemWithDetails[]>([]);
    const [availablePoints, setAvailablePoints] = useState(0);
    const [pointsToUse, setPointsToUse] = useState(0);

    const loadCart = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [items, points] = await Promise.all([
                getCartItems(user.id),
                getAvailablePoints(user.id),
            ]);

            const validItems = items.filter(item => item.item !== null);
            setCartItems(validItems);
            setAvailablePoints(points);
        } catch (error) {
            console.error('Error loading cart:', error);
            Alert.alert(t('common.error'), t('cart.loadFailed', 'Failed to load cart items'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadCart();
    }, [loadCart]);

    const handleRemoveItem = async (cartItemId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await removeFromCart(cartItemId);
            setCartItems(prev => prev.filter(item => item.id !== cartItemId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error removing item:', error);
            Alert.alert(t('common.error'), t('cart.removeFailed', 'Failed to remove item'));
        }
    };

    const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
        Haptics.selectionAsync();
        try {
            await updateCartQuantity(cartItemId, newQuantity);
            if (newQuantity <= 0) {
                setCartItems(prev => prev.filter(item => item.id !== cartItemId));
            } else {
                setCartItems(prev =>
                    prev.map(item =>
                        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
                    )
                );
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    const handleClearCart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            t('cart.clearCart', 'Clear Cart'),
            t('cart.clearConfirm', 'Remove all items from cart?'),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('cart.clear', 'Clear'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!user?.id) return;
                        try {
                            await clearCart(user.id);
                            setCartItems([]);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            console.error('Error clearing cart:', error);
                        }
                    },
                },
            ]
        );
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.item?.price || 0) * item.quantity, 0);
    const subtotalCents = Math.round(subtotal * 100);
    const membershipMaxPointsDiscount = calculateMaxPointsDiscount(
        subtotalCents,
        'all',
        availablePoints
    );
    const itemMaxPointsDiscount = cartItems.reduce((sum, item) => {
        const itemPriceCents = Math.round((item.item?.price || 0) * 100);
        const lineSubtotalCents = itemPriceCents * item.quantity;
        if (lineSubtotalCents <= 0) return sum;

        if (item.item?.allow_points_discount === false) {
            return sum;
        }

        const maxPercent = Math.max(0, Math.min(100, item.item?.max_points_discount_percent ?? 20));
        return sum + Math.floor(lineSubtotalCents * (maxPercent / 100));
    }, 0);

    const maxPointsDiscount = Math.min(
        membershipMaxPointsDiscount,
        itemMaxPointsDiscount,
        availablePoints
    );

    useEffect(() => {
        if (pointsToUse > maxPointsDiscount) {
            setPointsToUse(maxPointsDiscount);
        }
    }, [maxPointsDiscount, pointsToUse]);

    const pointsDiscount = Math.min(pointsToUse, maxPointsDiscount) / 100;
    const total = subtotal - pointsDiscount;

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
                                <Text style={styles.headerLabel}>{t('cart.shopping', 'SHOPPING')}</Text>
                                <Text style={styles.headerTitle}>{t('cart.title', 'CART')}</Text>
                            </View>
                        </View>
                        {cartItems.length > 0 && (
                            <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
                                <Text style={styles.clearText}>{t('cart.clear', 'Clear')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {cartItems.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Text style={styles.emptyIcon}>🛒</Text>
                            </View>
                            <Text style={styles.emptyTitle}>{t('cart.emptyTitle', 'Your cart is empty')}</Text>
                            <Text style={styles.emptySubtitle}>
                                {t('cart.emptySubtitle', 'Browse the marketplace to find amazing deals!')}
                            </Text>
                            <TouchableOpacity
                                style={styles.browseButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    navigation.navigate('Marketplace');
                                }}
                            >
                                <Text style={styles.browseButtonText}>{t('cart.browseShop', 'BROWSE SHOP')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <ScrollView
                                style={styles.scrollView}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor="#FFF"
                                    />
                                }
                            >
                                {/* Items Count */}
                                <View style={styles.itemsHeader}>
                                    <Text style={styles.itemsCount}>
                                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                                    </Text>
                                </View>

                                {/* Cart Items */}
                                {cartItems.map((item) => (
                                    <BlurView key={item.id} intensity={20} tint="dark" style={styles.cartItem}>
                                        <View style={styles.cartItemContent}>
                                            <View style={styles.itemImage}>
                                                {item.item?.image_url ? (
                                                    <Image source={{ uri: item.item.image_url }} style={styles.image} />
                                                ) : (
                                                    <Text style={styles.imagePlaceholder}>📦</Text>
                                                )}
                                            </View>
                                            <View style={styles.itemDetails}>
                                                <Text style={styles.itemTitle} numberOfLines={2}>
                                                    {item.item?.title || 'Unknown Item'}
                                                </Text>
                                                <Text style={styles.itemPrice}>
                                                    €{(item.item?.price || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={styles.itemActions}>
                                                <View style={styles.quantityControls}>
                                                    <TouchableOpacity
                                                        style={styles.quantityButton}
                                                        onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                    >
                                                        <Text style={styles.quantityButtonText}>−</Text>
                                                    </TouchableOpacity>
                                                    <Text style={styles.quantityText}>{item.quantity}</Text>
                                                    <TouchableOpacity
                                                        style={styles.quantityButton}
                                                        onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        <Text style={styles.quantityButtonText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <TouchableOpacity
                                                    style={styles.removeButton}
                                                    onPress={() => handleRemoveItem(item.id)}
                                                >
                                                    <TrashIcon size={18} color="#FF4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </BlurView>
                                ))}

                                {/* Points Section */}
                                {availablePoints > 0 && (
                                    <BlurView intensity={20} tint="dark" style={styles.pointsSection}>
                                        <View style={styles.pointsHeader}>
                                            <Text style={styles.pointsIcon}>💰</Text>
                                            <View>
                                                <Text style={styles.pointsTitle}>{t('cart.usePoints', 'Use Points')}</Text>
                                                <Text style={styles.pointsAvailable}>
                                                    {availablePoints.toLocaleString()} pts available
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.pointsControls}>
                                            <TouchableOpacity
                                                style={styles.pointsButton}
                                                onPress={() => setPointsToUse(Math.max(0, pointsToUse - 10))}
                                            >
                                                <Text style={styles.pointsButtonText}>−</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.pointsValue}>{pointsToUse}</Text>
                                            <TouchableOpacity
                                                style={styles.pointsButton}
                                                onPress={() => setPointsToUse(Math.min(maxPointsDiscount, pointsToUse + 10))}
                                            >
                                                <Text style={styles.pointsButtonText}>+</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.maxButton}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setPointsToUse(maxPointsDiscount);
                                                }}
                                            >
                                                <Text style={styles.maxButtonText}>MAX</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </BlurView>
                                )}
                            </ScrollView>

                            {/* Bottom Summary */}
                            <BlurView intensity={40} tint="dark" style={styles.bottomSection}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>{t('cart.subtotal', 'Subtotal')}</Text>
                                    <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
                                </View>
                                {pointsToUse > 0 && (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.discountLabel}>{t('cart.pointsDiscount', 'Points')}</Text>
                                        <Text style={styles.discountValue}>-€{pointsDiscount.toFixed(2)}</Text>
                                    </View>
                                )}
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>{t('cart.total', 'Total')}</Text>
                                    <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.checkoutButton}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        navigation.navigate('Checkout', {
                                            cartItems,
                                            subtotal,
                                            pointsToUse,
                                            total
                                        });
                                    }}
                                >
                                    <Text style={styles.checkoutButtonText}>
                                        {t('cart.proceedToCheckout', 'CHECKOUT')}
                                    </Text>
                                </TouchableOpacity>
                            </BlurView>
                        </>
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
        backgroundColor: 'rgba(0,0,0,0.6)',
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
    clearButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,68,68,0.15)',
    },
    clearText: {
        color: '#FF4444',
        fontSize: 13,
        fontWeight: '700',
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 220,
    },
    itemsHeader: {
        marginBottom: 16,
    },
    itemsCount: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // Cart Item
    cartItem: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cartItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    itemImage: {
        width: 70,
        height: 70,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        fontSize: 28,
    },
    itemDetails: {
        flex: 1,
        marginLeft: 14,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 6,
    },
    itemPrice: {
        fontSize: 17,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    itemActions: {
        alignItems: 'flex-end',
        gap: 10,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quantityButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    quantityText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
        minWidth: 24,
        textAlign: 'center',
    },
    removeButton: {
        padding: 6,
    },

    // Points Section
    pointsSection: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    pointsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    pointsIcon: {
        fontSize: 24,
    },
    pointsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
    },
    pointsAvailable: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    pointsControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pointsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '500',
    },
    pointsValue: {
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
        minWidth: 60,
        textAlign: 'center',
    },
    maxButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 8,
        marginLeft: 'auto',
    },
    maxButtonText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },

    // Upgrade Section
    upgradeSection: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    upgradeLock: {
        fontSize: 20,
    },
    upgradeText: {
        flex: 1,
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
    },
    upgradeLink: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.brand.primary,
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

    // Bottom Section
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 100,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    summaryValue: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: '600',
    },
    discountLabel: {
        fontSize: 14,
        color: theme.colors.success,
    },
    discountValue: {
        fontSize: 14,
        color: theme.colors.success,
        fontWeight: '700',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    checkoutButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    checkoutButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default CartScreen;
