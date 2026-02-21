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
import { getUserRuns } from '../../services/supabase/feed';
import { getStravaActivities, formatDistance, formatDuration } from '../../services/supabase/strava';
import { useAuth } from '../../contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface RunItem {
    id: string;
    date: string;
    distance: string;
    time: string;
    pace: string;
    points: number;
    source: 'manual' | 'strava';
    name?: string;
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

                // Fetch both manual runs and Strava activities in parallel
                const [manualData, stravaData] = await Promise.all([
                    getUserRuns(user.id).catch(() => []),
                    getStravaActivities(50).catch(() => [])
                ]);

                // Format manual runs
                const manualRuns: RunItem[] = manualData.map(post => ({
                    id: post.id,
                    date: post.created_at,
                    distance: post.meta_data?.distance || '0km',
                    time: post.meta_data?.time || '00:00',
                    pace: post.meta_data?.pace || "--'--\"/km",
                    points: post.meta_data?.points || 0,
                    source: 'manual' as const
                }));

                // Format Strava activities
                const stravaRuns: RunItem[] = stravaData.map(activity => ({
                    id: `strava-${activity.strava_id}`,
                    date: activity.start_date,
                    distance: `${formatDistance(activity.distance_meters)}km`,
                    time: formatDuration(activity.moving_time_seconds),
                    pace: calculatePace(activity.distance_meters, activity.moving_time_seconds),
                    points: activity.points_earned || 0,
                    source: 'strava' as const,
                    name: activity.name
                }));

                // Combine and sort by date (newest first)
                const allRuns = [...manualRuns, ...stravaRuns].sort(
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
            <View
                style={[styles.runCard, isStrava && styles.stravaCard]}
            >
                {/* Date */}
                <View style={styles.dateSection}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={[styles.dateMonth, isStrava && styles.stravaAccent]}>{month}</Text>
                </View>

                {/* Accent Line */}
                <View style={[styles.accentLine, isStrava && styles.stravaLine]} />

                {/* Stats */}
                <View style={styles.statsSection}>
                    {/* Activity name for Strava */}
                    {isStrava && item.name && (
                        <Text style={styles.activityName} numberOfLines={1}>{item.name}</Text>
                    )}
                    <View style={styles.statRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.distance}</Text>
                            <Text style={styles.statLabel}>{t('events.distance')}</Text>
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
                    {item.points > 0 ? (
                        <Text style={styles.pointsValue}>+{item.points}</Text>
                    ) : isStrava ? (
                        <Text style={styles.stravaBadge}>STRAVA</Text>
                    ) : null}
                </View>
            </View>
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
                    />
                )}

                {/* FAB - Start New Run */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('RunTracker')}
                >
                    <Text style={styles.fabText}>+ {t('common.new').toUpperCase()}</Text>
                </TouchableOpacity>
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
    activityName: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    stravaBadge: {
        fontSize: 8,
        fontWeight: '900',
        color: '#FC4C02',
        letterSpacing: 0.5,
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: theme.colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    fabText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
});
