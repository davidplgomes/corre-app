import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { FeedPost } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { likePost, unlikePost, hasUserLikedPost, getPostLikesCount } from '../../services/supabase/feed';
import {
    RunIcon,
    PinIcon,
    TextIcon,
    HeartIcon,
    ChatBubbleIcon
} from '../common/TabIcons';
import { useNavigation } from '@react-navigation/native';
import { MEMBERSHIP_TIERS } from '../../constants/tiers';
import { TierKey } from '../../constants/tiers';

type FeedPostItemProps = {
    item: FeedPost;
    onCommentPress?: (postId: string) => void;
};

export const FeedPostItem: React.FC<FeedPostItemProps> = ({ item, onCommentPress }) => {
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const { profile } = useAuth();
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0); // Initialize with 0 for now, fetch real count
    const [loadingLike, setLoadingLike] = useState(false);

    const user = item.users as any;
    const tierKey = (user?.membership_tier as TierKey) || 'free';
    const tierColor = MEMBERSHIP_TIERS[tierKey]?.color || theme.colors.border.default;

    useEffect(() => {
        if (profile?.id) {
            checkLikeStatus();
            fetchLikesCount();
        }
    }, [item.id, profile?.id]);

    const checkLikeStatus = async () => {
        if (!profile?.id) return;
        const hasLiked = await hasUserLikedPost(item.id, profile.id);
        setLiked(hasLiked);
    };

    const fetchLikesCount = async () => {
        const count = await getPostLikesCount(item.id);
        setLikesCount(count);
    };

    const handleLikeToggle = async () => {
        if (!profile?.id || loadingLike) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLoadingLike(true);

        const previousLiked = liked;
        const previousCount = likesCount;

        // Optimistic update
        setLiked(!previousLiked);
        setLikesCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);

        try {
            if (previousLiked) {
                await unlikePost(item.id, profile.id);
            } else {
                await likePost(item.id, profile.id);
            }
        } catch (error) {
            // Revert on error
            setLiked(previousLiked);
            setLikesCount(previousCount);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setLoadingLike(false);
        }
    };

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
        <BlurView intensity={20} tint="dark" style={styles.postCard}>
            <View style={styles.postHeader}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => {
                        // Navigate to UserProfile passing userId
                        if (user?.id) {
                            navigation.navigate('UserProfile', { userId: user.id });
                        }
                    }}
                >
                    <View style={[styles.avatarPlaceholder, { borderColor: tierColor, borderWidth: 2 }]}>
                        <Text style={[styles.avatarInitial, { color: tierColor }]}>{user?.full_name?.charAt(0) || 'U'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={styles.userRow}>
                            <Text style={styles.userName}>{user?.full_name || 'Usuário'}</Text>
                        </View>
                        <Text style={styles.postTime}>
                            {new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </TouchableOpacity>
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
                        <Text style={styles.statLabel}>{t('events.duration') || 'TIME'}</Text>
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
                    onPress={handleLikeToggle}
                    disabled={loadingLike}
                >
                    <HeartIcon
                        size={20}
                        color={liked ? theme.colors.brand.primary : theme.colors.text.tertiary}
                        filled={liked}
                    />
                    <Text style={[
                        styles.actionButtonText,
                        liked && { color: theme.colors.brand.primary }
                    ]}>
                        {likesCount > 0 ? likesCount : t('common.like')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onCommentPress && onCommentPress(item.id)}
                >
                    <ChatBubbleIcon size={20} color={theme.colors.text.tertiary} />
                    <Text style={styles.actionButtonText}>{t('common.comment')}</Text>
                </TouchableOpacity>
            </View>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    postCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
        overflow: 'hidden',
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
    }
});
