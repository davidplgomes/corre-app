import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    RefreshControl,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { BackButton } from '../../components/common';
import { getSellerListings, updateListingStatus, deleteListing } from '../../services/supabase/marketplace';

type MyListingsProps = {
    navigation: any;
};

interface Listing {
    id: string;
    title: string;
    description: string;
    price_cents: number;
    images: string[];
    category: string;
    condition: string;
    status: 'active' | 'sold' | 'reserved' | 'removed';
    created_at: string;
}

type StatusFilter = 'all' | 'active' | 'sold' | 'removed';

export const MyListings: React.FC<MyListingsProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const filters: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: t('marketplace.filterAll', 'All') },
        { key: 'active', label: t('marketplace.filterActive', 'Active') },
        { key: 'sold', label: t('marketplace.filterSold', 'Sold') },
        { key: 'removed', label: t('marketplace.filterRemoved', 'Archived') },
    ];

    const loadListings = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await getSellerListings(user.id);
            setListings(data || []);
        } catch (error) {
            console.error('Error loading listings:', error);
            Alert.alert(t('common.error'), t('marketplace.errorLoadingListings', 'Failed to load your listings'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, t]);

    useFocusEffect(
        useCallback(() => {
            loadListings();
        }, [loadListings])
    );

    const onRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadListings();
    };

    const filteredListings = listings.filter(listing => {
        if (activeFilter === 'all') return true;
        return listing.status === activeFilter;
    });

    const stats = {
        total: listings.length,
        active: listings.filter(l => l.status === 'active').length,
        sold: listings.filter(l => l.status === 'sold').length,
    };

    const handleEdit = (listing: Listing) => {
        Haptics.selectionAsync();
        navigation.navigate('EditListing', { listingId: listing.id, listing });
    };

    const handleMarkSold = async (listing: Listing) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            t('marketplace.markSoldTitle', 'Mark as Sold'),
            t('marketplace.markSoldMessage', 'This item will be marked as sold and removed from the marketplace.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('marketplace.markSold', 'Mark Sold'),
                    onPress: async () => {
                        setActionLoading(listing.id);
                        try {
                            await updateListingStatus(listing.id, 'sold');
                            await loadListings();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            console.error('Error marking as sold:', error);
                            Alert.alert(t('common.error'), t('marketplace.errorUpdating', 'Failed to update listing'));
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = async (listing: Listing) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            t('marketplace.deleteTitle', 'Delete Listing'),
            t('marketplace.deleteMessage', 'Are you sure you want to delete this listing? This action cannot be undone.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(listing.id);
                        try {
                            await deleteListing(listing.id);
                            setListings(prev => prev.filter(l => l.id !== listing.id));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            console.error('Error deleting listing:', error);
                            Alert.alert(t('common.error'), t('marketplace.errorDeleting', 'Failed to delete listing'));
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleReactivate = async (listing: Listing) => {
        Haptics.selectionAsync();
        setActionLoading(listing.id);
        try {
            await updateListingStatus(listing.id, 'active');
            await loadListings();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error reactivating:', error);
            Alert.alert(t('common.error'), t('marketplace.errorUpdating', 'Failed to update listing'));
        } finally {
            setActionLoading(null);
        }
    };

    const formatPrice = (cents: number) => {
        return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return theme.colors.success;
            case 'sold': return theme.colors.brand.primary;
            case 'reserved': return '#FFC107';
            case 'removed': return 'rgba(255,255,255,0.3)';
            default: return 'rgba(255,255,255,0.5)';
        }
    };

    const renderItem = ({ item }: { item: Listing }) => {
        const isLoading = actionLoading === item.id;

        return (
            <BlurView intensity={15} tint="dark" style={styles.listingCard}>
                <TouchableOpacity
                    style={styles.listingContent}
                    onPress={() => handleEdit(item)}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {/* Image */}
                    <View style={styles.imageContainer}>
                        {item.images && item.images[0] ? (
                            <Image source={{ uri: item.images[0] }} style={styles.listingImage} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Text style={styles.placeholderText}>📷</Text>
                            </View>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Info */}
                    <View style={styles.listingInfo}>
                        <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.listingPrice}>{formatPrice(item.price_cents)}</Text>
                        <Text style={styles.listingMeta}>
                            {item.category} • {item.condition}
                        </Text>
                    </View>

                    {/* Loading Overlay */}
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator color="#FFF" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    {item.status === 'active' && (
                        <>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleEdit(item)}
                                disabled={isLoading}
                            >
                                <Text style={styles.actionText}>{t('common.edit', 'Edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.soldButton]}
                                onPress={() => handleMarkSold(item)}
                                disabled={isLoading}
                            >
                                <Text style={[styles.actionText, styles.soldText]}>{t('marketplace.markSold', 'Mark Sold')}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    {item.status === 'removed' && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.reactivateButton]}
                            onPress={() => handleReactivate(item)}
                            disabled={isLoading}
                        >
                            <Text style={[styles.actionText, styles.reactivateText]}>{t('marketplace.reactivate', 'Reactivate')}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(item)}
                        disabled={isLoading}
                    >
                        <Text style={[styles.actionText, styles.deleteText]}>{t('common.delete', 'Delete')}</Text>
                    </TouchableOpacity>
                </View>
            </BlurView>
        );
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
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <BackButton onPress={() => {
                        Haptics.selectionAsync();
                        navigation.goBack();
                    }} />
                    <View>
                        <Text style={styles.headerLabel}>{t('marketplace.myListings', 'MY LISTINGS').toUpperCase()}</Text>
                        <Text style={styles.headerTitle}>{t('marketplace.inventory', 'INVENTORY')}</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <BlurView intensity={20} tint="dark" style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>{t('marketplace.total', 'TOTAL')}</Text>
                    </BlurView>
                    <BlurView intensity={20} tint="dark" style={styles.statCard}>
                        <Text style={[styles.statValue, { color: theme.colors.success }]}>{stats.active}</Text>
                        <Text style={styles.statLabel}>{t('marketplace.active', 'ACTIVE')}</Text>
                    </BlurView>
                    <BlurView intensity={20} tint="dark" style={styles.statCard}>
                        <Text style={[styles.statValue, { color: theme.colors.brand.primary }]}>{stats.sold}</Text>
                        <Text style={styles.statLabel}>{t('marketplace.sold', 'SOLD')}</Text>
                    </BlurView>
                </View>

                {/* Filters */}
                <View style={styles.filtersContainer}>
                    <FlatList
                        horizontal
                        data={filters}
                        keyExtractor={(item) => item.key}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterPill,
                                    activeFilter === item.key && styles.filterPillActive
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setActiveFilter(item.key);
                                }}
                            >
                                <Text style={[
                                    styles.filterText,
                                    activeFilter === item.key && styles.filterTextActive
                                ]}>
                                    {item.label.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Listings */}
                <FlatList
                    data={filteredListings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
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
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={styles.emptyTitle}>
                                {activeFilter === 'all'
                                    ? t('marketplace.noListings', 'No listings yet')
                                    : t('marketplace.noListingsFilter', 'No listings with this status')}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {t('marketplace.createFirst', 'Create your first listing to start selling')}
                            </Text>
                            {activeFilter === 'all' && (
                                <TouchableOpacity
                                    style={styles.createButton}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        navigation.navigate('CreateListing');
                                    }}
                                >
                                    <Text style={styles.createButtonText}>+ {t('marketplace.createListing', 'Create Listing')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

                {/* FAB */}
                {listings.length > 0 && (
                    <TouchableOpacity
                        style={styles.fab}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('CreateListing');
                        }}
                    >
                        <Text style={styles.fabText}>+ {t('common.new', 'NEW')}</Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
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
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginTop: 4,
    },
    filtersContainer: {
        marginBottom: 16,
    },
    filtersList: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        marginRight: 8,
    },
    filterPillActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    filterText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
    },
    filterTextActive: {
        color: '#FFF',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    listingCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    listingContent: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    listingImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 24,
    },
    statusBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    listingInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    listingTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    listingPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.brand.primary,
        marginBottom: 4,
    },
    listingMeta: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'capitalize',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.7)',
    },
    soldButton: {
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
    },
    soldText: {
        color: theme.colors.success,
    },
    reactivateButton: {},
    reactivateText: {
        color: theme.colors.brand.primary,
    },
    deleteButton: {
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.1)',
    },
    deleteText: {
        color: '#FF4444',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginBottom: 24,
    },
    createButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    createButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: theme.colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
});
