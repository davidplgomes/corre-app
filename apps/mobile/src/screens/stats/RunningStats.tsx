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
    Dimensions,
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
import { TrendingUpIcon, ClockIcon, FireIcon } from '../../components/common/TabIcons';

const { width } = Dimensions.get('window');

type RunningStatsProps = {
    navigation: any;
};

type TimeRange = 'week' | 'month' | 'year' | 'all';

interface StatsData {
    totalDistance: number;
    totalRuns: number;
    totalTime: number; // seconds
    avgPace: number; // seconds per km
    longestRun: number;
    fastestPace: number;
    currentStreak: number;
    weeklyData: { day: string; distance: number }[];
}

const STRAVA_ORANGE = '#FC4C02';

export const RunningStats: React.FC<RunningStatsProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [stats, setStats] = useState<StatsData>({
        totalDistance: 0,
        totalRuns: 0,
        totalTime: 0,
        avgPace: 0,
        longestRun: 0,
        fastestPace: 0,
        currentStreak: 0,
        weeklyData: [],
    });

    const calculateStats = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [manualRuns, stravaActivities] = await Promise.all([
                getUserRuns(user.id).catch(() => []),
                getStravaActivities(100).catch(() => []),
            ]);

            // Combine all activities
            const allActivities = [
                ...manualRuns.map((run: any) => ({
                    date: new Date(run.created_at || run.started_at),
                    distance: run.distance_km || 0,
                    time: run.duration_seconds || 0,
                    pace: run.pace_per_km || 0,
                })),
                ...stravaActivities.map((activity: any) => ({
                    date: new Date(activity.start_date),
                    distance: (activity.distance_meters || 0) / 1000,
                    time: activity.moving_time_seconds || 0,
                    pace: activity.distance_meters > 0
                        ? (activity.moving_time_seconds / (activity.distance_meters / 1000))
                        : 0,
                })),
            ];

            // Filter by time range
            const now = new Date();
            let filterDate = new Date();
            switch (timeRange) {
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1);
                    break;
                case 'all':
                    filterDate = new Date(0);
                    break;
            }

            const filteredActivities = allActivities.filter(a => a.date >= filterDate);

            // Calculate stats
            const totalDistance = filteredActivities.reduce((sum, a) => sum + a.distance, 0);
            const totalTime = filteredActivities.reduce((sum, a) => sum + a.time, 0);
            const totalRuns = filteredActivities.length;
            const avgPace = totalDistance > 0 ? totalTime / totalDistance : 0;
            const longestRun = Math.max(...filteredActivities.map(a => a.distance), 0);
            const paces = filteredActivities.filter(a => a.pace > 0).map(a => a.pace);
            const fastestPace = paces.length > 0 ? Math.min(...paces) : 0;

            // Calculate streak (consecutive days with activities)
            const sortedByDate = [...allActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
            let streak = 0;
            let checkDate = new Date();
            checkDate.setHours(0, 0, 0, 0);

            for (let i = 0; i < 365; i++) {
                const hasActivity = sortedByDate.some(a => {
                    const actDate = new Date(a.date);
                    actDate.setHours(0, 0, 0, 0);
                    return actDate.getTime() === checkDate.getTime();
                });
                if (hasActivity) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (i === 0) {
                    // Allow today to be missing
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            // Weekly chart data
            const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyData = weekDays.map((day, index) => {
                const dayDate = new Date();
                const currentDay = dayDate.getDay();
                const diff = index - currentDay;
                dayDate.setDate(dayDate.getDate() + diff);
                dayDate.setHours(0, 0, 0, 0);

                const dayDistance = filteredActivities
                    .filter(a => {
                        const actDate = new Date(a.date);
                        actDate.setHours(0, 0, 0, 0);
                        return actDate.getTime() === dayDate.getTime();
                    })
                    .reduce((sum, a) => sum + a.distance, 0);

                return { day, distance: dayDistance };
            });

            setStats({
                totalDistance,
                totalRuns,
                totalTime,
                avgPace,
                longestRun,
                fastestPace,
                currentStreak: streak,
                weeklyData,
            });
        } catch (error) {
            console.error('Error calculating stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, timeRange]);

    useEffect(() => {
        setLoading(true);
        calculateStats();
    }, [calculateStats]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        calculateStats();
    }, [calculateStats]);

    const formatPace = (seconds: number): string => {
        if (!seconds || seconds <= 0) return "--'--\"";
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}'${secs.toString().padStart(2, '0')}"`;
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const maxDistance = Math.max(...stats.weeklyData.map(d => d.distance), 1);

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
                                <Text style={styles.headerTitle}>STATISTICS</Text>
                            </View>
                        </View>
                    </View>

                    {/* Time Range Selector */}
                    <View style={styles.timeRangeContainer}>
                        {(['week', 'month', 'year', 'all'] as TimeRange[]).map((range) => (
                            <TouchableOpacity
                                key={range}
                                style={[
                                    styles.timeRangeButton,
                                    timeRange === range && styles.timeRangeButtonActive
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setTimeRange(range);
                                }}
                            >
                                <Text style={[
                                    styles.timeRangeText,
                                    timeRange === range && styles.timeRangeTextActive
                                ]}>
                                    {range === 'all' ? 'ALL' : range.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
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
                        {/* Main Stats */}
                        <View style={styles.mainStatsRow}>
                            <BlurView intensity={25} tint="dark" style={styles.mainStatCard}>
                                <Text style={styles.mainStatValue}>
                                    {stats.totalDistance.toFixed(1)}
                                    <Text style={styles.mainStatUnit}>km</Text>
                                </Text>
                                <Text style={styles.mainStatLabel}>TOTAL DISTANCE</Text>
                            </BlurView>
                        </View>

                        {/* Secondary Stats Grid */}
                        <View style={styles.statsGrid}>
                            <BlurView intensity={20} tint="dark" style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <Text style={styles.statEmoji}>🏃</Text>
                                </View>
                                <Text style={styles.statValue}>{stats.totalRuns}</Text>
                                <Text style={styles.statLabel}>RUNS</Text>
                            </BlurView>

                            <BlurView intensity={20} tint="dark" style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <ClockIcon size={20} color={theme.colors.brand.primary} />
                                </View>
                                <Text style={styles.statValue}>{formatTime(stats.totalTime)}</Text>
                                <Text style={styles.statLabel}>TIME</Text>
                            </BlurView>

                            <BlurView intensity={20} tint="dark" style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <Text style={styles.statEmoji}>⚡</Text>
                                </View>
                                <Text style={styles.statValue}>{formatPace(stats.avgPace)}</Text>
                                <Text style={styles.statLabel}>AVG PACE</Text>
                            </BlurView>

                            <BlurView intensity={20} tint="dark" style={styles.statCard}>
                                <View style={styles.statIconContainer}>
                                    <FireIcon size={20} color="#F59E0B" />
                                </View>
                                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.currentStreak}</Text>
                                <Text style={styles.statLabel}>DAY STREAK</Text>
                            </BlurView>
                        </View>

                        {/* Weekly Chart */}
                        {timeRange === 'week' && (
                            <BlurView intensity={20} tint="dark" style={styles.chartCard}>
                                <Text style={styles.chartTitle}>THIS WEEK</Text>
                                <View style={styles.chartContainer}>
                                    {stats.weeklyData.map((data, index) => (
                                        <View key={index} style={styles.barContainer}>
                                            <View style={styles.barWrapper}>
                                                <View
                                                    style={[
                                                        styles.bar,
                                                        {
                                                            height: `${Math.max((data.distance / maxDistance) * 100, 5)}%`,
                                                            backgroundColor: data.distance > 0
                                                                ? theme.colors.brand.primary
                                                                : 'rgba(255,255,255,0.1)',
                                                        }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.barLabel}>{data.day}</Text>
                                            {data.distance > 0 && (
                                                <Text style={styles.barValue}>{data.distance.toFixed(1)}</Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </BlurView>
                        )}

                        {/* Personal Bests */}
                        <BlurView intensity={20} tint="dark" style={styles.bestsCard}>
                            <Text style={styles.bestsTitle}>PERSONAL BESTS</Text>
                            <View style={styles.bestsRow}>
                                <View style={styles.bestItem}>
                                    <Text style={styles.bestLabel}>LONGEST RUN</Text>
                                    <Text style={styles.bestValue}>{stats.longestRun.toFixed(1)} km</Text>
                                </View>
                                <View style={styles.bestDivider} />
                                <View style={styles.bestItem}>
                                    <Text style={styles.bestLabel}>FASTEST PACE</Text>
                                    <Text style={[styles.bestValue, { color: STRAVA_ORANGE }]}>
                                        {formatPace(stats.fastestPace)}/km
                                    </Text>
                                </View>
                            </View>
                        </BlurView>

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

    // Time Range
    timeRangeContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 10,
    },
    timeRangeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    timeRangeButtonActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    timeRangeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
    },
    timeRangeTextActive: {
        color: '#000',
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Main Stats
    mainStatsRow: {
        marginBottom: 16,
    },
    mainStatCard: {
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
        overflow: 'hidden',
    },
    mainStatValue: {
        fontSize: 56,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
    },
    mainStatUnit: {
        fontSize: 24,
        fontWeight: '700',
    },
    mainStatLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginTop: 8,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        width: (width - 52) / 2,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statEmoji: {
        fontSize: 20,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },

    // Chart
    chartCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    chartTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 20,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        height: 80,
        width: 24,
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    bar: {
        width: '100%',
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
    barValue: {
        fontSize: 9,
        color: theme.colors.brand.primary,
        fontWeight: '700',
        marginTop: 2,
    },

    // Personal Bests
    bestsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    bestsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 16,
    },
    bestsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bestItem: {
        flex: 1,
        alignItems: 'center',
    },
    bestDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    bestLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 6,
    },
    bestValue: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },

    // Strava Footer
    stravaFooter: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
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

export default RunningStats;
