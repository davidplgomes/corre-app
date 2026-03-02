import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, Button, BackButton } from '../../components/common';
import {
    getUserWaitlistEntries,
    leaveWaitlistEntry,
    claimWaitlistSpot,
    WaitlistEntry,
    WaitlistStatus,
} from '../../services/supabase/waitlist';
import * as Haptics from 'expo-haptics';

interface EventWaitlistScreenProps {
    navigation: any;
}

const WaitlistCard = ({
    entry,
    onLeave,
    onClaim,
    actionLoading,
}: {
    entry: WaitlistEntry;
    onLeave: () => void;
    onClaim: () => void;
    actionLoading: boolean;
}) => {
    const eventDate = new Date(entry.event.event_datetime);
    const isPast = eventDate < new Date();

    const statusConfig: Record<WaitlistStatus, { color: string; label: string; icon: string }> = {
        waiting: { color: '#F59E0B', label: 'Waiting', icon: 'time-outline' },
        claimable: { color: '#10B981', label: 'Spot Available!', icon: 'checkmark-circle-outline' },
        expired: { color: '#EF4444', label: 'Expired', icon: 'close-circle-outline' },
    };

    const status = statusConfig[entry.status];

    return (
        <View style={[styles.waitlistCard, isPast && styles.cardPast]}>
            <View style={styles.cardHeader}>
                <View style={[styles.positionBadge, entry.position <= 3 && styles.positionBadgeTop]}>
                    <Text style={styles.positionText}>#{entry.position}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                    <Ionicons name={status.icon as any} size={14} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>

            <Text style={styles.eventTitle}>{entry.event.title}</Text>

            <View style={styles.eventDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#888" />
                    <Text style={styles.detailText}>
                        {eventDate.toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#888" />
                    <Text style={styles.detailText} numberOfLines={1}>{entry.event.location_name}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#888" />
                    <Text style={styles.detailText}>
                        {entry.event.current_participants} registered
                    </Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                {entry.status === 'claimable' && (
                    <Button
                        title="Claim Spot"
                        onPress={onClaim}
                        loading={actionLoading}
                        disabled={actionLoading}
                        style={styles.claimButton}
                    />
                )}
                {entry.status === 'waiting' && !isPast && (
                    <TouchableOpacity
                        style={[styles.leaveButton, actionLoading && styles.leaveButtonDisabled]}
                        onPress={onLeave}
                        disabled={actionLoading}
                    >
                        <Ionicons name="exit-outline" size={18} color="#EF4444" />
                        <Text style={styles.leaveText}>Leave Waitlist</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.joinedAt}>
                Joined {new Date(entry.joined_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                })}
            </Text>
        </View>
    );
};

export const EventWaitlistScreen: React.FC<EventWaitlistScreenProps> = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'past'>('active');
    const [actionLoadingEntryId, setActionLoadingEntryId] = useState<string | null>(null);

    const loadWaitlist = useCallback(async () => {
        if (!user?.id) {
            setWaitlistEntries([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const entries = await getUserWaitlistEntries(user.id);
            setWaitlistEntries(entries);
        } catch (error) {
            console.error('Error loading waitlist:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadWaitlist();
    }, [loadWaitlist]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadWaitlist();
    }, [loadWaitlist]);

    const handleLeaveWaitlist = async (entryId: string) => {
        Alert.alert(
            'Leave Waitlist',
            'Are you sure you want to leave this waitlist?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoadingEntryId(entryId);
                            const result = await leaveWaitlistEntry(entryId);
                            if (!result.success) {
                                Alert.alert('Error', result.message || 'Failed to leave waitlist');
                                return;
                            }
                            setWaitlistEntries(prev => prev.filter(e => e.id !== entryId));
                        } catch (error) {
                            console.error('Error leaving waitlist:', error);
                            Alert.alert('Error', 'Failed to leave waitlist');
                        } finally {
                            setActionLoadingEntryId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleClaimSpot = async (entry: WaitlistEntry) => {
        try {
            setActionLoadingEntryId(entry.id);
            const result = await claimWaitlistSpot(entry.id);

            if (!result.success) {
                const friendlyMessage = result.code === 'WAITLIST_NOT_READY'
                    ? 'Your spot is not ready to claim yet.'
                    : result.code === 'EVENT_ALREADY_STARTED'
                        ? 'This event has already started.'
                        : (result.message || 'Could not claim your spot right now.');
                Alert.alert('Unable to claim spot', friendlyMessage);
                return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Spot claimed',
                result.already_registered
                    ? 'You are already registered for this event.'
                    : 'You have been moved from waitlist to participants.',
                [
                    {
                        text: 'View Event',
                        onPress: () => navigation.navigate('EventDetail', { eventId: entry.event.id }),
                    },
                    { text: 'OK' },
                ]
            );

            await loadWaitlist();
        } catch (error) {
            console.error('Error claiming waitlist spot:', error);
            Alert.alert('Error', 'Failed to claim your spot');
        } finally {
            setActionLoadingEntryId(null);
        }
    };

    const filteredEntries = waitlistEntries.filter(entry => {
        const isPast = new Date(entry.event.event_datetime) < new Date();
        if (filter === 'active') return !isPast && entry.status !== 'expired';
        if (filter === 'past') return isPast || entry.status === 'expired';
        return true;
    });

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
                <BackButton onPress={() => {
                    Haptics.selectionAsync();
                    navigation.goBack();
                }} />
                <Text style={styles.headerTitle}>Event Waitlist</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
                {(['active', 'past', 'all'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                        onPress={() => setFilter(tab)}
                    >
                        <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand.primary}
                    />
                }
            >
                {filteredEntries.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="list-outline" size={64} color="#666" />
                        <Text style={styles.emptyTitle}>No Waitlist Entries</Text>
                        <Text style={styles.emptySubtitle}>
                            {filter === 'active'
                                ? "You're not on any active waitlists"
                                : "No past waitlist entries found"}
                        </Text>
                        <Button
                            title="Browse Events"
                            onPress={() => navigation.navigate('EventList')}
                            style={styles.browseButton}
                        />
                    </View>
                ) : (
                    <>
                        <Text style={styles.resultsCount}>
                            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                        </Text>
                        {filteredEntries.map((entry) => (
                            <WaitlistCard
                                key={entry.id}
                                entry={entry}
                                onLeave={() => handleLeaveWaitlist(entry.id)}
                                onClaim={() => handleClaimSpot(entry)}
                                actionLoading={actionLoadingEntryId === entry.id}
                            />
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
    },
    filterTabActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.secondary,
    },
    filterTabTextActive: {
        color: '#FFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    resultsCount: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Waitlist Card
    waitlistCard: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardPast: {
        opacity: 0.6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    positionBadge: {
        backgroundColor: theme.colors.gray[700],
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    positionBadgeTop: {
        backgroundColor: theme.colors.brand.primary,
    },
    positionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    eventDetails: {
        gap: 8,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        flex: 1,
    },
    cardActions: {
        marginBottom: 8,
    },
    claimButton: {
        marginBottom: 8,
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    leaveButtonDisabled: {
        opacity: 0.5,
    },
    leaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    joinedAt: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
        textAlign: 'center',
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginTop: 8,
        textAlign: 'center',
    },
    browseButton: {
        marginTop: 24,
    },
});

export default EventWaitlistScreen;
