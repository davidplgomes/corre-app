import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Image,
    TouchableOpacity,
    StatusBar,
    Alert,
    ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics'; // Import Haptics
import { theme } from '../../constants/theme';
import { FeedPost } from '../../types';
import { getFeedPosts, getFriendFeedPosts } from '../../services/supabase/feed';
import { getFriends } from '../../services/supabase/friendships';
import { LoadingSpinner, AnimatedListItem } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { useAuth } from '../../contexts/AuthContext';
import { TierKey } from '../../constants/tiers';
import {
    TrophyIcon
} from '../../components/common/TabIcons';
import { MEMBERSHIP_TIERS } from '../../constants/tiers';
import { FeedPostItem } from '../../components/feed/FeedPostItem';

type FeedScreenProps = {
    navigation: any;
};

export const FeedScreen: React.FC<FeedScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'community' | 'friends'>('community');

    const loadPosts = useCallback(async () => {
        try {
            setLoading(true);
            let data: FeedPost[] = [];

            if (activeTab === 'friends') {
                if (profile?.id) {
                    const friends = await getFriends();
                    const friendIds = friends.map(f => f.id);
                    if (friendIds.length > 0) {
                        // Include self in friends feed? Usually yes or no. Let's include ONLY friends for now as requested.
                        data = await getFriendFeedPosts(friendIds);
                    }
                }
            } else {
                data = await getFeedPosts();
            }

            if (data && data.length > 0) {
                setPosts(data);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Error loading feed:', error);
            // Don't show alert on every error to avoid annoyance, just log
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, profile?.id]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const onRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadPosts();
    };

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>{t('navigation.feed').toUpperCase()}</Text>
                    <Text style={styles.headerTitle}>{t('feed.activities').toUpperCase()}</Text>
                </View>
                <TouchableOpacity
                    style={styles.leaderboardButton}
                    onPress={() => {
                        Haptics.selectionAsync();
                        navigation.navigate('Leaderboard');
                    }}
                >
                    <TrophyIcon size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setActiveTab('community');
                    }}
                    style={[styles.tab, activeTab === 'community' && styles.activeTab]}
                >
                    <Text style={[styles.tabText, activeTab === 'community' && styles.activeTabText]}>{t('feed.community').toUpperCase()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setActiveTab('friends');
                    }}
                    style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                >
                    <Text style={styles.tabText}>{t('feed.friends').toUpperCase()}</Text>
                    {activeTab === 'friends' && <View style={styles.activeDot} />}
                </TouchableOpacity>
            </View>
        </View>
    );

    const handleCommentPress = useCallback((postId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const post = posts.find(p => p.id === postId);
        navigation.navigate('PostDetails', { postId, post });
    }, [posts, navigation]);

    const renderPost = useCallback(({ item, index }: { item: FeedPost; index: number }) => (
        <AnimatedListItem index={index} animationType="fadeUp" staggerDelay={60}>
            <FeedPostItem
                item={item}
                onCommentPress={handleCommentPress}
            />
        </AnimatedListItem>
    ), [handleCommentPress]);

    if (loading && !refreshing) {
        return <LoadingSpinner />;
    }

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
                    {renderHeader()}

                    <FlatList
                        data={posts}
                        renderItem={renderPost}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={theme.colors.brand.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{t('feed.noRecentActivity')}</Text>
                                <TouchableOpacity
                                    style={styles.refreshButton}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        loadPosts();
                                    }}
                                >
                                    <Text style={styles.refreshButtonText}>{t('common.refresh')}</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
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
        paddingHorizontal: 24, // Exact match
        paddingTop: 10,       // Exact match
        paddingBottom: 20,    // Exact match
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
    leaderboardButton: {
        backgroundColor: theme.colors.background.card,
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.md, // Soft corners (12px)
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    leaderboardButtonText: {
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.semibold as any,
        fontSize: theme.typography.size.bodySM,
    },
    listContent: {
        paddingHorizontal: theme.spacing[6],
        paddingBottom: 120, // Increased to avoid navbar overlap
    },
    postCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg, // 16px Rounded Cards
        marginBottom: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing[4],
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarPlaceholder: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[3],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    avatarInitial: {
        color: theme.colors.brand.primary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    userName: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    postTime: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.background.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityIcon: {
        fontSize: 16,
    },
    postText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
        lineHeight: 24,
        paddingHorizontal: theme.spacing[4],
        marginBottom: theme.spacing[4],
    },
    actionText: {
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.semibold as any,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: theme.colors.background.secondary,
        paddingVertical: theme.spacing[4],
        paddingHorizontal: theme.spacing[2],
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.subtle,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.text.tertiary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 1,
    },
    statValue: {
        fontSize: theme.typography.size.h5,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: theme.colors.border.default,
        alignSelf: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        padding: theme.spacing[3],
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.subtle,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing[6],
        paddingVertical: theme.spacing[1],
    },
    actionButtonText: {
        marginLeft: theme.spacing[2],
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.weight.medium as any,
    },
    emptyContainer: {
        padding: theme.spacing[10],
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing[4],
        fontSize: theme.typography.size.bodyMD,
    },
    refreshButton: {
        paddingVertical: theme.spacing[3],
        paddingHorizontal: theme.spacing[6],
        backgroundColor: theme.colors.background.elevated,
        borderRadius: theme.radius.md, // Soft corners
    },
    refreshButtonText: {
        color: theme.colors.brand.primary,
        fontWeight: 'bold',
    },

    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.subtle,
    },
    tab: {
        marginRight: 24,
        paddingBottom: 12,
        position: 'relative',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#FFF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text.tertiary,
        letterSpacing: 0.5,
    },
    activeTabText: {
        color: '#FFF',
    },
    activeDot: {
        position: 'absolute',
        top: 0,
        right: -6,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.brand.primary,
    },
});
