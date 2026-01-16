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
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '../../components/common';
import { getMarketplaceItems, getShopItems, createMarketplaceItem } from '../../services/supabase/marketplace';
import { MarketplaceItem, ShopItem } from '../../types';

type MarketplaceScreenProps = {
    navigation: any;
};

// Toggle Option Component
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
            Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
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
            Alert.alert('Sucesso', 'Seu item foi anunciado!');
            setCreateModalVisible(false);
            setNewItemTitle('');
            setNewItemPrice('');
            loadData(); // Reload
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Erro', 'Não foi possível criar o anúncio.');
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
            <TouchableOpacity
                style={styles.productCard}
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
                            <Text style={styles.badgeText}>Poucas und.</Text>
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
                            de {(item as MarketplaceItem).users?.full_name || 'Vendedor'}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>SHOP</Text>
                        <Text style={styles.headerTitle}>Marketplace</Text>
                    </View>
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>SEUS PONTOS</Text>
                        <Text style={styles.balanceValue}>{profile?.currentMonthPoints || 0}</Text>
                    </View>
                </View>

                {/* Toggle */}
                <View style={styles.toggleContainer}>
                    <View style={styles.toggleWrapper}>
                        <ToggleOption
                            label="Loja Corre"
                            isActive={viewMode === 'shop'}
                            onPress={() => setViewMode('shop')}
                        />
                        <ToggleOption
                            label="Comunidade"
                            isActive={viewMode === 'community'}
                            onPress={() => setViewMode('community')}
                        />
                    </View>
                </View>

                {/* Create Button (Only for Community) */}
                {viewMode === 'community' && (
                    <TouchableOpacity
                        style={styles.createButtonFloat}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setCreateModalVisible(true);
                        }}
                    >
                        <Text style={styles.createButtonText}>+ Anunciar</Text>
                    </TouchableOpacity>
                )}

                {/* List */}
                {loading && !refreshing ? (
                    <LoadingSpinner />
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
                                tintColor={theme.colors.brand.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {viewMode === 'shop'
                                        ? 'Nenhum item na loja no momento.'
                                        : 'Nenhum item anunciado pela comunidade.'}
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
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Anunciar Produto</Text>

                            <Input
                                label="Título do Item"
                                value={newItemTitle}
                                onChangeText={setNewItemTitle}
                                placeholder="Ex: Tênis Nike 42"
                            />

                            <Input
                                label="Preço (EUR)"
                                value={newItemPrice}
                                onChangeText={setNewItemPrice}
                                keyboardType="numeric"
                                placeholder="50.00"
                            />

                            <View style={styles.modalActions}>
                                <Button
                                    title="Cancelar"
                                    onPress={() => setCreateModalVisible(false)}
                                    variant="ghost"
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title="Anunciar"
                                    onPress={handleCreateItem}
                                    loading={creating}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[4], // Reduced bottom padding
    },
    headerLabel: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        marginBottom: theme.spacing[1],
    },
    headerTitle: {
        fontSize: theme.typography.size.displaySM,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    balanceContainer: {
        alignItems: 'flex-end',
    },
    balanceLabel: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        marginBottom: 2,
    },
    balanceValue: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
    },
    toggleContainer: {
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[4],
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.full,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    toggleOption: {
        flex: 1,
        paddingVertical: theme.spacing[2],
        alignItems: 'center',
        borderRadius: theme.radius.full,
    },
    toggleOptionActive: {
        backgroundColor: theme.colors.background.elevated,
    },
    toggleText: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.tertiary,
        fontWeight: theme.typography.weight.medium as any,
    },
    toggleTextActive: {
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.bold as any,
    },
    listContent: {
        paddingHorizontal: theme.spacing[6],
        paddingBottom: 120,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: theme.spacing[4],
    },
    productCard: {
        width: '48%',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg, // 16px soft corners
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    imageContainer: {
        height: 140,
        backgroundColor: theme.colors.background.elevated,
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
        backgroundColor: theme.colors.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    productInfo: {
        padding: theme.spacing[3],
    },
    productTitle: {
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[2],
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceValue: {
        fontSize: theme.typography.size.h4,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary, // Points color
    },
    priceValueCash: {
        color: theme.colors.success, // Cash color
    },
    sellerName: {
        fontSize: 10,
        color: theme.colors.text.tertiary,
        marginTop: 4,
    },
    emptyContainer: {
        padding: theme.spacing[6],
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.text.tertiary,
        textAlign: 'center',
    },
    createButtonFloat: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: theme.radius.full,
        zIndex: 100,
        shadowColor: theme.colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: theme.colors.text.primary,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
});
