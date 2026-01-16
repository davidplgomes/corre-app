import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Button, Card, LoadingSpinner } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../constants/theme';
import {
    getEventById,
    joinEvent,
    leaveEvent,
    hasUserJoinedEvent,
    getEventParticipants,
    deleteEvent,
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (!profile?.id) return;
        setActionLoading(true);
        try {
            await joinEvent(eventId, profile.id);
            setHasJoined(true);
            // Alert.alert(t('common.success'), t('events.joinSuccess')); // Removed Alert for cleaner UX
            loadEventData();
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Error joining event:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleLeave = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!profile?.id) return;
        setActionLoading(true);
        try {
            await leaveEvent(eventId, profile.id);
            setHasJoined(false);
            // Alert.alert(t('common.success'), t('events.leaveSuccess')); // Removed Alert for cleaner UX
            loadEventData();
        } catch (error) {
            console.error('Error leaving event:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = () => {
        Haptics.selectionAsync();
        navigation.navigate('CheckIn', { eventId, event });
    };

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'routine': return theme.colors.success; // Green
            case 'special': return theme.colors.warning; // Gold
            case 'race': return theme.colors.brand.primary; // Orange
            default: return theme.colors.text.disabled;
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
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Event Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{event.title}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: eventColor }]}>
                        <Text style={styles.typeBadgeText}>
                            {t(`events.eventTypes.${event.event_type}`)} • {EVENT_POINTS[event.event_type as keyof typeof EVENT_POINTS]} pts
                        </Text>
                    </View>

                    {/* Creator Actions */}
                    {profile?.id === event.creator_id && (
                        <View style={styles.creatorActions}>
                            <Button
                                title={t('common.edit')}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    navigation.navigate('CreateEvent', { event });
                                }}
                                variant="secondary"
                                size="small"
                                style={styles.actionButton}
                            />
                            <Button
                                title={t('common.delete')}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    Alert.alert(
                                        t('events.deleteEvent'),
                                        t('events.confirmDelete'),
                                        [
                                            { text: t('common.cancel'), style: 'cancel' },
                                            {
                                                text: t('common.delete'),
                                                style: 'destructive',
                                                onPress: async () => {
                                                    await deleteEvent(event.id);
                                                    navigation.goBack();
                                                }
                                            }
                                        ]
                                    );
                                }}
                                variant="ghost"
                                size="small"
                                style={[styles.actionButton, styles.deleteButton]}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.content}>
                    {/* Event Info */}
                    <Card variant="default" style={styles.infoCard}>
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
                        <Card variant="default" style={styles.descriptionCard}>
                            <Text style={styles.sectionTitle}>{t('events.description')}</Text>
                            <Text style={styles.description}>{event.description}</Text>
                        </Card>
                    )}

                    {/* Participants */}
                    <Card variant="default" style={styles.participantsCard}>
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
                            <TouchableOpacity onPress={() => navigation.navigate('EventParticipants', { eventId, eventTitle: event.title })}>
                                <Text style={styles.moreParticipants}>
                                    +{participants.length - 5} more ({t('events.viewAll')})
                                </Text>
                            </TouchableOpacity>
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
                                fullWidth
                            />
                        ) : canCheckIn ? (
                            <Button
                                title={t('events.checkIn')}
                                onPress={handleCheckIn}
                                loading={actionLoading}
                                fullWidth
                            />
                        ) : hasJoined ? (
                            <>
                                {isEventUpcoming && (
                                    <Button
                                        title={t('events.leaveEvent')}
                                        onPress={handleLeave}
                                        loading={actionLoading}
                                        variant="ghost"
                                        fullWidth
                                    />
                                )}
                            </>
                        ) : isEventUpcoming ? (
                            <Button
                                title={t('events.joinEvent')}
                                onPress={handleJoin}
                                loading={actionLoading}
                                fullWidth
                                size="large"
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
        backgroundColor: theme.colors.background.primary, // OLED Black
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 120, // Increased to avoid navbar overlap
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.primary,
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.error,
    },
    header: {
        padding: 24,
        alignItems: 'center',
        paddingTop: theme.spacing[8],
    },
    title: {
        fontSize: theme.typography.size.h2,
        fontWeight: '700',
        color: theme.colors.text.primary,
        textAlign: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.radius.full,
    },
    typeBadgeText: {
        color: theme.colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        padding: 16,
    },
    infoCard: {
        marginBottom: 16,
        backgroundColor: theme.colors.background.card, // Surface color
        borderRadius: theme.radius.lg, // 16px
        borderWidth: 0,
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
        color: theme.colors.text.tertiary,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    descriptionCard: {
        marginBottom: 16,
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        borderWidth: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        lineHeight: 22,
    },
    participantsCard: {
        marginBottom: 24,
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        borderWidth: 0,
    },
    participantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.subtle,
    },
    participantName: {
        fontSize: 14,
        color: theme.colors.text.primary,
    },
    noParticipants: {
        fontSize: 14,
        color: theme.colors.text.tertiary,
        fontStyle: 'italic',
    },
    moreParticipants: {
        fontSize: 12,
        color: theme.colors.brand.primary,
        marginTop: 8,
    },
    actions: {
        gap: 12,
        marginBottom: 50,
    },
    creatorActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    actionButton: {
        minWidth: 80,
    },
    deleteButton: {
    }
});
