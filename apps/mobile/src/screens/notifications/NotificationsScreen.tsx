import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, BackButton } from '../../components/common';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../../services/supabase/wallet';
import { Notification } from '../../types';

interface NotificationsScreenProps {
    navigation: any;
}

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    const icons = {
        general: { name: 'notifications', color: '#888' },
        event: { name: 'calendar', color: '#6366F1' },
        points: { name: 'star', color: '#F59E0B' },
        order: { name: 'cube', color: '#10B981' },
        friend: { name: 'people', color: '#EC4899' },
        subscription: { name: 'card', color: '#3B82F6' },
    };

    const config = icons[type] || icons.general;

    return (
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.name as any} size={20} color={config.color} />
        </View>
    );
};

const NotificationItem = ({
    notification,
    onPress
}: {
    notification: Notification;
    onPress: () => void;
}) => {
    const isUnread = !notification.read_at;

    const formatTime = (date: string) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now.getTime() - notifDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return notifDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    return (
        <TouchableOpacity
            style={[styles.notificationItem, isUnread && styles.unreadItem]}
            onPress={onPress}
        >
            <NotificationIcon type={notification.type} />
            <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                    <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    {isUnread && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notificationBody} numberOfLines={2}>
                    {notification.body}
                </Text>
                <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
            </View>
        </TouchableOpacity>
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
        setRefreshing(true);
        loadNotifications();
    }, [loadNotifications]);

    const handleNotificationPress = async (notification: Notification) => {
        if (!notification.read_at) {
            await markNotificationRead(notification.id);
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)
            );
        }

        // Navigate based on notification type
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

        try {
            await markAllNotificationsRead(user.id);
            setNotifications(prev =>
                prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
            );
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.read_at).length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <BackButton onPress={() => navigation.goBack()} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerLabel}>YOUR</Text>
                    <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadButton}>
                        <Text style={styles.markReadText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="notifications-outline" size={64} color="#666" />
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
                            tintColor={theme.colors.brand.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
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

    markReadButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    markReadText: {
        color: theme.colors.brand.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 100,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },

    // Notification Item
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#0A0A0A',
    },
    unreadItem: {
        backgroundColor: 'rgba(255,107,53,0.05)',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#CCC',
        flex: 1,
    },
    unreadTitle: {
        fontWeight: '600',
        color: '#FFF',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.brand.primary,
        marginLeft: 8,
    },
    notificationBody: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
        lineHeight: 20,
    },
    notificationTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 6,
    },
});

export default NotificationsScreen;
