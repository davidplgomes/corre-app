import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, LoadingSpinner } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { useAuth } from '../../contexts/AuthContext';
import {
    getEventById,
    joinEvent,
    leaveEvent,
    hasUserJoinedEvent,
    getEventParticipants,
} from '../../services/supabase/events';
import { hasUserCheckedIn } from '../../services/supabase/checkins';
import { Event, EventParticipant } from '../../types';
import { formatDateTime, isUpcoming, isWithinCheckInWindow } from '../../utils/date';
import { EVENT_POINTS } from '../../constants/points';
import { TierKey } from '../../constants/tiers';

type EventDetailProps = {
    route: { params: { eventId: string } };
    navigation: any;
};

export const EventDetail: React.FC<EventDetailProps> = ({ route, navigation }) => {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const { eventId } = route.params;

    const [event, setEvent] = useState<Event | null>(null);
    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [hasJoined, setHasJoined] = useState(false);
    const [hasCheckedIn, setHasCheckedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadEventData();
    }, [eventId]);

    const loadEventData = async () => {
        try {
            const [eventData, participantsData] = await Promise.all([
                getEventById(eventId),
                getEventParticipants(eventId),
            ]);

            if (eventData) {
                setEvent(eventData);
                setParticipants(participantsData);

                if (profile?.id) {
                    const [joined, checkedIn] = await Promise.all([
                        hasUserJoinedEvent(eventId, profile.id),
                        hasUserCheckedIn(eventId, profile.id),
                    ]);
                    setHasJoined(joined);
                    setHasCheckedIn(checkedIn);
                }
            }
        } catch (error) {
            console.error('Error loading event:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!profile?.id) return;
        setActionLoading(true);
        try {
            await joinEvent(eventId, profile.id);
            setHasJoined(true);
            Alert.alert(t('common.success'), t('events.joinSuccess'));
            loadEventData();
        } catch (error) {
            console.error('Error joining event:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!profile?.id) return;
        setActionLoading(true);
        try {
            await leaveEvent(eventId, profile.id);
            setHasJoined(false);
            Alert.alert(t('common.success'), t('events.leaveSuccess'));
            loadEventData();
        } catch (error) {
            console.error('Error leaving event:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = () => {
        navigation.navigate('CheckIn', { eventId, event });
    };

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'routine': return '#10B981';
            case 'special': return '#F59E0B';
            case 'race': return '#EF4444';
            default: return '#6B7280';
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!event) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('errors.unknownError')}</Text>
            </View>
        );
    }

    const eventColor = getEventTypeColor(event.event_type);
    const canCheckIn = hasJoined && !hasCheckedIn && isWithinCheckInWindow(event.event_datetime);
    const isEventUpcoming = isUpcoming(event.event_datetime);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Event Header */}
                <View style={[styles.header, { backgroundColor: eventColor + '20' }]}>
                    <Text style={styles.title}>{event.title}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: eventColor }]}>
                        <Text style={styles.typeBadgeText}>
                            {t(`events.eventTypes.${event.event_type}`)} • {EVENT_POINTS[event.event_type as keyof typeof EVENT_POINTS]} pts
                        </Text>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Event Info */}
                    <Card variant="outlined" style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>📅</Text>
                            <View>
                                <Text style={styles.infoLabel}>{t('events.date')}</Text>
                                <Text style={styles.infoValue}>
                                    {formatDateTime(event.event_datetime, i18n.language)}
                                </Text>
                            </View>
                        </View>
                        {event.location_name && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoIcon}>📍</Text>
                                <View>
                                    <Text style={styles.infoLabel}>{t('events.location')}</Text>
                                    <Text style={styles.infoValue}>{event.location_name}</Text>
                                </View>
                            </View>
                        )}
                    </Card>

                    {/* Description */}
                    {event.description && (
                        <Card variant="outlined" style={styles.descriptionCard}>
                            <Text style={styles.sectionTitle}>{t('events.description')}</Text>
                            <Text style={styles.description}>{event.description}</Text>
                        </Card>
                    )}

                    {/* Participants */}
                    <Card variant="outlined" style={styles.participantsCard}>
                        <Text style={styles.sectionTitle}>
                            {t('events.participants')} ({participants.length})
                        </Text>
                        {participants.length > 0 ? (
                            participants.slice(0, 5).map((p: any, index) => (
                                <View key={index} style={styles.participantRow}>
                                    <Text style={styles.participantName}>{p.users?.full_name || 'User'}</Text>
                                    {p.users?.membership_tier && (
                                        <TierBadge tier={p.users.membership_tier as TierKey} size="small" />
                                    )}
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noParticipants}>No participants yet</Text>
                        )}
                        {participants.length > 5 && (
                            <Text style={styles.moreParticipants}>
                                +{participants.length - 5} more
                            </Text>
                        )}
                    </Card>

                    {/* Actions */}
                    <View style={styles.actions}>
                        {hasCheckedIn ? (
                            <Button
                                title={t('events.alreadyCheckedIn')}
                                onPress={() => { }}
                                disabled
                                variant="secondary"
                            />
                        ) : canCheckIn ? (
                            <Button
                                title={t('events.checkIn')}
                                onPress={handleCheckIn}
                                loading={actionLoading}
                            />
                        ) : hasJoined ? (
                            <>
                                {isEventUpcoming && (
                                    <Button
                                        title={t('events.leaveEvent')}
                                        onPress={handleLeave}
                                        loading={actionLoading}
                                        variant="ghost"
                                    />
                                )}
                            </>
                        ) : isEventUpcoming ? (
                            <Button
                                title={t('events.joinEvent')}
                                onPress={handleJoin}
                                loading={actionLoading}
                            />
                        ) : null}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
    },
    header: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#374151',
        textAlign: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    typeBadgeText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    infoCard: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    descriptionCard: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
    },
    participantsCard: {
        marginBottom: 24,
    },
    participantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    participantName: {
        fontSize: 14,
        color: '#374151',
    },
    noParticipants: {
        fontSize: 14,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    moreParticipants: {
        fontSize: 12,
        color: '#7C3AED',
        marginTop: 8,
    },
    actions: {
        gap: 12,
    },
});
