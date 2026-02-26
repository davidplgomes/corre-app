import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    ImageBackground,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { ClockIcon, ChevronRightIcon, TrendingUpIcon, TrophyIcon } from '../../components/common/TabIcons';
import { BackButton } from '../../components/common';
import { getUserRuns, formatPace as formatRunPace, formatDuration as formatRunDuration } from '../../services/supabase/runs';
import { getUserCheckIns } from '../../services/supabase/checkins';
import { getStravaActivities, formatDistance, formatDuration as formatStravaDuration } from '../../services/supabase/strava';
import { useAuth } from '../../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface RunItem {
    id: string;
    date: string;
    distance: string;
    time: string;
    pace: string;
    points: number;
    source: 'manual' | 'strava' | 'event';
    name?: string;
    route_data?: any;
    location_lat?: number;
    location_lng?: number;
}

type RunHistoryProps = {
    navigation: any;
};

const STRAVA_ORANGE = '#FC4C02';
const EVENT_PURPLE = '#7C3AED';

const RunCard = React.memo(({ item, onPress, t }: { item: RunItem; onPress: () => void; t: any }) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        return { day, month };
    };

    const { day, month } = formatDate(item.date);
    const isStrava = item.source === 'strava';
    const isEvent = item.source === 'event';

    return (
        <BlurView intensity={20} tint="dark" style={[
            styles.runCard,
            isStrava && styles.stravaCard,
            isEvent && styles.eventCard
        ]}>
            <TouchableOpacity
                style={styles.runCardContent}
                onPress={onPress}
                activeOpacity={0.8}
            >
                {/* Date Section */}
                <View style={styles.dateSection}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={[
                        styles.dateMonth,
                        isStrava && { color: STRAVA_ORANGE },
                        isEvent && { color: EVENT_PURPLE }
                    ]}>{month}</Text>
                </View>

                {/* Accent Line */}
                <View style={[
                    styles.accentLine,
                    isStrava && { backgroundColor: STRAVA_ORANGE },
                    isEvent && { backgroundColor: EVENT_PURPLE }
                ]} />

                {/* Stats Section */}
                <View style={styles.statsSection}>
                    {item.name && (
                        <Text style={styles.activityName} numberOfLines={1}>{item.name}</Text>
                    )}
                    <View style={styles.statRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.distance}</Text>
                            <Text style={styles.statLabel}>
                                {isEvent ? t('events.event', 'EVENT').toUpperCase() : t('events.distance').toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.time}</Text>
                            <Text style={styles.statLabel}>{t('events.duration')}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.pace}</Text>
                            <Text style={styles.statLabel}>{t('events.pace')}</Text>
                        </View>
                    </View>
                </View>

                {/* Points & Badge Section */}
                <View style={styles.rightSection}>
                    {item.points > 0 && (
                        <Text style={styles.pointsValue}>+{item.points}</Text>
                    )}
                    {isStrava && (
                        <View style={styles.stravaBadgeContainer}>
                            <Text style={styles.stravaBadge}>via Strava</Text>
                        </View>
                    )}
                    {isEvent && (
                        <View style={styles.eventBadgeContainer}>
                            <Text style={styles.eventBadge}>{t('events.event', 'EVENT').toUpperCase()}</Text>
                        </View>
                    )}
                    <ChevronRightIcon size={16} color="rgba(255,255,255,0.3)" />
                </View>
            </TouchableOpacity>
        </BlurView>
    );
});

