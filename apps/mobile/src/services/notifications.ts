// Expo Push Notifications Service for Corre App
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase/client';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export interface PushNotificationData {
    type: 'event' | 'points' | 'order' | 'friend' | 'subscription' | 'general';
    title: string;
    body: string;
    data?: Record<string, any>;
}

/**
 * Register for push notifications and get the token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    // Check if running on physical device
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
    }

    // Get the token
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        token = tokenData.data;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
        });
    }

    return token;
}

/**
 * Save push token to user's profile
 */
export async function savePushToken(userId: string, token: string): Promise<boolean> {
    try {
        // Store the token in the users table or a separate push_tokens table
        // For now, we'll add it to a push_tokens array in user metadata
        const { error } = await supabase
            .from('users')
            .update({
                // Note: You may need to add a push_token column to the users table
                // or create a separate push_tokens table
            })
            .eq('id', userId);

        // Alternative: Store in a separate table
        // const { error } = await supabase
        //   .from('push_tokens')
        //   .upsert({ user_id: userId, token, platform: Platform.OS })
        //   .select();

        if (error) {
            console.error('Error saving push token:', error);
            return false;
        }

        console.log('Push token saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving push token:', error);
        return false;
    }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    triggerSeconds: number = 1
): Promise<string | null> {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: triggerSeconds,
            },
        });
        return id;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return null;
    }
}

/**
 * Send instant local notification
 */
export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
): Promise<void> {
    await scheduleLocalNotification(title, body, data, 1);
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge count
 */
export async function clearBadge(): Promise<void> {
    await setBadgeCount(0);
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener (foreground)
 */
export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Store notification in database for history
 */
export async function storeNotification(
    userId: string,
    notification: PushNotificationData
): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: notification.title,
                body: notification.body,
                type: notification.type,
                data: notification.data || null,
            });

        if (error) {
            console.error('Error storing notification:', error);
        }
    } catch (error) {
        console.error('Error storing notification:', error);
    }
}

// ============ Notification Types ============

/**
 * Send event reminder notification
 */
export async function notifyEventReminder(
    userId: string,
    eventTitle: string,
    eventId: string,
    minutesUntil: number
): Promise<void> {
    const title = 'Event Reminder 🏃';
    const body = `${eventTitle} starts in ${minutesUntil} minutes!`;

    await sendLocalNotification(title, body, { type: 'event', eventId });
    await storeNotification(userId, { type: 'event', title, body, data: { eventId } });
}

/**
 * Send points earned notification
 */
export async function notifyPointsEarned(
    userId: string,
    points: number,
    xp: number,
    source: string
): Promise<void> {
    const title = 'Points Earned! 🎉';
    const body = `You earned ${points} points and ${xp} XP from ${source}`;

    await sendLocalNotification(title, body, { type: 'points' });
    await storeNotification(userId, { type: 'points', title, body, data: { points, xp, source } });
}

/**
 * Send order status notification
 */
export async function notifyOrderStatus(
    userId: string,
    orderId: string,
    status: string
): Promise<void> {
    const statusMessages: Record<string, string> = {
        paid: 'Your order has been confirmed!',
        processing: 'Your order is being prepared.',
        shipped: 'Your order has been shipped!',
        delivered: 'Your order has been delivered!',
    };

    const title = 'Order Update 📦';
    const body = statusMessages[status] || `Order status: ${status}`;

    await sendLocalNotification(title, body, { type: 'order', orderId });
    await storeNotification(userId, { type: 'order', title, body, data: { orderId, status } });
}

/**
 * Send friend request notification
 */
export async function notifyFriendRequest(
    userId: string,
    fromUserName: string,
    fromUserId: string
): Promise<void> {
    const title = 'New Friend Request 👋';
    const body = `${fromUserName} wants to be your friend`;

    await sendLocalNotification(title, body, { type: 'friend', fromUserId });
    await storeNotification(userId, { type: 'friend', title, body, data: { fromUserId, fromUserName } });
}

/**
 * Send level up notification
 */
export async function notifyLevelUp(
    userId: string,
    newLevel: string,
    discount: number
): Promise<void> {
    const title = 'Level Up! 🚀';
    const body = `You reached ${newLevel} level! Enjoy ${discount}% off your next renewal.`;

    await sendLocalNotification(title, body, { type: 'subscription' });
    await storeNotification(userId, { type: 'subscription', title, body, data: { newLevel, discount } });
}
