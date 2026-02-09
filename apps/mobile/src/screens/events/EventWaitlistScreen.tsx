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
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, Button } from '../../components/common';
import { supabase } from '../../services/supabase/client';

interface EventWaitlistScreenProps {
    navigation: any;
}

interface WaitlistEntry {
    id: string;
    event_id: string;
    user_id: string;
    position: number;
    joined_at: string;
    notified_at: string | null;
    status: 'waiting' | 'notified' | 'expired' | 'registered';
    event: {
        id: string;
        title: string;
        event_datetime: string;
        location: string;
        max_participants: number;
        current_participants: number;
    };
}

const WaitlistCard = ({
    entry,
    onLeave
}: {
    entry: WaitlistEntry;
    onLeave: () => void;
}) => {
    const eventDate = new Date(entry.event.event_datetime);
    const isPast = eventDate < new Date();

    const statusConfig = {
        waiting: { color: '#F59E0B', label: 'Waiting', icon: 'time-outline' },
        notified: { color: '#10B981', label: 'Spot Available!', icon: 'checkmark-circle-outline' },
        expired: { color: '#EF4444', label: 'Expired', icon: 'close-circle-outline' },
        registered: { color: '#6366F1', label: 'Registered', icon: 'checkmark-done-outline' },
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
                    <Text style={styles.detailText} numberOfLines={1}>{entry.event.location}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#888" />
                    <Text style={styles.detailText}>
                        {entry.event.current_participants}/{entry.event.max_participants} registered
                    </Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                {entry.status === 'notified' && (
                    <Button
                        title="Claim Spot"
                        onPress={() => Alert.alert('Success', 'Navigating to event registration...')}
                        style={styles.claimButton}
                    />
                )}
                {entry.status === 'waiting' && !isPast && (
                    <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
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
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'past'>('active');

    const loadWaitlist = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('event_waitlist')
                .select(`
                    id,
                    event_id,
                    user_id,
                    position,
                    joined_at,
                    notified_at,
                    status,
                    event:events (
                        id,
                        title,
                        event_datetime,
                        location,
                        max_participants,
                        current_participants
                    )
                `)
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false });

            if (error) throw error;
            setWaitlistEntries(data || []);
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
                            const { error } = await supabase
                                .from('event_waitlist')
                                .delete()
                                .eq('id', entryId);

                            if (error) throw error;
                            setWaitlistEntries(prev => prev.filter(e => e.id !== entryId));
                        } catch (error) {
                            console.error('Error leaving waitlist:', error);
                            Alert.alert('Error', 'Failed to leave waitlist');
                        }
                    },
                },
            ]
        );
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
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
                            onPress={() => navigation.navigate('Events')}
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
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
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
    },
    filterTabActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    filterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
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
        color: '#888',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Waitlist Card
    waitlistCard: {
        backgroundColor: '#1A1A1A',
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
        backgroundColor: '#333',
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
        color: '#888',
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
    leaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    joinedAt: {
        fontSize: 12,
        color: '#666',
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
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
    browseButton: {
        marginTop: 24,
    },
});

export default EventWaitlistScreen;
