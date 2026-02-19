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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, Button, BackButton } from '../../components/common';
import { getCartItems, removeFromCart, updateCartQuantity, clearCart } from '../../services/supabase/wallet';
import { getAvailablePoints } from '../../services/supabase/wallet';
import { calculateMaxPointsDiscount } from '../../services/payments';
import { CartItem } from '../../types';

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
    };
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
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

            // Filter out items where product details couldn't be loaded
            const validItems = items.filter(item => item.item !== null);

            setCartItems(validItems);
            setAvailablePoints(points);
        } catch (error) {
            console.error('Error loading cart:', error);
            Alert.alert('Error', 'Failed to load cart items');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadCart();
    }, [loadCart]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadCart();
    }, [loadCart]);

    const handleRemoveItem = async (cartItemId: string) => {
        try {
            await removeFromCart(cartItemId);
            setCartItems(prev => prev.filter(item => item.id !== cartItemId));
        } catch (error) {
            console.error('Error removing item:', error);
            Alert.alert('Error', 'Failed to remove item');
        }
    };

    const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
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
        Alert.alert(
            'Clear Cart',
            'Are you sure you want to remove all items?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user?.id) return;
                        try {
                            await clearCart(user.id);
                            setCartItems([]);
                        } catch (error) {
                            console.error('Error clearing cart:', error);
                        }
                    },
                },
            ]
        );
    };

    const subtotal = cartItems.reduce((sum, item) => sum + (item.item?.price || 0) * item.quantity, 0);
    const maxPointsDiscount = calculateMaxPointsDiscount(
        subtotal * 100, // Convert to cents
        profile?.membershipTier || 'free',
        availablePoints
    );
    const pointsDiscount = Math.min(pointsToUse, maxPointsDiscount) / 100;
    const total = subtotal - pointsDiscount;

    const canUsePoints = profile?.membershipTier !== 'free';

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
                <Text style={styles.headerTitle}>Cart</Text>
                {cartItems.length > 0 && (
                    <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
                        <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            {cartItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="cart-outline" size={64} color="#666" />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>
                        Browse the marketplace to find amazing deals!
                    </Text>
                    <Button
                        title="Browse Shop"
                        onPress={() => navigation.navigate('Marketplace')}
                        style={styles.browseButton}
                    />
                </View>
            ) : (
                <>
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
                        {/* Cart Items */}
                        {cartItems.map((item) => (
                            <View key={item.id} style={styles.cartItem}>
                                <View style={styles.itemImage}>
                                    {item.item?.image_url ? (
                                        <Image source={{ uri: item.item.image_url }} style={styles.image} />
                                    ) : (
                                        <Ionicons name="image-outline" size={32} color="#666" />
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
                                <View style={styles.quantityControls}>
                                    <TouchableOpacity
                                        style={styles.quantityButton}
                                        onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    >
                                        <Ionicons name="remove" size={18} color="#FFF" />
                                    </TouchableOpacity>
                                    <Text style={styles.quantityText}>{item.quantity}</Text>
                                    <TouchableOpacity
                                        style={styles.quantityButton}
                                        onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Ionicons name="add" size={18} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => handleRemoveItem(item.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Points Discount Section */}
                        {canUsePoints && availablePoints > 0 && (
                            <View style={styles.pointsSection}>
                                <View style={styles.pointsHeader}>
                                    <Ionicons name="wallet" size={20} color={theme.colors.brand.primary} />
                                    <Text style={styles.pointsTitle}>Use Points</Text>
                                </View>
                                <Text style={styles.pointsAvailable}>
                                    You have {availablePoints} points available
                                </Text>
                                <Text style={styles.pointsMax}>
                                    Max discount: {maxPointsDiscount} points (20% of order)
                                </Text>
                                <View style={styles.pointsInput}>
                                    <TouchableOpacity
                                        style={styles.pointsButton}
                                        onPress={() => setPointsToUse(Math.max(0, pointsToUse - 10))}
                                    >
                                        <Ionicons name="remove" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                    <Text style={styles.pointsValue}>{pointsToUse}</Text>
                                    <TouchableOpacity
                                        style={styles.pointsButton}
                                        onPress={() => setPointsToUse(Math.min(maxPointsDiscount, pointsToUse + 10))}
                                    >
                                        <Ionicons name="add" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.maxButton}
                                        onPress={() => setPointsToUse(maxPointsDiscount)}
                                    >
                                        <Text style={styles.maxButtonText}>MAX</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {!canUsePoints && (
                            <View style={styles.upgradeSection}>
                                <Ionicons name="lock-closed" size={24} color="#888" />
                                <Text style={styles.upgradeText}>
                                    Upgrade to Pro or Club to use points for discounts!
                                </Text>
                                <TouchableOpacity onPress={() => navigation.navigate('SubscriptionScreen')}>
                                    <Text style={styles.upgradeLink}>Upgrade Now</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>

                    {/* Bottom Summary */}
                    <View style={styles.bottomSection}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Subtotal</Text>
                            <Text style={styles.summaryValue}>€{subtotal.toFixed(2)}</Text>
                        </View>
                        {pointsToUse > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.discountLabel}>Points Discount</Text>
                                <Text style={styles.discountValue}>-€{pointsDiscount.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>€{total.toFixed(2)}</Text>
                        </View>
                        <Button
                            title="Proceed to Checkout"
                            onPress={() => navigation.navigate('Checkout', {
                                cartItems,
                                subtotal,
                                pointsToUse,
                                total
                            })}
                            style={styles.checkoutButton}
                        />
                    </View>
                </>
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
    clearButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    clearText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 200,
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
    browseButton: {
        marginTop: 24,
    },

    // Cart Item
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    itemImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    itemDetails: {
        flex: 1,
        marginLeft: 12,
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        marginTop: 4,
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
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        minWidth: 24,
        textAlign: 'center',
    },
    removeButton: {
        padding: 8,
        marginLeft: 8,
    },

    // Points Section
    pointsSection: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,107,53,0.3)',
    },
    pointsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    pointsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    pointsAvailable: {
        fontSize: 14,
        color: '#888',
    },
    pointsMax: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    pointsInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 12,
    },
    pointsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pointsValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        minWidth: 60,
        textAlign: 'center',
    },
    maxButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 8,
        marginLeft: 'auto',
    },
    maxButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },

    // Upgrade Section
    upgradeSection: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        alignItems: 'center',
    },
    upgradeText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 8,
    },
    upgradeLink: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.brand.primary,
        marginTop: 8,
    },

    // Bottom Section
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1A1A',
        padding: 16,
        paddingBottom: 34,
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
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
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
    checkoutButton: {
        marginTop: 16,
    },
});

export default CartScreen;
