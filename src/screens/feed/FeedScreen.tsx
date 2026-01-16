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
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics'; // Import Haptics
import { theme } from '../../constants/theme';
import { FeedPost } from '../../types';
import { getFeedPosts } from '../../services/supabase/feed';
import { LoadingSpinner } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { useAuth } from '../../contexts/AuthContext';
import { TierKey } from '../../constants/tiers';
import {
    RunIcon,
    PinIcon,
    TextIcon,
    HeartIcon,
    ChatBubbleIcon
} from '../../components/common/TabIcons';

type FeedScreenProps = {
    navigation: any;
};

export const FeedScreen: React.FC<FeedScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadPosts = useCallback(async () => {
        try {
            const data = await getFeedPosts();
            if (data && data.length > 0) {
                setPosts(data);
            } else {
                setPosts([]);
            }
        } catch (error) {
            console.error('Error loading feed:', error);
            Alert.alert('Erro', 'Não foi possível carregar o feed.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const onRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadPosts();
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.headerLabel}>SOCIAL</Text>
                <Text style={styles.headerTitle}>Atividades</Text>
            </View>
            <TouchableOpacity
                style={styles.leaderboardButton}
                onPress={() => {
                    Haptics.selectionAsync();
                    navigation.navigate('Leaderboard');
                }}
            >
                <Text style={styles.leaderboardButtonText}>🏆 Ranking</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPost = ({ item }: { item: FeedPost }) => {
        const user = item.users as any;

        let IconComponent = RunIcon;
        let action = t('events.activityRun');
        let iconColor = theme.colors.brand.primary;

        if (item.activity_type === 'check_in') {
            IconComponent = PinIcon;
            action = t('events.activityCheckIn');
            iconColor = theme.colors.success;
        } else if (item.activity_type === 'post') {
            IconComponent = TextIcon;
            action = t('events.activityPost');
            iconColor = theme.colors.warning;
        }

        return (
            <View style={styles.postCard}>
                <View style={styles.postHeader}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>{user?.full_name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.userRow}>
                                <Text style={styles.userName}>{user?.full_name || 'Usuário'}</Text>
                                {user?.membership_tier && (
                                    <TierBadge tier={user.membership_tier as TierKey} size="small" />
                                )}
                            </View>
                            <Text style={styles.postTime}>
                                {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                        <IconComponent size={18} color={iconColor} />
                    </View>
                </View>

                {item.content && (
                    <Text style={styles.postText}>
                        <Text style={styles.actionText}>{action ? action + ' ' : ''}</Text>
                        {item.content}
                    </Text>
                )}

                {item.activity_type === 'run' && item.meta_data && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('events.distance') || 'DISTANCE'}</Text>
                            <Text style={styles.statValue}>{item.meta_data.distance || '0km'}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('events.time') || 'TIME'}</Text>
                            <Text style={styles.statValue}>{item.meta_data.time || '00:00'}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{t('events.pace') || 'PACE'}</Text>
                            <Text style={styles.statValue}>{item.meta_data.pace || '-'}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    >
                        <HeartIcon size={20} color={theme.colors.text.tertiary} />
                        <Text style={styles.actionButtonText}>{t('common.like') || 'Curtir'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    >
                        <ChatBubbleIcon size={20} color={theme.colors.text.tertiary} />
                        <Text style={styles.actionButtonText}>{t('common.comment') || 'Comentar'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
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
                            <Text style={styles.emptyText}>Nenhuma atividade recente.</Text>
                            <TouchableOpacity
                                style={styles.refreshButton}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    loadPosts();
                                }}
                            >
                                <Text style={styles.refreshButtonText}>Atualizar</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
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
        paddingBottom: theme.spacing[4],
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
});
