import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    StatusBar,
    Alert,
    Modal,
    RefreshControl,
    ImageBackground
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '../../components/common';
import { getMarketplaceItems, getShopItems, createMarketplaceItem } from '../../services/supabase/marketplace';
import { MarketplaceItem, ShopItem } from '../../types';

type MarketplaceScreenProps = {
    navigation: any;
};

// Toggle Option Component with Glass
const ToggleOption: React.FC<{
    label: string;
    isActive: boolean;
    onPress: () => void;
}> = ({ label, isActive, onPress }) => (
    <TouchableOpacity
        style={[styles.toggleOption, isActive && styles.toggleOptionActive]}
        onPress={() => {
            Haptics.selectionAsync();
            onPress();
        }}
    >
        <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export const MarketplaceScreen: React.FC<MarketplaceScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const [viewMode, setViewMode] = useState<'shop' | 'community'>('shop');

    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const [communityItems, setCommunityItems] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create Modal State
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [creating, setCreating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [shopData, communityData] = await Promise.all([
                getShopItems(),
                getMarketplaceItems()
            ]);
            setShopItems(shopData);
            setCommunityItems(communityData);
        } catch (error) {
            console.error('Error loading marketplace:', error);
            // Fallback empty if error (table might be empty)
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadData();
    };

    const handleCreateItem = async () => {
        if (!newItemTitle || !newItemPrice) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('common.error'), t('errors.fillAllFields'));
            return;
        }

        if (!profile?.id) return;

        setCreating(true);
        try {
            await createMarketplaceItem({
                seller_id: profile.id,
                title: newItemTitle,
                description: 'User listing', // Simplified for now
                price: parseFloat(newItemPrice),
                image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', // Default placeholder
                category: 'gear',
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t('common.success'), t('success.itemAnnounced'));
            setCreateModalVisible(false);
            setNewItemTitle('');
            setNewItemPrice('');
            loadData(); // Reload
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('common.error'), t('errors.createAd'));
        } finally {
            setCreating(false);
        }
    };

    const renderItem = ({ item }: { item: ShopItem | MarketplaceItem }) => {
        const isShop = viewMode === 'shop';
        const priceLabel = isShop
            ? `${(item as ShopItem).points_price} pts`
            : `€${(item as MarketplaceItem).price}`;

        const imageUrl: string = item.image_url ?? 'https://images.unsplash.com/photo-1556906250-9632af38096b?w=500&q=80'; // Fallback

        return (
            <BlurView intensity={20} tint="dark" style={styles.productCard}>
                <TouchableOpacity
                    style={styles.cardInternal}
                    onPress={() => {
                        Haptics.selectionAsync();
                        navigation.navigate('ProductDetail', { product: item, type: viewMode });
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                        {isShop && (item as ShopItem).stock < 5 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{t('marketplace.fewUnits').toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.productInfo}>
                        <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.priceContainer}>
                            <Text style={[styles.priceValue, !isShop && styles.priceValueCash]}>
                                {priceLabel}
                            </Text>
                        </View>
                        {!isShop && (
                            <Text style={styles.sellerName} numberOfLines={1}>
                                {t('marketplace.by')} {(item as MarketplaceItem).users?.full_name || 'Vendedor'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </BlurView>
        );
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

                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLabel}>{t('marketplace.shop').toUpperCase()}</Text>
                            <Text style={styles.headerTitle}>{t('marketplace.title').toUpperCase()}</Text>
                        </View>
                        <View style={styles.balanceContainer}>
                            <Text style={styles.balanceLabel}>{t('marketplace.pointsBalance').toUpperCase()}</Text>
                            <Text style={styles.balanceValue}>{profile?.currentMonthPoints || 0}</Text>
                        </View>
                    </View>

                    {/* Toggle */}
                    <View style={styles.toggleContainer}>
                        <BlurView intensity={20} tint="dark" style={styles.toggleWrapper}>
                            <ToggleOption
                                label={t('marketplace.correShop').toUpperCase()}
                                isActive={viewMode === 'shop'}
                                onPress={() => setViewMode('shop')}
                            />
                            <ToggleOption
                                label={t('marketplace.community').toUpperCase()}
                                isActive={viewMode === 'community'}
                                onPress={() => setViewMode('community')}
                            />
                        </BlurView>
                    </View>

                    {/* Create Button (Only for Community) */}
                    {viewMode === 'community' && (
                        <TouchableOpacity
                            style={styles.createButtonFloat}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                navigation.navigate('CreateListing');
                            }}
                        >
                            <Text style={styles.createButtonText}>+ {t('marketplace.announce').toUpperCase()}</Text>
                        </TouchableOpacity>
                    )}

                    {/* List */}
                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <LoadingSpinner />
                        </View>
                    ) : (
                        <FlatList
                            data={viewMode === 'shop' ? shopItems : communityItems}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            numColumns={2}
                            columnWrapperStyle={styles.columnWrapper}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#FFF"
                                />
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {viewMode === 'shop'
                                            ? t('marketplace.noShopItems')
                                            : t('marketplace.noCommunityItems')}
                                    </Text>
                                </View>
                            }
                        />
                    )}

                    {/* Create Modal */}
                    <Modal
                        visible={isCreateModalVisible}
                        transparent
                        animationType="slide"
                        onRequestClose={() => setCreateModalVisible(false)}
                    >
                        <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>{t('marketplace.announceProduct')}</Text>

                                <Input
                                    label={t('marketplace.itemTitle').toUpperCase()}
                                    value={newItemTitle}
                                    onChangeText={setNewItemTitle}
                                    placeholder={t('marketplace.titlePlaceholder')}
                                />

                                <Input
                                    label={t('marketplace.price').toUpperCase()}
                                    value={newItemPrice}
                                    onChangeText={setNewItemPrice}
                                    keyboardType="numeric"
                                    placeholder="50.00"
                                />

                                <View style={styles.modalActions}>
                                    <Button
                                        title={t('common.cancel').toUpperCase()}
                                        onPress={() => setCreateModalVisible(false)}
                                        variant="ghost"
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        title={t('marketplace.announce').toUpperCase()}
                                        onPress={handleCreateItem}
                                        loading={creating}
                                        style={{ flex: 1 }}
                                    />
                                </View>
                            </View>
                        </BlurView>
                    </Modal>

                </SafeAreaView>
            </ImageBackground>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    // Removed balanceGlass - no longer used
    balanceContainer: {
        alignItems: 'flex-end', // Right aligned
        // No background, no padding - minimal
    },
    balanceLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    balanceValue: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.brand.primary, // Orange
    },
    toggleContainer: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    toggleWrapper: {
        flexDirection: 'row',
        borderRadius: 30, // Pill
        padding: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    toggleOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 24,
    },
    toggleOptionActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    toggleTextActive: {
        color: '#FFF',
        fontWeight: '900',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    productCard: {
        width: '48%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardInternal: {
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    imageContainer: {
        height: 140,
        backgroundColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#000',
    },
    productInfo: {
        padding: 12,
    },
    productTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    priceValueCash: {
        color: '#FFF',
    },
    sellerName: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        fontSize: 14,
    },
    createButtonFloat: {
        position: 'absolute',
        bottom: 180, // Safely clear TabBar (approx 120px) + margin
        alignSelf: 'center',
        backgroundColor: theme.colors.brand.primary, // Solid orange
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
        zIndex: 100,
    },
    createButtonText: {
        color: '#FFF', // White text
        fontWeight: '700',
        letterSpacing: 1,
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'rgba(20,20,20,0.95)',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
        marginBottom: 24,
        textAlign: 'center',
        color: '#FFF',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
});
