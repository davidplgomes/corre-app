import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, ImageBackground, Dimensions, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getUserJoinedEvents } from '../../services/supabase/events';
import { getFeedPosts } from '../../services/supabase/feed';
import { getWeatherForEvent, getCurrentLocationWeather, formatWeather } from '../../services/weather';
import { getUserGamificationProfile, PlanType } from '../../services/monetization.mock';
import { Skeleton } from '../../components/common';
import {
    CalendarIcon,
    TrophyIcon,
    CardIcon,
    ChevronRightIcon,
    MapIcon,
    RunIcon
} from '../../components/common/TabIcons';
import { TierBadge } from '../../components/profile';
import { TierKey } from '../../constants/tiers';

const SwipeIndicator = () => {
    const translateX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(translateX, {
                    toValue: 6,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.swipeIndicatorContainer, { transform: [{ translateX }] }]}>
            <BlurView intensity={20} tint="light" style={styles.swipeIndicatorGlass}>
                <ChevronRightIcon color="#FFF" size={24} />
            </BlurView>
        </Animated.View>
    );
};

export const HomeScreen = ({ navigation }: any) => {
    const { user, profile } = useAuth();
    const { t, i18n } = useTranslation();
    // Use pt-BR by default unless explicitly set to English
    const locale = i18n.language?.startsWith('en') ? 'en-US' : 'pt-BR';
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const [nextRuns, setNextRuns] = useState<any[]>([]);
    const [latestPost, setLatestPost] = useState<any>(null);
    const [userPlan, setUserPlan] = useState<PlanType>('free');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch joined events and find next one
            if (user) {
                const joinedEvents = await getUserJoinedEvents(user.id);
                const now = new Date();
                // Include events from the last 4 hours to keep them visible while active/for check-in
                const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

                const futureEvents = joinedEvents
                    .filter(e => new Date(e.event_datetime) > fourHoursAgo)
                    .sort((a, b) => new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime())
                    .slice(0, 3); // Get top 3

                if (futureEvents.length > 0) {
                    const processedRuns = await Promise.all(futureEvents.map(async (event) => {
                        const date = new Date(event.event_datetime);
                        const day = date.getDate();
                        const month = date.toLocaleDateString(locale, { month: 'short' }).toUpperCase().replace('.', '');
                        const weekday = date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase().replace('.', '');
                        const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

                        // Fetch weather for event location or current location
                        let weatherStr = '';
                        if (event.location_lat && event.location_lng) {
                            weatherStr = await getWeatherForEvent(event.location_lat, event.location_lng);
                        } else if (futureEvents.indexOf(event) === 0) {
                            // Only fallback to current location for the very first event if needed, or keep it empty
                            const currentWeather = await getCurrentLocationWeather();
                            weatherStr = currentWeather ? formatWeather(currentWeather) : '';
                        }

                        return {
                            id: event.id,
                            title: event.title,
                            day: day,
                            month: month,
                            weekday: weekday,
                            time: time,
                            location: event.location_name || 'Local a definir',
                            points: `${event.points_value}PTS`,
                            weather: weatherStr || '🌡️ --°C'
                        };
                    }));
                    setNextRuns(processedRuns);
                } else {
                    setNextRuns([]);
                }
            }

            // Fetch latest feed post
            const posts = await getFeedPosts(1);
            if (posts.length > 0) {
                const post = posts[0];
                let action = t('events.activityPost');
                if (post.activity_type === 'run') action = `${t('events.activityRun')} ${post.meta_data?.distance || ''}`;
                if (post.activity_type === 'check_in') action = t('events.activityCheckIn');

                setLatestPost({
                    user: post.users?.full_name || t('common.user'),
                    action: action,
                    initials: post.users?.full_name ? post.users.full_name.substring(0, 2).toUpperCase() : 'US'
                });
            } else {
                setLatestPost(null);
            }

            // Load user subscription plan
            if (user?.id) {
                try {
                    const gamification = await getUserGamificationProfile(user.id);
                    setUserPlan(gamification.subscription?.planType || 'free');
                } catch (e) {
                    console.error('Error loading user plan:', e);
                }
            }

        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, locale]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const QuickAction = ({ icon: Icon, label, onPress }: any) => (
        <TouchableOpacity style={styles.quickActionWrapper} onPress={onPress} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={styles.quickActionCard}>
                <View style={styles.quickActionContent}>
                    <View style={styles.quickActionIcon}>
                        <Icon size={24} color="#FFF" fill="#FFF" />
                    </View>
                    <Text style={styles.quickActionLabel}>{label.toUpperCase()}</Text>
                </View>
            </BlurView>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/CorreHS_dark.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
                >
                    {/* Header / Greeting */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greeting}>{t('common.greeting', 'Olá')},</Text>
                            <Text style={styles.userName}>{profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Runner'}!</Text>
                        </View>
                        <View style={styles.headerBadges}>
                            {/* Plan Badge */}
                            <TouchableOpacity
                                style={styles.planBadgeContainer}
                                onPress={() => navigation.navigate('Profile', {
                                    screen: 'SubscriptionScreen',
                                    params: { from: 'Home' }
                                })}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={userPlan === 'club' ? ['#FFD700', '#FFA500'] :
                                        (userPlan === 'pro' ? [theme.colors.brand.primary, theme.colors.brand.secondary] :
                                            ['rgba(100,100,100,0.8)', 'rgba(60,60,60,0.8)'])}
                                    style={styles.planBadge}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={[styles.planBadgeText, userPlan === 'club' && { color: '#000' }]}>
                                        {userPlan.toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hero Card: Next Run */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('home.nextWorkout')}</Text>
                        {loading ? (
                            <Skeleton height={200} borderRadius={30} />
                        ) : nextRuns.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginHorizontal: -20 }} // Break out of parent padding
                                contentContainerStyle={{ paddingHorizontal: 20 }} // Add padding to content instead
                                decelerationRate="fast"
                                snapToInterval={Dimensions.get('window').width * 0.85 + 16} // card width + margin
                                onScroll={(e) => setIsScrolled(e.nativeEvent.contentOffset.x > 10)}
                                scrollEventThrottle={16}
                            >
                                {nextRuns.map((run, index) => (
                                    <TouchableOpacity
                                        key={run.id}
                                        style={[styles.heroCardContainer, { marginRight: 16, zIndex: index === 0 ? 100 : 1 }]}
                                        onPress={() => navigation.navigate('Events', { screen: 'EventDetail', params: { eventId: run.id } })}
                                        activeOpacity={0.8}
                                    >
                                        <BlurView intensity={30} tint="dark" style={styles.heroCard}>
                                            <View style={styles.heroGlassContent}>
                                                <View style={styles.heroTopRow}>
                                                    <View style={styles.heroBadge}>
                                                        <Text style={styles.heroBadgeText}>{index === 0 ? t('home.next').toUpperCase() : t('events.upcoming').toUpperCase()}</Text>
                                                    </View>
                                                    <View style={styles.weatherBadge}>
                                                        <Text style={styles.weatherText}>{run.weather}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.heroMainContent}>
                                                    <View style={styles.heroDateSection}>
                                                        <Text style={styles.heroDateDay}>{run.day}</Text>
                                                        <Text style={styles.heroDateMonth}>{run.month}</Text>
                                                        <Text style={styles.heroDateWeekday}>{run.weekday}</Text>
                                                        <Text style={styles.heroDateTime}>{run.time}</Text>
                                                    </View>
                                                    <View style={styles.heroInfoSection}>
                                                        <Text style={styles.totalDistance}>{run.points}</Text>
                                                        <Text style={styles.heroTitle} numberOfLines={2}>{run.title}</Text>
                                                        <Text style={styles.heroLocation} numberOfLines={1}>📍 {run.location}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </BlurView>

                                        {/* Swipe Indicator in the margin space */}
                                        {index === 0 && nextRuns.length > 1 && !isScrolled && (
                                            <SwipeIndicator />
                                        )}

                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <BlurView intensity={30} tint="dark" style={styles.emptyStateCard}>
                                <View style={styles.emptyStateContent}>
                                    <Text style={styles.emptyStateText}>{t('home.noScheduledWorkout').toUpperCase()}</Text>
                                    <TouchableOpacity style={styles.emptyStateCTA} onPress={() => navigation.navigate('Events')} activeOpacity={0.8}>
                                        <Text style={styles.emptyStateCTAText}>{t('home.viewEvents').toUpperCase()}</Text>
                                        <View style={styles.arrowContainer}>
                                            <Text style={styles.arrowText}>→</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </BlurView>
                        )}
                    </View>

                    {/* Quick Actions Grid */}
                    <View style={styles.quickActionsGrid}>
                        <QuickAction
                            icon={CardIcon}
                            label="Cupons"
                            onPress={() => navigation.navigate('Loyalty')}
                        />
                        <QuickAction
                            icon={CalendarIcon}
                            label="Eventos"
                            onPress={() => navigation.navigate('Events')}
                        />
                        <QuickAction
                            icon={TrophyIcon}
                            label="Ranking"
                            onPress={() => navigation.navigate('Feed', { screen: 'Leaderboard' })}
                        />
                    </View>

                    {/* Recent Activity / Feed Preview */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{t('home.recentFeed')}</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
                                <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
                            </TouchableOpacity>
                        </View>
                        {loading ? (
                            <View style={{ gap: 10 }}>
                                <Skeleton height={80} borderRadius={20} />
                            </View>
                        ) : latestPost ? (
                            <BlurView intensity={25} tint="dark" style={styles.feedPreviewBlur}>
                                <TouchableOpacity style={styles.feedPreviewCard} onPress={() => navigation.navigate('Feed')} activeOpacity={0.8}>
                                    <View style={styles.feedHeader}>
                                        <View style={styles.avatarMini}><Text style={styles.avatarText}>{latestPost.initials}</Text></View>
                                        <View>
                                            <Text style={styles.feedUser}>{latestPost.user}</Text>
                                            <Text style={styles.feedAction}>{latestPost.action}</Text>
                                        </View>
                                    </View>
                                    <ChevronRightIcon color="#FFF" size={20} />
                                </TouchableOpacity>
                            </BlurView>
                        ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{t('home.noRecentActivity')}</Text>
                        )}
                    </View>

                </ScrollView >
            </ImageBackground >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[6],
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    userName: {
        fontSize: 48,
        color: '#FFF',
        fontWeight: '900',
        fontStyle: 'italic',
        includeFontPadding: false,
        lineHeight: 48,
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    section: {
        marginBottom: theme.spacing[6],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[3],
    },
    sectionTitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    viewAllText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    // Hero Card
    heroCardContainer: {
        // transform: [{ rotate: '-1deg' }], // Removed rotation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        width: Dimensions.get('window').width * 0.85,
    },
    heroCard: {
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroGlassContent: {
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    heroContent: {
        zIndex: 2,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    heroBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    heroBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    weatherBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    weatherText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    heroMainContent: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    heroDateSection: {
        alignItems: 'center',
        paddingRight: 16,
        borderRightWidth: 3,
        borderRightColor: theme.colors.brand.primary,
        minWidth: 60,
    },
    heroDateDay: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        lineHeight: 32,
        includeFontPadding: false,
    },
    heroDateMonth: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    heroDateWeekday: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    heroDateTime: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 0.5,
        marginTop: 6,
    },
    heroInfoSection: {
        flex: 1,
    },
    totalDistance: {
        fontSize: 32,
        color: theme.colors.brand.primary,
        fontWeight: '900',
        fontStyle: 'italic',
        lineHeight: 32,
        includeFontPadding: false,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 18,
        color: '#FFF',
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 6,
    },
    heroLocation: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '600',
    },
    swipeIndicatorContainer: {
        position: 'absolute',
        right: -32, // Adjusted for new container size to be centered in gap
        top: '50%',
        marginTop: -20, // Half of height
        zIndex: 10,
    },
    swipeIndicatorGlass: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.1)', // Subtle tint
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    // Decorative
    decorativeCircle1: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decorativeCircle2: {
        position: 'absolute',
        top: -30,
        left: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    // Empty State
    emptyStateCard: {
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    emptyStateContent: {
        padding: 32,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
    },
    emptyStateText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 20,
        textAlign: 'center',
    },
    emptyStateCTA: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
        minWidth: 200,
    },
    emptyStateCTAText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
        marginLeft: 20,
    },
    arrowContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        color: '#FFF',
        fontSize: 20,
    },
    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    quickActionWrapper: {
        flex: 1,
        transform: [{ rotate: '0.5deg' }],
    },
    quickActionCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    quickActionContent: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickAction: {
        flex: 1,
        backgroundColor: theme.colors.background.card,
        padding: theme.spacing[4],
        borderRadius: theme.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    quickActionLabel: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // Feed Preview
    feedPreviewBlur: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    feedPreviewCard: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarMini: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    feedUser: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    feedAction: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    // Plan Badge Styles
    headerBadges: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    planBadgeContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    planBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    planBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