export const RunHistory: React.FC<RunHistoryProps> = ({ navigation }) => {
    const [runs, setRuns] = useState<RunItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuth();
    const { t } = useTranslation();

    const calculatePace = (distanceMeters: number, timeSeconds: number): string => {
        if (!distanceMeters || distanceMeters <= 0 || !timeSeconds) return "--'--\"/km";
        const distanceKm = distanceMeters / 1000;
        const paceSecondsPerKm = timeSeconds / distanceKm;
        const minutes = Math.floor(paceSecondsPerKm / 60);
        const seconds = Math.round(paceSecondsPerKm % 60);
        return `${minutes}'${seconds.toString().padStart(2, '0')}"/km`;
    };

    const fetchRuns = useCallback(async () => {
        if (!user) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const [manualData, stravaData, checkInsData] = await Promise.all([
                getUserRuns(user.id).catch(() => []),
                getStravaActivities(50).catch(() => []),
                getUserCheckIns(user.id).catch(() => [])
            ]);

            const manualRuns: RunItem[] = manualData.map((run: any) => {
                const dateObj = new Date(run.started_at || run.created_at);
                const hour = dateObj.getHours();
                let nameKey = 'events.morningRun';
                if (hour >= 12 && hour < 14) nameKey = 'events.lunchRun';
                else if (hour >= 14 && hour < 17) nameKey = 'events.afternoonRun';
                else if (hour >= 17 && hour < 20) nameKey = 'events.eveningRun';
                else if (hour >= 20 || hour < 4) nameKey = 'events.nightRun';

                return {
                    id: run.id,
                    date: run.created_at || run.started_at,
                    distance: `${run.distance_km}km`,
                    time: formatRunDuration(run.duration_seconds),
                    pace: formatRunPace(run.pace_per_km),
                    points: run.points_earned || 0,
                    source: 'manual' as const,
                    name: t(nameKey),
                    route_data: run.route_data
                };
            });

            const stravaRuns: RunItem[] = stravaData.map(activity => ({
                id: `strava-${activity.strava_id}`,
                date: activity.start_date,
                distance: `${formatDistance(activity.distance_meters)}km`,
                time: formatStravaDuration(activity.moving_time_seconds),
                pace: calculatePace(activity.distance_meters, activity.moving_time_seconds),
                points: activity.points_earned || 0,
                source: 'strava' as const,
                name: activity.name,
                route_data: activity.map_polyline,
                location_lat: activity.start_lat || undefined,
                location_lng: activity.start_lng || undefined
            }));

            const eventCheckIns: RunItem[] = checkInsData.map(checkIn => ({
                id: `event-${checkIn.id}`,
                date: checkIn.checked_in_at,
                distance: 'EVENT',
                time: '--:--',
                pace: '--\'--"/km',
                points: checkIn.points_earned || 0,
                source: 'event' as const,
                name: (checkIn as any).events?.title || 'Event Check-in',
                location_lat: checkIn.check_in_lat,
                location_lng: checkIn.check_in_lng
            }));

            const allRuns = [...manualRuns, ...stravaRuns, ...eventCheckIns].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setRuns(allRuns);
        } catch (error) {
            console.error('Error fetching runs:', error);
            setRuns([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, t]);

    useEffect(() => {
        fetchRuns();
    }, [fetchRuns]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        fetchRuns();
    }, [fetchRuns]);

    const totalDistance = runs.reduce((acc, run) => {
        const km = parseFloat((run.distance || '0').toString().replace('km', ''));
        return acc + (isNaN(km) ? 0 : km);
    }, 0);

    const totalRuns = runs.length;
    const stravaRuns = runs.filter(r => r.source === 'strava').length;
    const eventRuns = runs.filter(r => r.source === 'event').length;

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
                                <Text style={styles.headerTitle}>ACTIVITIES</Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions - Stats & Records */}
                    <View style={styles.quickActionsRow}>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('RunningStats');
                            }}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.quickActionBlur}>
                                <TrendingUpIcon size={18} color={theme.colors.brand.primary} />
                                <Text style={styles.quickActionText}>{t('profile.statistics', 'STATISTICS')}</Text>
                                <ChevronRightIcon size={14} color="rgba(255,255,255,0.4)" />
                            </BlurView>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('PersonalRecords');
                            }}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.quickActionBlur}>
                                <TrophyIcon size={18} color="#FFD700" />
                                <Text style={styles.quickActionText}>{t('profile.personalRecords', 'RECORDS')}</Text>
                                <ChevronRightIcon size={14} color="rgba(255,255,255,0.4)" />
                            </BlurView>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    {runs.length > 0 && (
                        <View style={styles.statsRow}>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={styles.statPillValue}>{totalRuns}</Text>
                                <Text style={styles.statPillLabel}>Total</Text>
                            </BlurView>
                            <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                <Text style={[styles.statPillValue, { color: theme.colors.brand.primary }]}>
                                    {totalDistance.toFixed(1)}km
                                </Text>
                                <Text style={styles.statPillLabel}>Distance</Text>
                            </BlurView>
                            {stravaRuns > 0 && (
                                <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                    <Text style={[styles.statPillValue, { color: STRAVA_ORANGE }]}>{stravaRuns}</Text>
                                    <Text style={styles.statPillLabel}>Strava</Text>
                                </BlurView>
                            )}
                            {eventRuns > 0 && (
                                <BlurView intensity={20} tint="dark" style={styles.statPill}>
                                    <Text style={[styles.statPillValue, { color: EVENT_PURPLE }]}>{eventRuns}</Text>
                                    <Text style={styles.statPillLabel}>Events</Text>
                                </BlurView>
                            )}
                        </View>
                    )}

                    {runs.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <ClockIcon size={44} color="rgba(255,255,255,0.4)" />
                            </View>
                            <Text style={styles.emptyTitle}>{t('runHistory.noRuns')}</Text>
                            <Text style={styles.emptySubtitle}>{t('runHistory.runsWillAppear')}</Text>
                            <TouchableOpacity
                                style={styles.connectButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    navigation.navigate('StravaConnect');
                                }}
                            >
                                <Text style={styles.connectButtonText}>CONNECT STRAVA</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={runs}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <RunCard
                                    item={item}
                                    t={t}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        navigation.navigate('RunMap', { run: item });
                                    }}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#FFF"
                                />
                            }
                            ListFooterComponent={
                                runs.some(r => r.source === 'strava') ? (
                                    <BlurView intensity={15} tint="dark" style={styles.stravaFooter}>
                                        <Text style={styles.stravaFooterText}>Powered by </Text>
                                        <Text style={styles.stravaFooterBrand}>Strava</Text>
                                    </BlurView>
                                ) : null
                            }
                            // Performance optimizations
                            removeClippedSubviews={true}
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={5}
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

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 10,
    },
    statPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        gap: 6,
    },
    statPillValue: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFF',
    },
    statPillLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 12,
    },

    // Run Card
    runCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    stravaCard: {
        borderColor: `${STRAVA_ORANGE}50`,
        borderLeftWidth: 3,
        borderLeftColor: STRAVA_ORANGE,
    },
    eventCard: {
        borderColor: `${EVENT_PURPLE}50`,
        borderLeftWidth: 3,
        borderLeftColor: EVENT_PURPLE,
    },
    runCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    dateSection: {
        alignItems: 'center',
        width: 44,
    },
    dateDay: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
    },
    dateMonth: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        letterSpacing: 1,
    },
    accentLine: {
        width: 3,
        height: 40,
        borderRadius: 1.5,
        backgroundColor: theme.colors.success,
        marginHorizontal: 12,
    },
    statsSection: {
        flex: 1,
    },
    activityName: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
        textTransform: 'uppercase',
    },
    rightSection: {
        marginLeft: 12,
        alignItems: 'flex-end',
        gap: 4,
    },
    pointsValue: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    stravaBadgeContainer: {
        backgroundColor: `${STRAVA_ORANGE}20`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    stravaBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: STRAVA_ORANGE,
        letterSpacing: 0.3,
    },
    eventBadgeContainer: {
        backgroundColor: `${EVENT_PURPLE}20`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    eventBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: EVENT_PURPLE,
        letterSpacing: 0.3,
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
        marginBottom: 28,
    },
    connectButton: {
        backgroundColor: STRAVA_ORANGE,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
    },
    connectButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },

    // Strava Footer
    stravaFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    stravaFooterText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    stravaFooterBrand: {
        fontSize: 12,
        fontWeight: '700',
        color: STRAVA_ORANGE,
    },

    // Quick Actions
    quickActionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 10,
    },
    quickActionButton: {
        flex: 1,
    },
    quickActionBlur: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
        gap: 8,
    },
    quickActionText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.5,
    },
});
