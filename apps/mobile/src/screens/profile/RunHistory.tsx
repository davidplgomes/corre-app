import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from '../../components/common/TabIcons';
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

export const RunHistory: React.FC<RunHistoryProps> = ({ navigation }) => {
    const [runs, setRuns] = useState<RunItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { t } = useTranslation();

    // Helper to calculate pace from distance (meters) and time (seconds)
    const calculatePace = (distanceMeters: number, timeSeconds: number): string => {
        if (!distanceMeters || distanceMeters <= 0 || !timeSeconds) return "--'--\"/km";
        const distanceKm = distanceMeters / 1000;
        const paceSecondsPerKm = timeSeconds / distanceKm;
        const minutes = Math.floor(paceSecondsPerKm / 60);
        const seconds = Math.round(paceSecondsPerKm % 60);
        return `${minutes}'${seconds.toString().padStart(2, '0')}"/km`;
    };

    useEffect(() => {
        const fetchRuns = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);

                // Fetch manual runs, Strava activities, and check-ins in parallel
                const [manualData, stravaData, checkInsData] = await Promise.all([
                    getUserRuns(user.id).catch(() => []),
                    getStravaActivities(50).catch(() => []),
                    getUserCheckIns(user.id).catch(() => [])
                ]);

                // Format manual runs
                const manualRuns: RunItem[] = manualData.map((run: any) => {
                    const dateObj = new Date(run.started_at || run.created_at);
                    const hour = dateObj.getHours();
                    let nameKey = 'events.morningRun'; // 04:00 - 11:59
                    if (hour >= 12 && hour < 14) nameKey = 'events.lunchRun'; // 12:00 - 13:59
                    else if (hour >= 14 && hour < 17) nameKey = 'events.afternoonRun'; // 14:00 - 16:59
                    else if (hour >= 17 && hour < 20) nameKey = 'events.eveningRun'; // 17:00 - 19:59
                    else if (hour >= 20 || hour < 4) nameKey = 'events.nightRun'; // 20:00 - 03:59

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

                // Format Strava activities
                const stravaRuns: RunItem[] = stravaData.map(activity => ({
                    id: `strava-${activity.strava_id}`,
                    date: activity.start_date,
                    distance: `${formatDistance(activity.distance_meters)}km`,
                    time: formatStravaDuration(activity.moving_time_seconds),
                    pace: calculatePace(activity.distance_meters, activity.moving_time_seconds),
                    points: activity.points_earned || 0,
                    source: 'strava' as const,
                    name: activity.name,
                    route_data: activity.map_polyline
                }));

                // Format Event Check-ins
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

                // Combine and sort by date (newest first)
                const allRuns = [...manualRuns, ...stravaRuns, ...eventCheckIns].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                setRuns(allRuns);
            } catch (error) {
                console.error('Error fetching runs:', error);
                setRuns([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRuns();
    }, [user]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        return { day, month };
    };

    const totalDistance = runs.reduce((acc, run) => {
        const km = parseFloat((run.distance || '0').toString().replace('km', ''));
        return acc + (isNaN(km) ? 0 : km);
    }, 0);

    const totalRuns = runs.length;

    const renderItem = ({ item }: { item: RunItem }) => {
        const { day, month } = formatDate(item.date);
        const isStrava = item.source === 'strava';

        return (
            <TouchableOpacity
                style={[
                    styles.runCard,
                    isStrava && styles.stravaCard,
                    item.source === 'event' && styles.eventCard
                ]}
                onPress={() => navigation.navigate('RunMap', { run: item })}
                activeOpacity={0.7}
            >
                {/* Date */}
                <View style={styles.dateSection}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={[
                        styles.dateMonth,
                        isStrava && styles.stravaAccent,
                        item.source === 'event' && styles.eventAccent
                    ]}>{month}</Text>
                </View>

                {/* Accent Line */}
                <View style={[
                    styles.accentLine,
                    isStrava && styles.stravaLine,
                    item.source === 'event' && styles.eventLine
                ]} />

                {/* Stats */}
                <View style={styles.statsSection}>
                    {/* Activity name */}
                    {item.name && (
                        <Text style={styles.activityName} numberOfLines={1}>{item.name}</Text>
                    )}
                    <View style={styles.statRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.distance}</Text>
                            <Text style={styles.statLabel}>{item.source === 'event' ? t('events.event', 'EVENTO').toUpperCase() : t('events.distance').toUpperCase()}</Text>
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

                {/* Points / Source Badge */}
                <View style={styles.pointsSection}>
                    {item.points > 0 && (
                        <Text style={styles.pointsValue}>+{item.points}</Text>
                    )}
                    {isStrava && (
                        <View style={styles.stravaBadgeContainer}>
                            <Text style={styles.stravaBadge}>via Strava</Text>
                        </View>
                    )}
                    {item.source === 'event' && (
                        <View style={styles.eventBadgeContainer}>
                            <Text style={styles.eventBadge}>{t('events.event', 'EVENT').toUpperCase()}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <BackButton onPress={() => {
                        Haptics.selectionAsync();
                        navigation.goBack();
                    }} />
                    <View>
                        <Text style={styles.headerLabel}>{t('runHistory.title').split(' ')[0].toUpperCase()}</Text>
                        <Text style={styles.headerTitle}>{t('runHistory.title').split(' ').slice(1).join(' ').toUpperCase()}</Text>
                    </View>
                </View>

                {/* Summary */}
                <View style={styles.summaryRow}>
                    <BlurView intensity={20} tint="dark" style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <Text style={styles.summaryValue}>{totalRuns}</Text>
                            <Text style={styles.summaryLabel}>{t('events.runs').toUpperCase()}</Text>
                        </View>
                    </BlurView>
                    <BlurView intensity={20} tint="dark" style={[styles.summaryCard, styles.summaryCardAccent]}>
                        <View style={styles.summaryContent}>
                            <Text style={[styles.summaryValue, styles.accentText]}>{totalDistance.toFixed(1)}km</Text>
                            <Text style={styles.summaryLabel}>TOTAL</Text>
                        </View>
                    </BlurView>
                </View>

                {/* List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={runs}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <ClockIcon size={48} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.emptyText}>{t('runHistory.noRuns')}</Text>
                                <Text style={styles.emptySubtext}>{t('runHistory.runsWillAppear')}</Text>
                            </View>
                        }
                        ListFooterComponent={
                            runs.some(r => r.source === 'strava') ? (
                                <View style={styles.stravaFooter}>
                                    <Text style={styles.stravaFooterText}>Powered by </Text>
                                    <Text style={styles.stravaFooterBrand}>Strava</Text>
                                </View>
                            ) : null
                        }
                    />
                )}


            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    // Header
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
    // Summary
    summaryRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    summaryCardAccent: {
        borderColor: theme.colors.brand.primary,
    },
    summaryContent: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    summaryValue: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 4,
    },
    accentText: {
        color: theme.colors.brand.primary,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.3)',
        marginTop: 8,
    },
    // Run Card
    runCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
    pointsSection: {
        marginLeft: 12,
    },
    pointsValue: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    // Strava-specific styles
    stravaCard: {
        borderColor: '#FC4C02', // Strava orange
        borderLeftWidth: 3,
    },
    stravaAccent: {
        color: '#FC4C02',
    },
    stravaLine: {
        backgroundColor: '#FC4C02',
    },
    // Event-specific styles
    eventCard: {
        borderColor: 'rgba(124, 58, 237, 0.5)',
        borderLeftWidth: 3,
    },
    eventAccent: {
        color: 'rgba(124, 58, 237, 1)',
    },
    eventLine: {
        backgroundColor: 'rgba(124, 58, 237, 1)',
    },
    activityName: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    stravaBadgeContainer: {
        backgroundColor: 'rgba(252, 76, 2, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 4,
    },
    stravaBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FC4C02',
        letterSpacing: 0.3,
    },
    eventBadgeContainer: {
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 4,
    },
    eventBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: 'rgba(124, 58, 237, 1)',
        letterSpacing: 0.3,
    },
    stravaFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    stravaFooterText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    stravaFooterBrand: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FC4C02',
    },
});
