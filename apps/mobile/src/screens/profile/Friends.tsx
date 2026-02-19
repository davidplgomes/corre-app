import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Alert,
    RefreshControl,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { AnimatedListItem, BackButton } from '../../components/common';
import { Skeleton, SkeletonAvatar } from '../../components/common/Skeleton';
import { MEMBERSHIP_TIERS, TierKey } from '../../constants/tiers';
import {
    searchUsers,
    sendFriendRequest,
    getPendingRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    removeFriend,
    cancelFriendRequest,
    getSuggestedFriends,
    UserSearchResult,
    Friendship,
} from '../../services/supabase/friendships';

type FriendsProps = {
    navigation: any;
};

export const Friends: React.FC<FriendsProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
    const [friends, setFriends] = useState<UserSearchResult[]>([]);
    const [suggestedFriends, setSuggestedFriends] = useState<UserSearchResult[]>([]);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [friendsData, requestsData, suggestionsData] = await Promise.all([
                getFriends(),
                getPendingRequests(),
                getSuggestedFriends()
            ]);
            setFriends(friendsData);
            setPendingRequests(requestsData);
            setSuggestedFriends(suggestionsData);
        } catch (error) {
            console.error('Error loading friends data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            const results = await searchUsers(query);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    const handleSendRequest = async (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setProcessingIds(prev => new Set(prev).add(userId));

        const result = await sendFriendRequest(userId);

        setProcessingIds(prev => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
        });

        if (result.success) {
            if (result.autoAccepted) {
                Alert.alert(t('common.success'), t('friends.nowFriends'));
                const updateStatus = (list: UserSearchResult[]) =>
                    list.map(u => u.id === userId ? { ...u, friendship_status: 'accepted' } as const : u);
                setSearchResults(prev => updateStatus(prev));
                setSuggestedFriends(prev => updateStatus(prev));
                loadData(); // Refresh to show in friends list
            } else {
                Alert.alert(t('common.success'), t('friends.requestSent'));
                const updateStatus = (list: UserSearchResult[]) =>
                    list.map(u => u.id === userId ? { ...u, friendship_status: 'pending' } as const : u);
                setSearchResults(prev => updateStatus(prev));
                setSuggestedFriends(prev => updateStatus(prev));
            }
        } else {
            Alert.alert(t('common.error'), t('errors.unknownError'));
        }
    };

    const handleAcceptRequest = async (friendshipId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const success = await acceptFriendRequest(friendshipId);
        if (success) {
            loadData();
        }
    };

    const handleRejectRequest = async (friendshipId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const success = await rejectFriendRequest(friendshipId);
        if (success) {
            loadData();
        }
    };

    const handleRemoveFriend = async (friendId: string) => {
        Alert.alert(
            t('friends.removeFriend'),
            t('friends.confirmRemove'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        const success = await removeFriend(friendId);
                        if (success) {
                            loadData();
                        }
                    },
                },
            ]
        );
    };

    const handleCancelRequest = async (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const success = await cancelFriendRequest(userId);
        if (success) {
            const resetStatus = (list: UserSearchResult[]) =>
                list.map(u => u.id === userId ? { ...u, friendship_status: 'none' as const } : u);
            setSearchResults(prev => resetStatus(prev));
            setSuggestedFriends(prev => resetStatus(prev));
            loadData();
        }
    };

    const renderUserItem = ({ item, index }: { item: UserSearchResult; index: number }) => {
        const tierColor = MEMBERSHIP_TIERS[item.membership_tier as TierKey]?.color || theme.colors.border.default;

        const handleViewProfile = () => {
            Haptics.selectionAsync();
            navigation.navigate('UserProfile', { userId: item.id });
        };

        return (
            <AnimatedListItem index={index} animationType="fadeUp" staggerDelay={50}>
                <TouchableOpacity onPress={handleViewProfile} activeOpacity={0.8}>
                    <View style={styles.userCard}>
                        <View style={styles.userInfo}>
                            <View style={[styles.avatar, { borderColor: tierColor }]}>
                                {item.avatar_url ? (
                                    <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={[styles.avatarText, { color: tierColor }]}>
                                        {item.full_name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.userDetails}>
                                <Text style={styles.userName}>{item.full_name?.toUpperCase()}</Text>
                                <Text style={[styles.userTier, { color: tierColor }]}>
                                    {(MEMBERSHIP_TIERS[item.membership_tier as TierKey]?.name || 'Member').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        {item.friendship_status === 'none' && (
                            <TouchableOpacity
                                style={[styles.addButton, processingIds.has(item.id) && { opacity: 0.7 }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    if (!processingIds.has(item.id)) {
                                        handleSendRequest(item.id);
                                    }
                                }}
                                disabled={processingIds.has(item.id)}
                            >
                                <Text style={styles.addButtonText}>
                                    {processingIds.has(item.id) ? '...' : '+'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        {item.friendship_status === 'pending' && (
                            <View style={styles.pendingRow}>
                                <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingText}>{t('friends.pending').toUpperCase()}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleCancelRequest(item.id);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {item.friendship_status === 'accepted' && (
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFriend(item.id);
                                }}
                            >
                                <Text style={styles.removeButtonText}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </AnimatedListItem>
        );
    };

    const renderRequestItem = ({ item, index }: { item: Friendship; index: number }) => {
        const requester = item.requester as any;
        const tierColor = MEMBERSHIP_TIERS[requester?.membership_tier as TierKey]?.color || theme.colors.border.default;

        const handleProfilePress = () => {
            if (requester?.id) {
                Haptics.selectionAsync();
                navigation.navigate('UserProfile', { userId: requester.id });
            }
        };

        return (
            <AnimatedListItem index={index} animationType="fadeUp" staggerDelay={50}>
                <BlurView intensity={15} tint="dark" style={styles.userCard}>
                    <TouchableOpacity style={styles.userInfo} onPress={handleProfilePress}>
                        <View style={[styles.avatar, { borderColor: tierColor }]}>
                            {requester?.avatar_url ? (
                                <Image source={{ uri: requester.avatar_url }} style={styles.avatarImage} />
                            ) : (
                                <Text style={[styles.avatarText, { color: tierColor }]}>
                                    {requester?.full_name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            )}
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{requester?.full_name}</Text>
                            <Text style={styles.userTier}>
                                {t('friends.wantsToConnect')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.requestActions}>
                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={() => handleAcceptRequest(item.id)}
                        >
                            <Text style={styles.acceptButtonText}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={() => handleRejectRequest(item.id)}
                        >
                            <Text style={styles.rejectButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </AnimatedListItem>
        );
    };

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
                        <Text style={styles.headerLabel}>{t('profile.title').toUpperCase()}</Text>
                        <Text style={styles.headerTitle}>{t('friends.title').toUpperCase()}</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <BlurView intensity={20} tint="dark" style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('friends.searchPlaceholder')}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                </BlurView>

                {/* Search Results */}
                {searchResults.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('friends.searchResults')}</Text>
                        <FlatList
                            data={searchResults}
                            renderItem={renderUserItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    </View>
                )}

                {/* Suggested Friends Skeleton */}
                {searchResults.length === 0 && loading && suggestedFriends.length === 0 && (
                    <View style={styles.section}>
                        <Skeleton width={140} height={14} style={{ marginBottom: 14 }} />
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={[styles.userCard, { marginBottom: 10 }]}>
                                <View style={styles.userInfo}>
                                    <SkeletonAvatar size={44} style={{ marginRight: 14 }} />
                                    <View style={{ flex: 1 }}>
                                        <Skeleton width={110} height={13} style={{ marginBottom: 6 }} />
                                        <Skeleton width={60} height={9} />
                                    </View>
                                </View>
                                <Skeleton width={36} height={36} borderRadius={18} />
                            </View>
                        ))}
                    </View>
                )}

                {/* Suggested Friends */}
                {searchResults.length === 0 && suggestedFriends.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('friends.suggested')}</Text>
                        <FlatList
                            data={suggestedFriends}
                            renderItem={renderUserItem}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
                        />
                    </View>
                )}

                {/* Tabs */}
                {searchResults.length === 0 && (
                    <>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                                onPress={() => setActiveTab('friends')}
                            >
                                <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                                    {t('friends.myFriends')} ({friends.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                                onPress={() => setActiveTab('requests')}
                            >
                                <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                                    {t('friends.pendingRequests')} ({pendingRequests.length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {activeTab === 'friends' ? (
                            <FlatList
                                data={friends}
                                renderItem={renderUserItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={() => {
                                            setRefreshing(true);
                                            loadData();
                                        }}
                                        tintColor="#FFF"
                                    />
                                }
                                ListEmptyComponent={
                                    loading ? (
                                        <View style={styles.listContent}>
                                            {[0, 1, 2, 3].map((i) => (
                                                <View key={i} style={[styles.userCard, { marginBottom: 10 }]}>
                                                    <View style={styles.userInfo}>
                                                        <SkeletonAvatar size={44} style={{ marginRight: 14 }} />
                                                        <View style={{ flex: 1 }}>
                                                            <Skeleton width={120} height={13} style={{ marginBottom: 6 }} />
                                                            <Skeleton width={65} height={9} />
                                                        </View>
                                                    </View>
                                                    <Skeleton width={36} height={36} borderRadius={18} />
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <View style={styles.emptyContainer}>
                                            <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
                                        </View>
                                    )
                                }
                            />
                        ) : (
                            <FlatList
                                data={pendingRequests}
                                renderItem={renderRequestItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={() => {
                                            setRefreshing(true);
                                            loadData();
                                        }}
                                        tintColor="#FFF"
                                    />
                                }
                                ListEmptyComponent={
                                    loading ? (
                                        <View style={styles.listContent}>
                                            {[0, 1, 2].map((i) => (
                                                <View key={i} style={[styles.userCard, { marginBottom: 10 }]}>
                                                    <View style={styles.userInfo}>
                                                        <SkeletonAvatar size={44} style={{ marginRight: 14 }} />
                                                        <View style={{ flex: 1 }}>
                                                            <Skeleton width={100} height={13} style={{ marginBottom: 6 }} />
                                                            <Skeleton width={55} height={9} />
                                                        </View>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                                        <Skeleton width={70} height={32} borderRadius={16} />
                                                        <Skeleton width={70} height={32} borderRadius={16} />
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <View style={styles.emptyContainer}>
                                            <Text style={styles.emptyText}>{t('friends.noRequests')}</Text>
                                        </View>
                                    )
                                }
                            />
                        )}
                    </>
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
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
    searchContainer: {
        marginHorizontal: 20,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        color: '#FFF',
        fontSize: 16,
    },
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
        marginBottom: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    tab: {
        flex: 1,
        paddingBottom: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#FFF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.5)',
    },
    activeTabText: {
        color: '#FFF',
    },
    listContent: {
        padding: 20,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingLeft: 12,
        borderRadius: 16,
        marginBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        marginRight: 14,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '900',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 3,
        letterSpacing: 0.5,
    },
    userTier: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: theme.colors.brand.primary,
        fontWeight: '900',
        fontSize: 24,
    },
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pendingBadge: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    pendingText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
    },
    cancelButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,80,80,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,80,80,0.2)',
    },
    cancelButtonText: {
        color: '#FF6464',
        fontSize: 12,
        fontWeight: '900',
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,80,80,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,80,80,0.2)',
    },
    removeButtonText: {
        color: '#FF6464',
        fontSize: 14,
        fontWeight: '900',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    acceptButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    rejectButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,100,100,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButtonText: {
        color: '#FF6464',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
    },
});
