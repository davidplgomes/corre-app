import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    StatusBar,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase/client';
import { LoadingSpinner } from '../../components/common';
import { SearchIcon, FilterIcon, PlusIcon } from '../../components/common/TabIcons';
import { useAuth } from '../../contexts/AuthContext';

type MarketplaceHomeProps = {
    navigation: any;
};

type Listing = {
    id: string;
    title: string;
    price_cents: number;
    images: string[];
    condition: string;
    seller: {
        full_name: string;
        avatar_url: string | null;
    };
    created_at: string;
};

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [hasListings, setHasListings] = useState(false);

    // Check if user has any listings
    useEffect(() => {
        const checkUserListings = async () => {
            if (!user?.id) return;
            try {
                const { count } = await supabase
                    .from('marketplace_listings')
                    .select('id', { count: 'exact', head: true })
                    .eq('seller_id', user.id);
                setHasListings((count || 0) > 0);
            } catch (error) {
                console.error('Error checking user listings:', error);
            }
        };
        checkUserListings();
    }, [user?.id]);

    const fetchListings = async () => {
        try {
            const { data, error } = await supabase
                .from('marketplace_listings')
                .select(`
                    id, title, price_cents, images, condition, created_at,
                    seller:seller_id (full_name, avatar_url)
                `)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setListings(data || []);
        } catch (error) {
            console.error('Error fetching listings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchListings();
    };

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    };

    const renderItem = ({ item }: { item: Listing }) => (
        <TouchableOpacity
            style={styles.cardContainer}
            onPress={() => navigation.navigate('ListingDetails', { id: item.id })}
            activeOpacity={0.8}
        >
            <View style={styles.cardImageContainer}>
                {item.images && item.images[0] ? (
                    <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
                ) : (
                    <View style={[styles.cardImage, styles.placeholderImage]}>
                        <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                )}
                <BlurView intensity={20} tint="dark" style={styles.priceTag}>
                    <Text style={styles.priceText}>{formatPrice(item.price_cents)}</Text>
                </BlurView>
            </View>

            <BlurView intensity={10} tint="dark" style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.sellerRow}>
                    <View style={styles.avatarContainer}>
                        {item.seller.avatar_url ? (
                            <Image source={{ uri: item.seller.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: theme.colors.brand.secondary }]} />
                        )}
                    </View>
                    <Text style={styles.sellerName} numberOfLines={1}>{item.seller.full_name}</Text>
                </View>
            </BlurView>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>{t('marketplace.community', 'COMMUNITY')}</Text>
                        <Text style={styles.headerTitle}>{t('marketplace.market', 'MARKET')}</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        {hasListings && (
                            <TouchableOpacity
                                style={styles.myListingsButton}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    navigation.navigate('MyListings');
                                }}
                            >
                                <Text style={styles.myListingsText}>{t('marketplace.myListings', 'MY ITEMS')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.sellButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                navigation.navigate('CreateListing');
                            }}
                        >
                            <PlusIcon size={20} color="#000" />
                            <Text style={styles.sellButtonText}>{t('marketplace.sell', 'SELL')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <SearchIcon size={20} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar equipamentos..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton}>
                        <FilterIcon size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* List */}
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <FlatList
                        data={listings}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.brand.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Nenhum item encontrado.</Text>
                            </View>
                        }
                    />
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
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 20,
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
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    myListingsButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    myListingsText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 10,
        letterSpacing: 0.5,
    },
    sellButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    sellButtonText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 0.5,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    filterButton: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardContainer: {
        width: '48%',
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    cardImageContainer: {
        height: 160,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderImage: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontWeight: '700',
    },
    priceTag: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    priceText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 12,
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    avatarContainer: {
        width: 16,
        height: 16,
        borderRadius: 8,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    sellerName: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
});
