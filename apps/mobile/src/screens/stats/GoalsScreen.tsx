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
    TextInput,
    Modal,
    Alert,
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
import { PlusIcon, CheckIcon } from '../../components/common/TabIcons';

type GoalsScreenProps = {
    navigation: any;
};

interface Goal {
    id: string;
    type: 'weekly_distance' | 'weekly_runs' | 'monthly_distance' | 'streak';
    target: number;
    current: number;
    emoji: string;
    title: string;
    unit: string;
}

const PRESET_GOALS = [
    { type: 'weekly_distance', targets: [10, 20, 30, 50], emoji: '🎯', title: 'Weekly Distance', unit: 'km' },
    { type: 'weekly_runs', targets: [2, 3, 4, 5], emoji: '🏃', title: 'Weekly Runs', unit: 'runs' },
    { type: 'monthly_distance', targets: [50, 100, 150, 200], emoji: '📅', title: 'Monthly Distance', unit: 'km' },
    { type: 'streak', targets: [7, 14, 30, 60], emoji: '🔥', title: 'Day Streak', unit: 'days' },
];

const COMMUNITY_CHALLENGES = [
    {
        id: 'feb_challenge',
        title: 'February 100K',
        description: 'Run 100km this month',
        target: 100,
        emoji: '❄️',
        participants: 234,
        endDate: '2026-02-28',
    },
    {
        id: 'consistency',
        title: 'Consistency King',
        description: 'Run at least 3 times per week for 4 weeks',
        target: 12,
        emoji: '👑',
        participants: 156,
        endDate: '2026-03-15',
    },
    {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Beat your 5K PR this month',
        target: 1,
        emoji: '⚡',
        participants: 89,
        endDate: '2026-02-28',
    },
];

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [selectedGoalType, setSelectedGoalType] = useState<string | null>(null);
    const [customTarget, setCustomTarget] = useState('');

    const calculateProgress = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [manualRuns, stravaActivities] = await Promise.all([
                getUserRuns(user.id).catch(() => []),
                getStravaActivities(100).catch(() => []),
            ]);

            const allActivities = [
                ...manualRuns.map((run: any) => ({
                    date: new Date(run.created_at || run.started_at),
                    distance: run.distance_km || 0,
                })),
                ...stravaActivities.map((activity: any) => ({
                    date: new Date(activity.start_date),
                    distance: (activity.distance_meters || 0) / 1000,
                })),
            ];

            // Calculate weekly stats
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const weeklyActivities = allActivities.filter(a => a.date >= weekStart);
            const monthlyActivities = allActivities.filter(a => a.date >= monthStart);

            const weeklyDistance = weeklyActivities.reduce((sum, a) => sum + a.distance, 0);
            const weeklyRuns = weeklyActivities.length;
            const monthlyDistance = monthlyActivities.reduce((sum, a) => sum + a.distance, 0);

            // Calculate streak
            let streak = 0;
            const sortedByDate = [...allActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
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
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }

            // Create default goals (in a real app, these would be stored in DB)
            const defaultGoals: Goal[] = [
                {
                    id: 'weekly_distance',
                    type: 'weekly_distance',
                    target: 20,
                    current: weeklyDistance,
                    emoji: '🎯',
                    title: 'Weekly Distance',
                    unit: 'km',
                },
                {
                    id: 'weekly_runs',
                    type: 'weekly_runs',
                    target: 3,
                    current: weeklyRuns,
                    emoji: '🏃',
                    title: 'Weekly Runs',
                    unit: 'runs',
                },
                {
                    id: 'monthly_distance',
                    type: 'monthly_distance',
                    target: 100,
                    current: monthlyDistance,
                    emoji: '📅',
                    title: 'Monthly Distance',
                    unit: 'km',
                },
                {
                    id: 'streak',
                    type: 'streak',
                    target: 7,
                    current: streak,
                    emoji: '🔥',
                    title: 'Day Streak',
                    unit: 'days',
                },
            ];

            setGoals(defaultGoals);
        } catch (error) {
            console.error('Error calculating progress:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        calculateProgress();
    }, [calculateProgress]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        calculateProgress();
    }, [calculateProgress]);

    const handleJoinChallenge = (challengeId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
            'Challenge Joined!',
            'You have successfully joined this challenge. Good luck!',
            [{ text: 'OK' }]
        );
    };

    const getProgressPercentage = (current: number, target: number): number => {
        return Math.min((current / target) * 100, 100);
    };

    const getDaysRemaining = (endDate: string): number => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
                                <Text style={styles.headerLabel}>YOUR</Text>
                                <Text style={styles.headerTitle}>GOALS</Text>
                            </View>
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
                        {/* Personal Goals */}
                        <Text style={styles.sectionTitle}>PERSONAL GOALS</Text>

                        {goals.map((goal) => {
                            const progress = getProgressPercentage(goal.current, goal.target);
                            const isComplete = progress >= 100;

                            return (
                                <BlurView
                                    key={goal.id}
                                    intensity={25}
                                    tint="dark"
                                    style={[styles.goalCard, isComplete && styles.goalCardComplete]}
                                >
                                    <View style={styles.goalHeader}>
                                        <View style={styles.goalLeft}>
                                            <View style={[
                                                styles.goalIconContainer,
                                                isComplete && styles.goalIconComplete
                                            ]}>
                                                <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.goalTitle}>{goal.title}</Text>
                                                <Text style={styles.goalProgress}>
                                                    {goal.type.includes('distance')
                                                        ? goal.current.toFixed(1)
                                                        : goal.current
                                                    } / {goal.target} {goal.unit}
                                                </Text>
                                            </View>
                                        </View>
                                        {isComplete ? (
                                            <View style={styles.completeBadge}>
                                                <CheckIcon size={16} color="#000" />
                                            </View>
                                        ) : (
                                            <Text style={styles.percentageText}>{Math.round(progress)}%</Text>
                                        )}
                                    </View>

                                    {/* Progress Bar */}
                                    <View style={styles.progressBarContainer}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                {
                                                    width: `${progress}%`,
                                                    backgroundColor: isComplete
                                                        ? theme.colors.success
                                                        : theme.colors.brand.primary
                                                }
                                            ]}
                                        />
                                    </View>
                                </BlurView>
                            );
                        })}

                        {/* Community Challenges */}
                        <View style={styles.challengeHeader}>
                            <Text style={styles.sectionTitle}>COMMUNITY CHALLENGES</Text>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        </View>

                        {COMMUNITY_CHALLENGES.map((challenge) => {
                            const daysLeft = getDaysRemaining(challenge.endDate);

                            return (
                                <BlurView
                                    key={challenge.id}
                                    intensity={20}
                                    tint="dark"
                                    style={styles.challengeCard}
                                >
                                    <View style={styles.challengeTop}>
                                        <View style={styles.challengeIconContainer}>
                                            <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                                        </View>
                                        <View style={styles.challengeInfo}>
                                            <Text style={styles.challengeTitle}>{challenge.title}</Text>
                                            <Text style={styles.challengeDescription}>{challenge.description}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.challengeStats}>
                                        <View style={styles.challengeStat}>
                                            <Text style={styles.challengeStatValue}>{challenge.participants}</Text>
                                            <Text style={styles.challengeStatLabel}>runners</Text>
                                        </View>
                                        <View style={styles.challengeStat}>
                                            <Text style={[styles.challengeStatValue, { color: '#F59E0B' }]}>
                                                {daysLeft}
                                            </Text>
                                            <Text style={styles.challengeStatLabel}>days left</Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.joinButton}
                                        onPress={() => handleJoinChallenge(challenge.id)}
                                    >
                                        <Text style={styles.joinButtonText}>JOIN CHALLENGE</Text>
                                    </TouchableOpacity>
                                </BlurView>
                            );
                        })}

                        {/* Motivation Quote */}
                        <BlurView intensity={15} tint="dark" style={styles.quoteCard}>
                            <Text style={styles.quoteText}>
                                "The only bad workout is the one that didn't happen."
                            </Text>
                            <Text style={styles.quoteAuthor}>— Unknown Runner</Text>
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

    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },

    // Section Title
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 16,
        marginTop: 8,
    },

    // Goal Cards
    goalCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    goalCardComplete: {
        borderColor: 'rgba(16, 185, 129, 0.5)',
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    goalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    goalIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    goalIconComplete: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
    },
    goalEmoji: {
        fontSize: 22,
    },
    goalTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 2,
    },
    goalProgress: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
    },
    percentageText: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    completeBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },

    // Challenge Header
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
    },
    liveText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    },

    // Challenge Cards
    challengeCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    challengeTop: {
        flexDirection: 'row',
        gap: 14,
        marginBottom: 14,
    },
    challengeIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    challengeEmoji: {
        fontSize: 24,
    },
    challengeInfo: {
        flex: 1,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 4,
    },
    challengeDescription: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 18,
    },
    challengeStats: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    challengeStat: {
        alignItems: 'center',
    },
    challengeStatValue: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    challengeStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2,
    },
    joinButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    joinButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 1,
    },

    // Quote Card
    quoteCard: {
        borderRadius: 16,
        padding: 24,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        alignItems: 'center',
    },
    quoteText: {
        fontSize: 16,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 12,
    },
    quoteAuthor: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
});

export default GoalsScreen;
