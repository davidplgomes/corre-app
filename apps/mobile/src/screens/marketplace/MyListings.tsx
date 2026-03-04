import React, { useState, useCallback } from 'react';
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
    ImageBackground,
    Dimensions,
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
import { PencilIcon, TrashIcon, CheckIcon } from '../../components/common/TabIcons';
import { isPaidMembershipTier } from '../../constants/tiers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2; // padding + gap

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
    const { user, profile } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedListing, setSelectedListing] = useState<string | null>(null);

    const promptUpgradeAndExit = useCallback(() => {
        Alert.alert(
            t('marketplace.communitySellRequiresPaidTitle', 'Paid Plan Required'),
            t(
                'marketplace.communitySellRequiresPaidDescription',
                'Selling in the community marketplace is available only for Pro and Club members.'
            ),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel', onPress: () => navigation.goBack() },
                {
                    text: t('marketplace.upgradeToProClub', 'Upgrade to Pro/Club'),
                    onPress: () => navigation.navigate('Profile', { screen: 'SubscriptionScreen' }),
                },
            ]
        );
    }, [navigation, t]);

    const filters: { key: StatusFilter; label: string; count: number }[] = [
        { key: 'all', label: t('marketplace.filterAll', 'All'), count: listings.length },
        { key: 'active', label: t('marketplace.filterActive', 'Active'), count: listings.filter(l => l.status === 'active').length },
        { key: 'sold', label: t('marketplace.filterSold', 'Sold'), count: listings.filter(l => l.status === 'sold').length },
    ];

    const loadListings = useCallback(async () => {
        if (!user?.id) return;
        if (!isPaidMembershipTier(profile?.membershipTier)) {
            setListings([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
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
    }, [profile?.membershipTier, user?.id, t]);

    useFocusEffect(
        useCallback(() => {
            if (!isPaidMembershipTier(profile?.membershipTier)) {
                setLoading(false);
                promptUpgradeAndExit();
                return;
            }
            loadListings();
        }, [loadListings, profile?.membershipTier, promptUpgradeAndExit])
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
        totalEarnings: listings.filter(l => l.status === 'sold').reduce((sum, l) => sum + l.price_cents, 0),
        activeCount: listings.filter(l => l.status === 'active').length,
        soldCount: listings.filter(l => l.status === 'sold').length,
    };

    const handleEdit = (listing: Listing) => {
        Haptics.selectionAsync();
        setSelectedListing(null);
        navigation.navigate('EditListing', { listingId: listing.id, listing });
    };

    const handleMarkSold = async (listing: Listing) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedListing(null);
        Alert.alert(
            t('marketplace.markSoldTitle', 'Mark as Sold'),
            t('marketplace.markSoldMessage', 'This item will be marked as sold.'),
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
        setSelectedListing(null);
        Alert.alert(
            t('marketplace.deleteTitle', 'Delete Listing'),
            t('marketplace.deleteMessage', 'Are you sure? This cannot be undone.'),
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
        setSelectedListing(null);
        setActionLoading(listing.id);
        try {
            await updateListingStatus(listing.id, 'active');
            await loadListings();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            Alert.alert(t('common.error'), t('marketplace.errorUpdating', 'Failed to update listing'));
        } finally {
            setActionLoading(null);
        }
    };

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency: 'EUR',
        }).format(cents / 100);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active': return { color: theme.colors.success, label: 'LIVE' };
            case 'sold': return { color: theme.colors.brand.primary, label: 'SOLD' };
            case 'reserved': return { color: '#FFC107', label: 'RESERVED' };
            case 'removed': return { color: 'rgba(255,255,255,0.3)', label: 'ARCHIVED' };
            default: return { color: 'rgba(255,255,255,0.5)', label: status.toUpperCase() };
        }
    };

    const renderItem = ({ item, index }: { item: Listing; index: number }) => {
        const isLoading = actionLoading === item.id;
        const isSelected = selectedListing === item.id;
        const statusConfig = getStatusConfig(item.status);

        return (
            <BlurView intensity={20} tint="dark" style={[styles.productCard, index % 2 === 0 && { marginRight: 12 }]}>
                <TouchableOpacity
                    style={styles.cardInternal}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedListing(isSelected ? null : item.id);
                    }}
                    onLongPress={() => handleEdit(item)}
                    activeOpacity={0.8}
                    disabled={isLoading}
                >
                    {/* Image */}
                    <View style={styles.imageContainer}>
                        {item.images && item.images[0] ? (
                            <Image source={{ uri: item.images[0] }} style={styles.productImage} resizeMode="cover" />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Text style={styles.placeholderEmoji}>📦</Text>
                            </View>
                        )}

                        {/* Status Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
                            <Text style={styles.statusText}>{statusConfig.label}</Text>
                        </View>

                        {/* Loading Overlay */}
                        {isLoading && (
                            <View style={styles.imageOverlay}>
                                <ActivityIndicator color="#FFF" />
                            </View>
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.productInfo}>
                        <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.productPrice}>{formatPrice(item.price_cents)}</Text>
                        <Text style={styles.productMeta}>{item.category}</Text>
                    </View>

                    {/* Quick Actions (shown when selected) */}
                    {isSelected && !isLoading && (
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={styles.quickAction}
                                onPress={() => handleEdit(item)}
                            >
                                <PencilIcon size={16} color="#FFF" />
                            </TouchableOpacity>

                            {item.status === 'active' && (
                                <TouchableOpacity
                                    style={[styles.quickAction, styles.quickActionSuccess]}
                                    onPress={() => handleMarkSold(item)}
                                >
                                    <CheckIcon size={16} color="#FFF" />
                                </TouchableOpacity>
                            )}

                            {item.status === 'removed' && (
                                <TouchableOpacity
                                    style={[styles.quickAction, styles.quickActionSuccess]}
                                    onPress={() => handleReactivate(item)}
                                >
                                    <Text style={styles.quickActionText}>↻</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.quickAction, styles.quickActionDanger]}
                                onPress={() => handleDelete(item)}
                            >
                                <TrashIcon size={16} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>
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
                                <Text style={styles.headerLabel}>{t('marketplace.myListings', 'MY LISTINGS').toUpperCase()}</Text>
                                <Text style={styles.headerTitle}>{t('marketplace.inventory', 'INVENTORY')}</Text>
                            </View>
                        </View>

                        {/* Earnings Summary */}
                        <View style={styles.earningsContainer}>
                            <Text style={styles.earningsLabel}>{t('marketplace.earnings', 'EARNINGS')}</Text>
                            <Text style={styles.earningsValue}>{formatPrice(stats.totalEarnings)}</Text>
                        </View>
                    </View>

                    {/* Stats Pills */}
                    <View style={styles.statsContainer}>
                        <BlurView intensity={20} tint="dark" style={styles.statPill}>
                            <Text style={styles.statValue}>{stats.activeCount}</Text>
                            <Text style={styles.statLabel}>{t('marketplace.active', 'Active')}</Text>
                        </BlurView>
                        <BlurView intensity={20} tint="dark" style={styles.statPill}>
                            <Text style={[styles.statValue, { color: theme.colors.brand.primary }]}>{stats.soldCount}</Text>
                            <Text style={styles.statLabel}>{t('marketplace.sold', 'Sold')}</Text>
                        </BlurView>
                    </View>

                    {/* Filter Toggle */}
                    <View style={styles.filterContainer}>
                        <BlurView intensity={20} tint="dark" style={styles.filterWrapper}>
                            {filters.map((filter) => (
                                <TouchableOpacity
                                    key={filter.key}
                                    style={[
                                        styles.filterOption,
                                        activeFilter === filter.key && styles.filterOptionActive
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setActiveFilter(filter.key);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterText,
                                        activeFilter === filter.key && styles.filterTextActive
                                    ]}>
                                        {filter.label.toUpperCase()}
                                    </Text>
                                    {filter.count > 0 && (
                                        <View style={[
                                            styles.filterBadge,
                                            activeFilter === filter.key && styles.filterBadgeActive
                                        ]}>
                                            <Text style={styles.filterBadgeText}>{filter.count}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </BlurView>
                    </View>

                    {/* Listings Grid */}
                    <FlatList
                        data={filteredListings}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        numColumns={2}
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
                                <View style={styles.emptyIconContainer}>
                                    <Text style={styles.emptyIcon}>📦</Text>
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {activeFilter === 'all'
                                        ? t('marketplace.noListings', 'No listings yet')
                                        : t('marketplace.noListingsFilter', 'No items here')}
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {t('marketplace.createFirst', 'Start selling to the community')}
                                </Text>
                                {activeFilter === 'all' && (
                                    <TouchableOpacity
                                        style={styles.emptyButton}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            if (!isPaidMembershipTier(profile?.membershipTier)) {
                                                promptUpgradeAndExit();
                                                return;
                                            }
                                            navigation.navigate('CreateListing');
                                        }}
                                    >
                                        <Text style={styles.emptyButtonText}>+ {t('marketplace.createListing', 'CREATE LISTING')}</Text>
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
                                if (!isPaidMembershipTier(profile?.membershipTier)) {
                                    promptUpgradeAndExit();
                                    return;
                                }
                                navigation.navigate('CreateListing');
                            }}
                        >
                            <Text style={styles.fabIcon}>+</Text>
                        </TouchableOpacity>
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
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
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
    earningsContainer: {
        alignItems: 'flex-end',
    },
    earningsLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 4,
    },
    earningsValue: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },

    // Stats
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        gap: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.5,
    },

    // Filters
    filterContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    filterWrapper: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    filterOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    filterOptionActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    filterText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    filterTextActive: {
        color: '#FFF',
        fontWeight: '900',
    },
    filterBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    filterBadgeActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    filterBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFF',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },

    // Product Card (matching MarketplaceScreen)
    productCard: {
        width: CARD_WIDTH,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
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
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    placeholderEmoji: {
        fontSize: 32,
        opacity: 0.5,
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    productInfo: {
        padding: 12,
    },
    productTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    productPrice: {
        fontSize: 16,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
        marginBottom: 4,
    },
    productMeta: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'capitalize',
        fontWeight: '600',
    },

    // Quick Actions
    quickActions: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        gap: 6,
    },
    quickAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    quickActionSuccess: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    quickActionDanger: {
        backgroundColor: '#FF4444',
        borderColor: '#FF4444',
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyIcon: {
        fontSize: 36,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
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
    emptyButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    emptyButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabIcon: {
        fontSize: 28,
        fontWeight: '300',
        color: '#FFF',
        marginTop: -2,
    },
});
