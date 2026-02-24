import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    RefreshControl,
    ActivityIndicator,
    Image,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { BackButton } from '../../components/common';
import { TrophyIcon, ShareIcon, CheckCircleIcon } from '../../components/common/TabIcons';

type EventResultsProps = {
    navigation: any;
    route: {
        params: {
            eventId: string;
            eventTitle?: string;
        };
    };
};

interface Participant {
    id: string;
    name: string;
    avatarUrl: string | null;
    position: number;
    time: string;
    pace: string;
    points: number;
    isCurrentUser: boolean;
}

interface EventResultData {
    id: string;
    title: string;
    date: string;
    location: string;
    distance: string;
    totalParticipants: number;
    coverImage: string | null;
    userResult: {
        position: number;
        time: string;
        pace: string;
        points: number;
        personalBest: boolean;
    } | null;
    topFinishers: Participant[];
    allParticipants: Participant[];
}

const EVENT_PURPLE = '#7C3AED';

export const EventResults: React.FC<EventResultsProps> = ({ navigation, route }) => {
    const { eventId, eventTitle } = route.params;
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [eventData, setEventData] = useState<EventResultData | null>(null);
    const [showAllParticipants, setShowAllParticipants] = useState(false);

    const loadEventResults = useCallback(async () => {
        try {
            // In a real app, this would fetch from the API
            // For now, we'll simulate with mock data
            await new Promise(resolve => setTimeout(resolve, 500));

            const mockData: EventResultData = {
                id: eventId,
                title: eventTitle || 'Morning Run Event',
                date: new Date().toISOString(),
                location: 'Ibirapuera Park, Sao Paulo',
                distance: '5K',
                totalParticipants: 45,
                coverImage: null,
                userResult: user ? {
                    position: 12,
                    time: '24:35',
                    pace: "4'55\"/km",
                    points: 150,
                    personalBest: true,
                } : null,
                topFinishers: [
                    { id: '1', name: 'Maria Silva', avatarUrl: null, position: 1, time: '18:42', pace: "3'44\"/km", points: 500, isCurrentUser: false },
                    { id: '2', name: 'Carlos Santos', avatarUrl: null, position: 2, time: '19:15', pace: "3'51\"/km", points: 400, isCurrentUser: false },
                    { id: '3', name: 'Ana Costa', avatarUrl: null, position: 3, time: '19:58', pace: "3'59\"/km", points: 300, isCurrentUser: false },
                ],
                allParticipants: Array.from({ length: 10 }, (_, i) => ({
                    id: `p${i + 4}`,
                    name: `Runner ${i + 4}`,
                    avatarUrl: null,
                    position: i + 4,
                    time: `${20 + Math.floor(i / 2)}:${(i * 7) % 60}`.padStart(5, '0'),
                    pace: `${4 + Math.floor(i / 3)}'${(i * 11) % 60}"`.padStart(6, '0') + '/km',
                    points: Math.max(100 - i * 10, 10),
                    isCurrentUser: i === 8,
                })),
            };

            setEventData(mockData);
        } catch (error) {
            console.error('Error loading event results:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [eventId, eventTitle, user]);

    useEffect(() => {
        loadEventResults();
    }, [loadEventResults]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadEventResults();
    }, [loadEventResults]);

    const handleShare = async () => {
        if (!eventData) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await Share.share({
                message: `I finished ${eventData.userResult?.position || ''}${getOrdinalSuffix(eventData.userResult?.position || 0)} in the ${eventData.title} with a time of ${eventData.userResult?.time}! #CorreApp #Running`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const getOrdinalSuffix = (n: number): string => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    const getMedalEmoji = (position: number): string => {
        switch (position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '';
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.brand.primary} />
            </View>
        );
    }

    if (!eventData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Event not found</Text>
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
                                <Text style={styles.headerLabel}>EVENT</Text>
                                <Text style={styles.headerTitle}>RESULTS</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                            <ShareIcon size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FFF"
                            />
                        }
                    >
                        {/* Event Info */}
                        <BlurView intensity={25} tint="dark" style={styles.eventCard}>
                            <View style={styles.eventBadge}>
                                <Text style={styles.eventBadgeText}>{eventData.distance}</Text>
                            </View>
                            <Text style={styles.eventTitle}>{eventData.title}</Text>
                            <Text style={styles.eventDate}>{formatDate(eventData.date)}</Text>
                            <Text style={styles.eventLocation}>{eventData.location}</Text>
                            <View style={styles.participantsRow}>
                                <Text style={styles.participantsCount}>
                                    {eventData.totalParticipants} runners
                                </Text>
                                <CheckCircleIcon size={16} color={theme.colors.success} />
                                <Text style={styles.completedText}>Completed</Text>
                            </View>
                        </BlurView>

                        {/* Your Result */}
                        {eventData.userResult && (
                            <>
                                <Text style={styles.sectionTitle}>YOUR RESULT</Text>
                                <BlurView intensity={30} tint="dark" style={styles.yourResultCard}>
                                    <View style={styles.positionBadge}>
                                        <Text style={styles.positionNumber}>{eventData.userResult.position}</Text>
                                        <Text style={styles.positionSuffix}>
                                            {getOrdinalSuffix(eventData.userResult.position)}
                                        </Text>
                                    </View>

                                    <View style={styles.resultStats}>
                                        <View style={styles.resultStat}>
                                            <Text style={styles.resultStatValue}>{eventData.userResult.time}</Text>
                                            <Text style={styles.resultStatLabel}>TIME</Text>
                                        </View>
                                        <View style={styles.resultDivider} />
                                        <View style={styles.resultStat}>
                                            <Text style={styles.resultStatValue}>{eventData.userResult.pace}</Text>
                                            <Text style={styles.resultStatLabel}>PACE</Text>
                                        </View>
                                        <View style={styles.resultDivider} />
                                        <View style={styles.resultStat}>
                                            <Text style={[styles.resultStatValue, { color: theme.colors.brand.primary }]}>
                                                +{eventData.userResult.points}
                                            </Text>
                                            <Text style={styles.resultStatLabel}>POINTS</Text>
                                        </View>
                                    </View>

                                    {eventData.userResult.personalBest && (
                                        <View style={styles.pbBadge}>
                                            <Text style={styles.pbText}>🎉 NEW PERSONAL BEST!</Text>
                                        </View>
                                    )}
                                </BlurView>
                            </>
                        )}

                        {/* Podium */}
                        <Text style={styles.sectionTitle}>PODIUM</Text>
                        <View style={styles.podiumContainer}>
                            {/* Second Place */}
                            <View style={[styles.podiumSpot, styles.podiumSecond]}>
                                <View style={styles.podiumAvatar}>
                                    <Text style={styles.avatarInitial}>
                                        {eventData.topFinishers[1]?.name.charAt(0)}
                                    </Text>
                                </View>
                                <Text style={styles.podiumMedal}>🥈</Text>
                                <Text style={styles.podiumName} numberOfLines={1}>
                                    {eventData.topFinishers[1]?.name}
                                </Text>
                                <Text style={styles.podiumTime}>{eventData.topFinishers[1]?.time}</Text>
                                <View style={[styles.podiumBlock, { height: 60 }]}>
                                    <Text style={styles.podiumPosition}>2</Text>
                                </View>
                            </View>

                            {/* First Place */}
                            <View style={[styles.podiumSpot, styles.podiumFirst]}>
                                <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
                                    <Text style={styles.avatarInitial}>
                                        {eventData.topFinishers[0]?.name.charAt(0)}
                                    </Text>
                                </View>
                                <Text style={styles.podiumMedal}>🥇</Text>
                                <Text style={styles.podiumName} numberOfLines={1}>
                                    {eventData.topFinishers[0]?.name}
                                </Text>
                                <Text style={styles.podiumTime}>{eventData.topFinishers[0]?.time}</Text>
                                <View style={[styles.podiumBlock, styles.podiumBlockFirst, { height: 80 }]}>
                                    <Text style={styles.podiumPosition}>1</Text>
                                </View>
                            </View>

                            {/* Third Place */}
                            <View style={[styles.podiumSpot, styles.podiumThird]}>
                                <View style={styles.podiumAvatar}>
                                    <Text style={styles.avatarInitial}>
                                        {eventData.topFinishers[2]?.name.charAt(0)}
                                    </Text>
                                </View>
                                <Text style={styles.podiumMedal}>🥉</Text>
                                <Text style={styles.podiumName} numberOfLines={1}>
                                    {eventData.topFinishers[2]?.name}
                                </Text>
                                <Text style={styles.podiumTime}>{eventData.topFinishers[2]?.time}</Text>
                                <View style={[styles.podiumBlock, { height: 45 }]}>
                                    <Text style={styles.podiumPosition}>3</Text>
                                </View>
                            </View>
                        </View>

                        {/* All Finishers */}
                        <TouchableOpacity
                            style={styles.showAllButton}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setShowAllParticipants(!showAllParticipants);
                            }}
                        >
                            <Text style={styles.showAllText}>
                                {showAllParticipants ? 'HIDE ALL FINISHERS' : 'VIEW ALL FINISHERS'}
                            </Text>
                        </TouchableOpacity>

                        {showAllParticipants && (
                            <BlurView intensity={20} tint="dark" style={styles.allFinishersCard}>
                                {eventData.allParticipants.map((participant, index) => (
                                    <View
                                        key={participant.id}
                                        style={[
                                            styles.finisherRow,
                                            participant.isCurrentUser && styles.finisherRowHighlight,
                                            index < eventData.allParticipants.length - 1 && styles.finisherRowBorder
                                        ]}
                                    >
                                        <Text style={styles.finisherPosition}>{participant.position}</Text>
                                        <View style={styles.finisherAvatar}>
                                            <Text style={styles.finisherAvatarText}>
                                                {participant.name.charAt(0)}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.finisherName,
                                            participant.isCurrentUser && styles.finisherNameHighlight
                                        ]} numberOfLines={1}>
                                            {participant.name}
                                            {participant.isCurrentUser && ' (You)'}
                                        </Text>
                                        <Text style={styles.finisherTime}>{participant.time}</Text>
                                    </View>
                                ))}
                            </BlurView>
                        )}
                    </ScrollView>
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
    errorText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 16,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.75)',
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
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    shareButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Event Card
    eventCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: `${EVENT_PURPLE}50`,
        overflow: 'hidden',
        alignItems: 'center',
    },
    eventBadge: {
        backgroundColor: EVENT_PURPLE,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    eventBadgeText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFF',
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    eventDate: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
    },
    eventLocation: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 16,
    },
    participantsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    participantsCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    completedText: {
        fontSize: 13,
        color: theme.colors.success,
        fontWeight: '600',
    },

    // Section Title
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 16,
    },

    // Your Result
    yourResultCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
        overflow: 'hidden',
        alignItems: 'center',
    },
    positionBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    positionNumber: {
        fontSize: 64,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    positionSuffix: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    resultStats: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    resultStat: {
        flex: 1,
        alignItems: 'center',
    },
    resultStatValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
    },
    resultStatLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    resultDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    pbBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 20,
    },
    pbText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.success,
    },

    // Podium
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    podiumSpot: {
        flex: 1,
        alignItems: 'center',
    },
    podiumFirst: {
        marginHorizontal: 8,
    },
    podiumSecond: {},
    podiumThird: {},
    podiumAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    podiumAvatarFirst: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    podiumMedal: {
        fontSize: 24,
        marginBottom: 4,
    },
    podiumName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 4,
        maxWidth: 80,
    },
    podiumTime: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 8,
    },
    podiumBlock: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumBlockFirst: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
    },
    podiumPosition: {
        fontSize: 24,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.3)',
    },

    // Show All Button
    showAllButton: {
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        marginBottom: 16,
    },
    showAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
    },

    // All Finishers
    allFinishersCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    finisherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    finisherRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    finisherRowHighlight: {
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
    },
    finisherPosition: {
        width: 28,
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
    finisherAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    finisherAvatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    finisherName: {
        flex: 1,
        fontSize: 14,
        color: '#FFF',
    },
    finisherNameHighlight: {
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    finisherTime: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },
});

export default EventResults;
