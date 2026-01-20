import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    Dimensions,
    Image,
    Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../../components/common';
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
import { formatDateTime, formatEventDate, isUpcoming, isWithinCheckInWindow } from '../../utils/date';
// import { EVENT_POINTS } from '../../constants/points'; // Unused in new design for now
// import { TierKey } from '../../constants/tiers'; // Unused in new design for now
import { ChevronRightIcon, MapIcon } from '../../components/common/TabIcons';

const { width, height } = Dimensions.get('window');

type EventDetailProps = {
    route: { params: { eventId: string } };
    navigation: any;
};

export const EventDetail: React.FC<EventDetailProps> = ({ route, navigation }) => {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    if (!event) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{t('errors.unknownError')}</Text>
            </View>
        );
    }

    const eventDate = new Date(event.event_datetime);
    const dateStr = formatEventDate(eventDate, i18n.language);
    const timeStr = eventDate.toLocaleTimeString(i18n.language === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const city = event.location_name?.split(',')[0] || 'CITY';

    // Mock Bib Number - In real app, this would be assigned dynamically
    const bibNumber = "001";

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Background Image */}
            <ImageBackground
                source={require('../../../assets/run-bg.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                {/* Dark Overlay Gradient fallback/enhancement */}
                <View style={styles.overlay} />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t('events.streetRun').toUpperCase()} <Text style={styles.headerCity}>{city.toUpperCase()}</Text></Text>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Text style={styles.closeIcon}>×</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Bar */}
                    <View style={styles.statsBar}>
                        <Text style={styles.pointsText}>{event.points_value}PTS</Text>
                        <Text style={styles.statIcon}>⇄</Text>
                        <Text style={styles.statText}>{city.toUpperCase()}</Text>
                    </View>

                    {/* Hero Text */}
                    <View style={styles.heroContainer}>
                        <Text style={styles.heroText}>RUN</Text>
                    </View>

                    {/* Glass Card */}
                    <BlurView intensity={30} tint="dark" style={styles.glassCard}>
                        <View style={styles.glassContent}>
                            {/* Date & Time */}
                            <View style={styles.dateTimeRow}>
                                <View>
                                    <Text style={styles.label}>DATA</Text>
                                    <Text style={styles.valueLarge}>{dateStr}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.label}>HORÁRIO</Text>
                                    <Text style={styles.valueLarge}>{timeStr}</Text>
                                </View>
                            </View>

                            {/* Meeting Point */}
                            <View style={styles.locationSection}>
                                <Text style={styles.label}>{t('events.meetingPoint').toUpperCase()}</Text>
                                <View style={styles.locationRow}>
                                    {/* <MapPinIcon size={20} color="#FFF" /> */}
                                    <Text style={{ fontSize: 20 }}>📍</Text>
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={styles.locationText}>{event.location_name}</Text>
                                        <Text style={styles.subLocationText}>{t('events.entrance')}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Participants */}
                            <View style={styles.participantsSection}>
                                <View style={styles.avatarPile}>
                                    {/* Mock Avatars for now, replace with participants.map */}
                                    {participants.slice(0, 3).map((p, i) => (
                                        <View key={i} style={[styles.avatarCircle, { marginLeft: i > 0 ? -15 : 0, zIndex: 10 - i }]}>
                                            <Text style={styles.avatarInitials}>{p.users?.full_name?.substring(0, 2).toUpperCase()}</Text>
                                        </View>
                                    ))}
                                    {participants.length > 3 && (
                                        <View style={[styles.avatarCircle, { marginLeft: -15, backgroundColor: '#FFF', zIndex: 5 }]}>
                                            <Text style={[styles.avatarInitials, { color: '#000' }]}>+{participants.length - 3}</Text>
                                        </View>
                                    )}
                                    {participants.length === 0 && <Text style={{ color: 'rgba(255,255,255,0.5)' }}>{t('events.beTheFirst')}</Text>}
                                </View>
                                <View>
                                    <Text style={styles.joinText}>{t('events.joinTheCrew')}</Text>
                                    <Text style={styles.subJoinText}>{t('events.allPaces')}</Text>
                                </View>
                            </View>

                            {/* Action Button */}
                            {!hasCheckedIn && (
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={hasJoined ? (isUpcoming(event.event_datetime) ? handleLeave : handleCheckIn) : handleJoin}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.actionButtonText}>
                                        {hasJoined ? (isWithinCheckInWindow(event.event_datetime) ? t('events.checkIn').toUpperCase() : t('events.leaveEventButton').toUpperCase()) : t('events.participate').toUpperCase()}
                                    </Text>
                                    <View style={styles.arrowContainer}>
                                        <Text style={styles.arrowText}>→</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {/* Checked In State */}
                            {hasCheckedIn && (
                                <View style={[styles.actionButton, { backgroundColor: theme.colors.success }]}>
                                    <Text style={styles.actionButtonText}>PRESENÇA CONFIRMADA</Text>
                                </View>
                            )}

                        </View>
                    </BlurView>

                    {/* Bib Preview Card */}
                    <View style={styles.bibCard}>
                        <View style={styles.bibHeader}>
                            <Text style={styles.bibBrand}>C<View style={styles.bibO} />RRE {city.toUpperCase()}</Text>
                            <View style={styles.bibTag}>
                                <Text style={styles.bibTagText}>BIB PREVIEW</Text>
                            </View>
                        </View>
                        <Text style={styles.bibNumber}>{bibNumber}</Text>
                        <View style={styles.bibFooter}>
                            <Text style={styles.bibFooterText}>{t('events.streetRun').toUpperCase()}</Text>
                            <Text style={styles.bibFooterDate}>{eventDate.toLocaleDateString()}</Text>
                        </View>

                        {/* Cutout notches */}
                        <View style={styles.notchLeft} />
                        <View style={styles.notchRight} />
                    </View>

                </ScrollView>
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
    errorContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FFF',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)', // Adjust darkness
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    headerTitle: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    headerCity: {
        fontWeight: '300',
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        color: '#FFF',
        fontSize: 18,
        marginTop: -2,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        paddingBottom: 10,
        marginHorizontal: 20,
    },
    statText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 16,
    },
    pointsText: {
        color: theme.colors.brand.primary,
        fontWeight: '900',
        fontSize: 16,
    },
    statIcon: {
        color: '#FFF',
        fontSize: 20,
    },
    heroContainer: {
        alignItems: 'center',
        marginVertical: 40,
    },
    heroText: {
        // fontFamily: 'System', // Use a custom condensed font if available
        fontSize: 120,
        fontWeight: '900', // Heavy italic
        fontStyle: 'italic',
        color: '#FFF',
        includeFontPadding: false,
        lineHeight: 120,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    glassCard: {
        marginHorizontal: 20,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    glassContent: {
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.4)', // Additional internal darkening
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 4,
    },
    valueLarge: {
        color: theme.colors.brand.primary,
        fontSize: 24,
        fontWeight: '800',
    },
    dateTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    locationSection: {
        marginBottom: 30,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    locationText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    subLocationText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    participantsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarPile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: '#000', // Or match blur bg
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarInitials: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    joinText: {
        color: '#FFF',
        textAlign: 'right',
        fontSize: 14,
        fontWeight: '600',
    },
    subJoinText: {
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'right',
        fontSize: 12,
    },
    actionButton: {
        backgroundColor: '#FFF',
        borderRadius: 20, // Pill shape
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
    },
    actionButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 18,
        letterSpacing: 1,
        marginLeft: 24,
    },
    arrowContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        color: '#FFF',
        fontSize: 24,
        marginTop: -4,
    },
    bibCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 60,
        borderRadius: 16,
        padding: 12,
        justifyContent: 'space-between',
        position: 'relative',
        transform: [{ rotate: '-2deg' }], // Slight rotation like reference
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    bibHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        marginBottom: 8,
    },
    bibBrand: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 10,
        letterSpacing: 2, // Tracking widest
        flexDirection: 'row',
        alignItems: 'center',
        display: 'flex',
    },
    bibBrandTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bibO: {
        width: 14,
        height: 10,
        borderWidth: 2,
        borderColor: '#FFF',
        borderRadius: 20,
        marginHorizontal: 2,
        transform: [{ translateY: 1 }]
    },
    bibTag: {
        // backgroundColor: '#FFF',
        // paddingHorizontal: 6,
        // paddingVertical: 2,
        // borderRadius: 2,
    },
    bibTagText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    bibNumberContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    bibNumber: {
        fontSize: 100,
        fontWeight: '900',
        color: '#000',
        textAlign: 'center',
        includeFontPadding: false,
        lineHeight: 100,
        letterSpacing: -4,
        fontVariant: ['tabular-nums'],
    },
    bibFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        marginTop: 8,
    },
    bibFooterText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    bibFooterDate: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
    },
    notchLeft: {
        position: 'absolute',
        width: 12,
        height: 24,
        backgroundColor: '#000', // Must match the screen background
        left: 0,
        top: '50%',
        marginTop: -12,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        zIndex: 10,
    },
    notchRight: {
        position: 'absolute',
        width: 12,
        height: 24,
        backgroundColor: '#000', // Must match the screen background
        right: 0,
        top: '50%',
        marginTop: -12,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        zIndex: 10,
    },
});
