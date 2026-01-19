import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { getUserJoinedEvents } from '../../services/supabase/events';
import { getFeedPosts } from '../../services/supabase/feed';
import { Skeleton } from '../../components/common';
import {
    CalendarIcon,
    TrophyIcon,
    CardIcon,
    ChevronRightIcon,
    MapIcon,
    RunIcon
} from '../../components/common/TabIcons';
import { useTranslation } from 'react-i18next';
import { TierBadge } from '../../components/profile';
import { TierKey } from '../../constants/tiers';

export const HomeScreen = ({ navigation }: any) => {
    const { user, profile } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [nextRun, setNextRun] = useState<any>(null);
    const [latestPost, setLatestPost] = useState<any>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch joined events and find next one
            if (user) {
                const joinedEvents = await getUserJoinedEvents(user.id);
                const now = new Date();
                const futureEvents = joinedEvents
                    .filter(e => new Date(e.event_datetime) > now)
                    .sort((a, b) => new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime());

                if (futureEvents.length > 0) {
                    const event = futureEvents[0];
                    const date = new Date(event.event_datetime);
                    // Format: "Qua, 19:30"
                    const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

                    setNextRun({
                        title: event.title,
                        date: dateStr,
                        location: event.location_name || 'Local a definir',
                        points: `${event.points_value} pts`,
                        weather: "☁️ 12°C" // Mock weather for now
                    });
                } else {
                    setNextRun(null);
                }
            }

            // Fetch latest feed post
            const posts = await getFeedPosts(1);
            if (posts.length > 0) {
                const post = posts[0];
                let action = 'fez um post';
                if (post.activity_type === 'run') action = `correu ${post.meta_data?.distance || 'um treino'}`;
                if (post.activity_type === 'check_in') action = 'fez check-in em um evento';

                setLatestPost({
                    user: post.users?.full_name || 'Usuário',
                    action: action,
                    initials: post.users?.full_name ? post.users.full_name.substring(0, 2).toUpperCase() : 'US'
                });
            } else {
                setLatestPost(null);
            }

        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const QuickAction = ({ icon: Icon, label, onPress, color }: any) => (
        <TouchableOpacity style={styles.quickAction} onPress={onPress}>
            <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
                <Icon size={24} color={color} fill={color} />
            </View>
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand.primary} />}
            >
                {/* Header / Greeting */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{t('common.greeting', 'Olá')},</Text>
                        <Text style={styles.userName}>{profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Runner'}!</Text>
                    </View>
                    {profile?.membershipTier && (
                        <TierBadge tier={profile.membershipTier as TierKey} size="small" />
                    )}
                </View>

                {/* Hero Card: Next Run */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Próximo Treino</Text>
                    {loading ? (
                        <Skeleton height={180} borderRadius={theme.radius.xl} />
                    ) : nextRun ? (
                        <TouchableOpacity style={styles.heroCard} onPress={() => navigation.navigate('Events')}>
                            <View style={styles.heroContent}>
                                <View style={styles.heroBadge}>
                                    <Text style={styles.heroBadgeText}>PRÓXIMO</Text>
                                </View>
                                <Text style={styles.totalDistance}>{nextRun.points}</Text>
                                <Text style={styles.heroTitle}>{nextRun.title}</Text>
                                <View style={styles.heroDetails}>
                                    <Text style={styles.heroDetailText}>📅 {nextRun.date}</Text>
                                    <Text style={styles.heroDetailText}>📍 {nextRun.location}</Text>
                                </View>
                                <View style={styles.weatherBadge}>
                                    <Text style={styles.weatherText}>{nextRun.weather}</Text>
                                </View>
                            </View>

                            <View style={styles.decorativeCircle1} />
                            <View style={styles.decorativeCircle2} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.heroCard, { backgroundColor: theme.colors.background.card, borderWidth: 1, borderColor: theme.colors.border.default }]} onPress={() => navigation.navigate('Events')}>
                            <View style={[styles.heroContent, { alignItems: 'center', paddingVertical: 20 }]}>
                                <Text style={[styles.heroTitle, { color: theme.colors.text.tertiary, textAlign: 'center', marginBottom: 10 }]}>Nenhum treino agendado</Text>
                                <Text style={{ color: theme.colors.brand.primary, fontWeight: 'bold' }}>Ver Eventos Disponíveis</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick Actions Grid */}
                <View style={styles.quickActionsGrid}>
                    <QuickAction
                        icon={CardIcon}
                        label="Cupons"
                        color={theme.colors.success} // Green for Benefits
                        onPress={() => navigation.navigate('Loyalty')}
                    />
                    <QuickAction
                        icon={CalendarIcon}
                        label="Eventos"
                        color={theme.colors.brand.primary}
                        onPress={() => navigation.navigate('Events')}
                    />
                    <QuickAction
                        icon={TrophyIcon}
                        label="Ranking"
                        color={theme.colors.warning}
                        onPress={() => navigation.navigate('Leaderboard')}
                    />
                </View>

                {/* Recent Activity / Feed Preview */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Feed Recente</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Feed')}>
                            <Text style={styles.viewAllText}>Ver tudo</Text>
                        </TouchableOpacity>
                    </View>
                    {loading ? (
                        <View style={{ gap: 10 }}>
                            <Skeleton height={80} />
                            <Skeleton height={80} />
                        </View>
                    ) : latestPost ? (
                        <TouchableOpacity style={styles.feedPreviewCard} onPress={() => navigation.navigate('Feed')}>
                            <View style={styles.feedHeader}>
                                <View style={styles.avatarMini}><Text style={styles.avatarText}>{latestPost.initials}</Text></View>
                                <View>
                                    <Text style={styles.feedUser}>{latestPost.user}</Text>
                                    <Text style={styles.feedAction}>{latestPost.action}</Text>
                                </View>
                            </View>
                            <ChevronRightIcon color={theme.colors.text.tertiary} size={20} />
                        </TouchableOpacity>
                    ) : (
                        <Text style={{ color: theme.colors.text.tertiary, fontStyle: 'italic' }}>Nenhuma atividade recente.</Text>
                    )}
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    scrollContent: {
        padding: theme.spacing[5],
        paddingTop: theme.spacing[12], // Clear status bar
        paddingBottom: theme.spacing[20],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[6],
    },
    greeting: {
        fontSize: theme.typography.size.h3,
        color: theme.colors.text.secondary,
        fontFamily: 'Inter-Regular',
    },
    userName: {
        fontSize: theme.typography.size.h1,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.bold as any,
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
        fontSize: theme.typography.size.h4,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.semibold as any,
        marginBottom: theme.spacing[3],
    },
    viewAllText: {
        color: theme.colors.brand.primary,
        fontSize: theme.typography.size.bodySM,
    },
    // Hero Card
    heroCard: {
        backgroundColor: theme.colors.brand.primary, // Orange brand color
        borderRadius: theme.radius.lg, // Updated to 16px as per spec
        padding: theme.spacing[5],
        height: 180,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    heroContent: {
        zIndex: 2,
    },
    heroBadge: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing[2],
        paddingVertical: 4,
        borderRadius: theme.radius.md, // Soft corners 8-12px as per spec for badges/buttons
        marginBottom: theme.spacing[1],
    },
    heroBadgeText: {
        color: theme.colors.text.primary,
        fontSize: theme.typography.size.micro,
        fontWeight: theme.typography.weight.bold as any,
    },
    heroTitle: {
        fontSize: theme.typography.size.h3,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.bold as any,
        marginBottom: theme.spacing[3],
    },
    totalDistance: {
        fontSize: theme.typography.size.displayMD,
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.black as any,
        lineHeight: 50,
    },
    heroDetails: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginTop: theme.spacing[2],
    },
    heroDetailText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.medium as any,
    },
    weatherBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: theme.spacing[3],
        paddingVertical: 6,
        borderRadius: theme.radius.full,
    },
    weatherText: {
        color: theme.colors.text.primary,
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.semibold as any,
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
    // Quick Actions
    quickActionsGrid: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    quickAction: {
        flex: 1,
        backgroundColor: theme.colors.background.card,
        padding: theme.spacing[4],
        borderRadius: theme.radius.lg, // 16px
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0, // "Uso mínimo de linhas... separação é feita... pela diferença de cor"
        //borderColor: theme.colors.border.subtle, // Removed border
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing[2],
    },
    quickActionLabel: {
        color: theme.colors.text.primary,
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.medium as any,
    },
    // Feed Preview
    feedPreviewCard: {
        backgroundColor: theme.colors.background.card,
        padding: theme.spacing[4],
        borderRadius: theme.radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
    },
    avatarMini: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.brand.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    feedUser: {
        color: theme.colors.text.primary,
        fontWeight: theme.typography.weight.bold as any,
    },
    feedAction: {
        color: theme.colors.text.secondary,
        fontSize: theme.typography.size.caption,
    },
});
