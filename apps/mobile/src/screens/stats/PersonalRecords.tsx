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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { BackButton } from '../../components/common';
import { getUserRuns } from '../../services/supabase/runs';
import { getStravaActivities } from '../../services/supabase/strava';
import { TrophyIcon } from '../../components/common/TabIcons';

type PersonalRecordsProps = {
    navigation: any;
};

interface PRRecord {
    distance: string;
    distanceKm: number;
    time: number | null; // seconds
    date: string | null;
    pace: number | null; // seconds per km
}

const STRAVA_ORANGE = '#FC4C02';

const PR_DISTANCES = [
    { name: '1K', km: 1, emoji: '🏃' },
    { name: '5K', km: 5, emoji: '🥉' },
    { name: '10K', km: 10, emoji: '🥈' },
    { name: 'HALF', km: 21.1, emoji: '🥇' },
    { name: 'MARATHON', km: 42.2, emoji: '🏆' },
];

export const PersonalRecords: React.FC<PersonalRecordsProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [records, setRecords] = useState<PRRecord[]>([]);
    const [fastestPace, setFastestPace] = useState<{ pace: number; date: string } | null>(null);
    const [longestRun, setLongestRun] = useState<{ distance: number; date: string } | null>(null);

    const calculatePRs = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [manualRuns, stravaActivities] = await Promise.all([
                getUserRuns(user.id).catch(() => []),
                getStravaActivities(200).catch(() => []),
            ]);

            // Combine all activities
            const allActivities = [
                ...manualRuns.map((run: any) => ({
                    date: run.created_at || run.started_at,
                    distance: run.distance_km || 0,
                    time: run.duration_seconds || 0,
                })),
                ...stravaActivities.map((activity: any) => ({
                    date: activity.start_date,
                    distance: (activity.distance_meters || 0) / 1000,
                    time: activity.moving_time_seconds || 0,
                })),
            ];

            // Calculate PRs for each distance
            const prs: PRRecord[] = PR_DISTANCES.map(({ name, km }) => {
                // Find runs that are at least this distance (within 5% tolerance for GPS drift)
                const qualifyingRuns = allActivities.filter(a => a.distance >= km * 0.95);

                if (qualifyingRuns.length === 0) {
                    return {
                        distance: name,
                        distanceKm: km,
                        time: null,
                        date: null,
                        pace: null,
                    };
                }

                // For each qualifying run, estimate the time for exactly this distance
                const estimatedTimes = qualifyingRuns.map(run => {
                    // If run is exactly this distance (within tolerance), use actual time
                    if (run.distance >= km * 0.95 && run.distance <= km * 1.05) {
                        return {
                            time: run.time,
                            date: run.date,
                            pace: run.time / run.distance,
                        };
                    }
                    // Otherwise, estimate based on pace
                    const pace = run.time / run.distance;
                    return {
                        time: pace * km,
                        date: run.date,
                        pace: pace,
                    };
                });

                // Find fastest time
                const fastest = estimatedTimes.reduce((best, current) =>
                    !best || current.time < best.time ? current : best
                );

                return {
                    distance: name,
                    distanceKm: km,
                    time: fastest.time,
                    date: fastest.date,
                    pace: fastest.pace,
                };
            });

            setRecords(prs);

            // Calculate overall fastest pace and longest run
            if (allActivities.length > 0) {
                const withPace = allActivities
                    .filter(a => a.distance > 0 && a.time > 0)
                    .map(a => ({ pace: a.time / a.distance, date: a.date }));

                if (withPace.length > 0) {
                    const fastest = withPace.reduce((best, curr) =>
                        curr.pace < best.pace ? curr : best
                    );
                    setFastestPace(fastest);
                }

                const longest = allActivities.reduce((best, curr) =>
                    curr.distance > best.distance ? curr : best
                );
                setLongestRun({ distance: longest.distance, date: longest.date });
            }
        } catch (error) {
            console.error('Error calculating PRs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        calculatePRs();
    }, [calculatePRs]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        calculatePRs();
    }, [calculatePRs]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.round(seconds % 60);

        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatPace = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

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
                                <Text style={styles.headerLabel}>PERSONAL</Text>
                                <Text style={styles.headerTitle}>RECORDS</Text>
                            </View>
                        </View>
                        <View style={styles.trophyContainer}>
                            <TrophyIcon size={28} color={theme.colors.brand.primary} />
                        </View>
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
                        {/* Highlight Stats */}
                        <View style={styles.highlightRow}>
                            <BlurView intensity={25} tint="dark" style={styles.highlightCard}>
                                <Text style={styles.highlightEmoji}>⚡</Text>
                                <Text style={styles.highlightLabel}>FASTEST PACE</Text>
                                {fastestPace ? (
                                    <>
                                        <Text style={styles.highlightValue}>
                                            {formatPace(fastestPace.pace)}/km
                                        </Text>
                                        <Text style={styles.highlightDate}>
                                            {formatDate(fastestPace.date)}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.highlightEmpty}>No data yet</Text>
                                )}
                            </BlurView>

                            <BlurView intensity={25} tint="dark" style={styles.highlightCard}>
                                <Text style={styles.highlightEmoji}>🛣️</Text>
                                <Text style={styles.highlightLabel}>LONGEST RUN</Text>
                                {longestRun ? (
                                    <>
                                        <Text style={styles.highlightValue}>
                                            {longestRun.distance.toFixed(1)} km
                                        </Text>
                                        <Text style={styles.highlightDate}>
                                            {formatDate(longestRun.date)}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.highlightEmpty}>No data yet</Text>
                                )}
                            </BlurView>
                        </View>

                        {/* PR Cards */}
                        <Text style={styles.sectionTitle}>DISTANCE RECORDS</Text>

                        {records.map((record, index) => {
                            const prInfo = PR_DISTANCES.find(p => p.name === record.distance);
                            const hasRecord = record.time !== null;

                            return (
                                <BlurView
                                    key={record.distance}
                                    intensity={hasRecord ? 25 : 15}
                                    tint="dark"
                                    style={[
                                        styles.prCard,
                                        hasRecord && styles.prCardActive
                                    ]}
                                >
                                    <View style={styles.prLeft}>
                                        <View style={[
                                            styles.prIconContainer,
                                            hasRecord && styles.prIconContainerActive
                                        ]}>
                                            <Text style={styles.prEmoji}>{prInfo?.emoji}</Text>
                                        </View>
                                        <View>
                                            <Text style={[
                                                styles.prDistance,
                                                hasRecord && styles.prDistanceActive
                                            ]}>
                                                {record.distance}
                                            </Text>
                                            <Text style={styles.prDistanceKm}>
                                                {record.distanceKm} km
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.prRight}>
                                        {hasRecord ? (
                                            <>
                                                <Text style={styles.prTime}>
                                                    {formatTime(record.time!)}
                                                </Text>
                                                <Text style={styles.prPace}>
                                                    {formatPace(record.pace!)}/km
                                                </Text>
                                                <Text style={styles.prDate}>
                                                    {formatDate(record.date!)}
                                                </Text>
                                            </>
                                        ) : (
                                            <View style={styles.prLocked}>
                                                <Text style={styles.prLockedIcon}>🔒</Text>
                                                <Text style={styles.prLockedText}>
                                                    Run {record.distanceKm}km to unlock
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </BlurView>
                            );
                        })}

                        {/* Strava Attribution */}
                        <BlurView intensity={15} tint="dark" style={styles.stravaFooter}>
                            <Text style={styles.stravaFooterText}>Data synced from </Text>
                            <Text style={styles.stravaFooterBrand}>Strava</Text>
                        </BlurView>
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
    trophyContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(204, 255, 0, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Highlight Row
    highlightRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    highlightCard: {
        flex: 1,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    highlightEmoji: {
        fontSize: 28,
        marginBottom: 8,
    },
    highlightLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 8,
    },
    highlightValue: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    highlightDate: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    highlightEmpty: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.3)',
    },

    // Section
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 16,
    },

    // PR Cards
    prCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    prCardActive: {
        borderColor: 'rgba(204, 255, 0, 0.3)',
    },
    prLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    prIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    prIconContainerActive: {
        backgroundColor: 'rgba(204, 255, 0, 0.15)',
    },
    prEmoji: {
        fontSize: 22,
    },
    prDistance: {
        fontSize: 18,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.4)',
    },
    prDistanceActive: {
        color: '#FFF',
    },
    prDistanceKm: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2,
    },
    prRight: {
        alignItems: 'flex-end',
    },
    prTime: {
        fontSize: 22,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    prPace: {
        fontSize: 12,
        fontWeight: '600',
        color: STRAVA_ORANGE,
        marginTop: 2,
    },
    prDate: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    prLocked: {
        alignItems: 'center',
    },
    prLockedIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    prLockedText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
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
});

export default PersonalRecords;
