import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    ImageBackground,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { BackButton } from '../../components/common';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../../services/supabase/wallet';
import { Notification } from '../../types';

interface NotificationsScreenProps {
    navigation: any;
}

const NOTIFICATION_ICONS: Record<string, { emoji: string; color: string }> = {
    general: { emoji: '🔔', color: '#888' },
    event: { emoji: '📅', color: '#6366F1' },
    points: { emoji: '⭐', color: '#F59E0B' },
    order: { emoji: '📦', color: '#10B981' },
    friend: { emoji: '👥', color: '#EC4899' },
    subscription: { emoji: '💳', color: '#3B82F6' },
};

const NotificationItem = ({
    notification,
    onPress
}: {
    notification: Notification;
    onPress: () => void;
}) => {
    const isUnread = !notification.read_at;
    const config = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.general;

    const formatTime = (date: string) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now.getTime() - notifDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return notifDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    return (
        <BlurView intensity={isUnread ? 25 : 15} tint="dark" style={styles.notificationItem}>
            <TouchableOpacity
                style={styles.notificationContent}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
                    <Text style={styles.iconEmoji}>{config.emoji}</Text>
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]} numberOfLines={1}>
                            {notification.title}
                        </Text>
                        <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
                    </View>
                    <Text style={styles.notificationBody} numberOfLines={2}>
                        {notification.body}
                    </Text>
                </View>
                {isUnread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        </BlurView>
    );
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const loadNotifications = useCallback(async () => {
        if (!user?.id) return;

        try {
            const data = await getNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadNotifications();
    }, [loadNotifications]);

    const handleNotificationPress = async (notification: Notification) => {
        Haptics.selectionAsync();
        if (!notification.read_at) {
            await markNotificationRead(notification.id);
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
            );
        }

        switch (notification.type) {
            case 'event':
                if (notification.data?.eventId) {
                    navigation.navigate('Events', {
                        screen: 'EventDetail',
                        params: { eventId: notification.data.eventId }
                    });
                }
                break;
            case 'order':
                if (notification.data?.orderId) {
                    navigation.navigate('OrderHistory');
                }
                break;
            case 'friend':
                if (notification.data?.fromUserId) {
                    navigation.navigate('Profile', {
                        screen: 'UserProfile',
                        params: { userId: notification.data.fromUserId }
                    });
                }
                break;
            case 'subscription':
                navigation.navigate('Profile', { screen: 'SubscriptionScreen' });
                break;
            case 'points':
                navigation.navigate('Wallet');
                break;
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await markAllNotificationsRead(user.id);
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read_at).length;

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
                                <Text style={styles.headerLabel}>YOUR</Text>
                                <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
                            </View>
                        </View>
                        {unreadCount > 0 && (
                            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadButton}>
                                <Text style={styles.markReadText}>Mark all read</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Stats */}
                    {notifications.length > 0 && (
                        <View style={styles.statsContainer}>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={styles.statValue}>{unreadCount}</Text>
                                <Text style={styles.statLabel}>Unread</Text>
                            </BlurView>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={[styles.statValue, { color: 'rgba(255,255,255,0.5)' }]}>{notifications.length}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </BlurView>
                        </View>
                    )}

                    {notifications.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Text style={styles.emptyIcon}>🔔</Text>
                            </View>
                            <Text style={styles.emptyTitle}>No notifications</Text>
                            <Text style={styles.emptySubtitle}>
                                You're all caught up! New notifications will appear here.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <NotificationItem
                                    notification={item}
                                    onPress={() => handleNotificationPress(item)}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#FFF"
                                />
                            }
                            showsVerticalScrollIndicator={false}
                        />
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
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
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
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    markReadButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    markReadText: {
        color: theme.colors.brand.primary,
        fontSize: 13,
        fontWeight: '700',
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
        color: theme.colors.brand.primary,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 10,
    },

    // Notification Item
    notificationItem: {
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    notificationContent: {
        flexDirection: 'row',
        padding: 14,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconEmoji: {
        fontSize: 20,
    },
    textContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: '700',
        color: '#FFF',
    },
    notificationTime: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
    },
    notificationBody: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 18,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.brand.primary,
        marginLeft: 10,
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyIcon: {
        fontSize: 44,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
});

export default NotificationsScreen;
