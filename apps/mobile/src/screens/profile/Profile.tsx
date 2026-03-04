import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    Image,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { theme, tierColors } from '../../constants/theme';
import { isPaidMembershipTier } from '../../constants/tiers';
import { ChevronRightIcon, ClockIcon, MedalIcon, SettingsIcon, BellIcon, PersonIcon, PencilIcon, EyeIcon, CardIcon, ShoppingBagIcon } from '../../components/common/TabIcons';
import { getGoalProgress, getUserGoals, goalTypeDefinitions, GoalProgress } from '../../services/supabase/goals';
import { getAvailablePoints } from '../../services/supabase/wallet';

type ProfileProps = {
    navigation: any;
};

type MenuItem = {
    id: string;
    label: string;
    icon?: React.ReactNode | null;
    onPress: () => void;
    badge?: string | null;
    isDestructive?: boolean;
    highlight?: boolean;
};

export const Profile: React.FC<ProfileProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { profile, user, signOut, refreshProfile } = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [goalSummary, setGoalSummary] = useState<GoalProgress[]>([]);
    const [availablePoints, setAvailablePoints] = useState<number | null>(null);
    const isFirstMount = useRef(true);

    const loadGoalSummary = useCallback(async () => {
        if (!user?.id) return;
        try {
            const goals = await getUserGoals(user.id);
            const progress = await getGoalProgress(user.id, goals);
            setGoalSummary(progress.slice(0, 2));
        } catch (error) {
            console.error('Error loading goal summary:', error);
        }
    }, [user?.id]);

    const loadAvailablePoints = useCallback(async () => {
        if (!user?.id) {
            setAvailablePoints(null);
            return;
        }

        try {
            const points = await getAvailablePoints(user.id);
            setAvailablePoints(points);
        } catch (error) {
            console.error('Error loading available points:', error);
            setAvailablePoints(null);
        }
    }, [user?.id]);

    // Auto-refresh profile when screen comes into focus (e.g. after EditProfile)
    useFocusEffect(
        useCallback(() => {
            if (isFirstMount.current) {
                isFirstMount.current = false;
                void loadGoalSummary();
                void loadAvailablePoints();
                return;
            }
            void refreshProfile();
            void loadGoalSummary();
            void loadAvailablePoints();
        }, [refreshProfile, loadGoalSummary, loadAvailablePoints])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Promise.all([
                refreshProfile(),
                loadGoalSummary(),
                loadAvailablePoints(),
            ]);
        } catch (error) {
            console.error('Error refreshing profile:', error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshProfile, loadGoalSummary, loadAvailablePoints]);

    const tier = (profile?.membershipTier || 'free') as keyof typeof tierColors;
    const tierConfig = tierColors[tier];

    const handleLogout = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Stats from real user profile data
    const stats = {
        currentPoints: availablePoints ?? profile?.current_points ?? profile?.currentMonthPoints ?? 0,
        currentXP: profile?.current_xp ?? 0,
        lifetimePoints: profile?.totalLifetimePoints || 0,
    };

    const userName = profile?.fullName || user?.email?.split('@')[0] || 'Corredor';
    const userInitial = userName.charAt(0).toUpperCase();

    const menuItems: MenuItem[] = [
        {
            id: 'myItems',
            label: t('profile.myItems', 'My Items'),
            icon: <ShoppingBagIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                if (!isPaidMembershipTier(profile?.membershipTier)) {
                    Alert.alert(
                        t('marketplace.communitySellRequiresPaidTitle', 'Paid Plan Required'),
                        t(
                            'marketplace.communitySellRequiresPaidDescription',
                            'Selling in the community marketplace is available only for Pro and Club members.'
                        ),
                        [
                            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                            {
                                text: t('marketplace.upgradeToProClub', 'Upgrade to Pro/Club'),
                                onPress: () => navigation.navigate('SubscriptionScreen'),
                            },
                        ]
                    );
                    return;
                }
                navigation.navigate('MyListings');
            },
            badge: null,
        },
        {
            id: 'notifications',
            label: t('profile.notifications'),
            icon: <BellIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Notifications');
            },
        },
        {
            id: 'history',
            label: t('profile.runHistory'),
            icon: <ClockIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('RunHistory');
            },
        },
        {
            id: 'achievements',
            label: t('profile.achievements'),
            icon: <MedalIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Achievements');
            },
            badge: null,
        },
        {
            id: 'goals',
            label: t('goals.title', 'Goals'),
            icon: <MedalIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Goals');
            },
            badge: null,
        },
        {
            id: 'friends',
            label: t('profile.friends'),
            icon: <PersonIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Friends');
            },
        },
        {
            id: 'guestPass',
            label: t('profile.guestPass'),
            icon: <MedalIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('GuestPass');
            },
            highlight: tier === 'club', // Only highlight for Club members
        },
        {
            id: 'subscription',
            label: t('settings.subscription'),
            icon: <CardIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('SubscriptionScreen', { from: 'Profile' });
            },
            badge: null,
            highlight: true,
        },
        {
            id: 'settings',
            label: t('profile.settings'),
            icon: <SettingsIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Settings');
            },
        },
        {
            id: 'logout',
            label: t('profile.logout'),
            icon: null,
            isDestructive: true,
            onPress: handleLogout,
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/CorreHS.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={theme.colors.brand.primary}
                                colors={[theme.colors.brand.primary]}
                            />
                        }
                    >
                        {/* Header */}
                        <View style={styles.headerSection}>
                            <Text style={styles.headerLabel}>{t('profile.myProfile').toUpperCase()}</Text>
                            <Text style={styles.headerTitle}>{t('navigation.profile').toUpperCase()}</Text>
                        </View>

                        {/* Avatar Section */}
                        <BlurView intensity={20} tint="dark" style={styles.profileGlassCard}>
                            <View style={styles.cardHeaderAction}>
                                {/* View Profile (Left) */}
                                <TouchableOpacity
                                    style={[styles.editButton, { marginRight: 'auto' }]} // Style tweak if needed, or separate absolute pos
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        if (user?.id) {
                                            navigation.navigate('UserProfile', { userId: user.id });
                                        }
                                    }}
                                >
                                    <EyeIcon size={16} color="rgba(255,255,255,0.8)" />
                                </TouchableOpacity>

                                {/* Edit Profile (Right) - Keeping existing, but need to handle positioning */}
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        navigation.navigate('EditProfile');
                                    }}
                                >
                                    <PencilIcon size={16} color="rgba(255,255,255,0.8)" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.profileContent}>
                                <View style={[styles.avatarContainer, { borderColor: tierConfig.primary }]}>
                                    {profile?.avatarUrl && !avatarError ? (
                                        <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} onError={() => setAvatarError(true)} />
                                    ) : (
                                        <Text style={styles.avatarText}>{userInitial}</Text>
                                    )}
                                </View>
                                <Text style={styles.userName}>{userName.toUpperCase()}</Text>
                                <View style={[styles.tierBadge, { backgroundColor: tierConfig.primary }]}>
                                    <Text style={styles.tierText}>{tierConfig.label}</Text>
                                </View>
                                <Text style={styles.memberSince}>{t('profile.memberSince')} {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '2025'}</Text>
                            </View>
                        </BlurView>

                        {/* Points Highlight */}
                        <View style={styles.pointsSection}>
                            <Text style={styles.pointsNumber}>{stats.currentPoints}</Text>
                            <Text style={styles.pointsLabel}>{t('profile.availablePoints', 'AVAILABLE POINTS').toUpperCase()}</Text>
                            <Text style={styles.lifetimePoints}>{stats.currentXP} XP</Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>🏅</Text>
                                        <Text style={styles.statLabel}>{t('profile.tier', 'TIER').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{tierConfig.label}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>📍</Text>
                                        <Text style={styles.statLabel}>{t('profile.neighborhood', 'BAIRRO').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue} numberOfLines={1}>{profile?.neighborhood || '—'}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>⚡</Text>
                                        <Text style={styles.statLabel}>{t('profile.currentXP', 'XP').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{stats.currentXP}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>🏆</Text>
                                        <Text style={styles.statLabel}>{t('profile.lifetimePoints', 'TOTAL').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{stats.lifetimePoints}</Text>
                                </View>
                            </BlurView>
                        </View>

                        {goalSummary.length > 0 && (
                            <View style={styles.goalsPreviewSection}>
                                <View style={styles.goalsPreviewHeader}>
                                    <Text style={styles.goalsPreviewTitle}>{t('goals.title', 'GOALS').toUpperCase()}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            navigation.navigate('Goals');
                                        }}
                                    >
                                        <Text style={styles.goalsPreviewManage}>{t('common.manage', 'MANAGE')}</Text>
                                    </TouchableOpacity>
                                </View>

                                {goalSummary.map((goal) => {
                                    const def = goalTypeDefinitions[goal.goal_type];
                                    const target = Number(goal.target_value);
                                    const current = goal.goal_type.includes('distance')
                                        ? goal.current_value.toFixed(1)
                                        : Math.round(goal.current_value).toString();
                                    const total = goal.goal_type.includes('distance')
                                        ? target.toFixed(1)
                                        : Math.round(target).toString();
                                    return (
                                        <BlurView key={goal.id} intensity={15} tint="dark" style={styles.goalPreviewCard}>
                                            <View style={styles.goalPreviewRow}>
                                                <Text style={styles.goalPreviewLabel}>
                                                    {def.emoji} {goal.title}
                                                </Text>
                                                <Text style={styles.goalPreviewValue}>
                                                    {current} / {total} {goal.unit}
                                                </Text>
                                            </View>
                                            <View style={styles.goalPreviewTrack}>
                                                <View
                                                    style={[
                                                        styles.goalPreviewFill,
                                                        { width: `${goal.progress_percent}%` },
                                                    ]}
                                                />
                                            </View>
                                        </BlurView>
                                    );
                                })}
                            </View>
                        )}

                        {/* Menu Items */}
                        <View style={styles.menuSection}>
                            {menuItems.map((item) => (
                                <BlurView key={item.id} intensity={10} tint="dark" style={styles.menuItemGlass}>
                                    <TouchableOpacity
                                        style={styles.menuItem}
                                        onPress={item.onPress}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.menuItemLeft}>
                                            {item.icon && (
                                                <View style={styles.menuItemIcon}>
                                                    {item.icon}
                                                </View>
                                            )}
                                            <Text style={[
                                                styles.menuItemLabel,
                                                item.isDestructive && styles.menuItemDestructive
                                            ]}>
                                                {item.label.toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.menuItemRight}>
                                            {item.badge && (
                                                <View style={styles.menuBadge}>
                                                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                                                </View>
                                            )}
                                            <ChevronRightIcon size={16} color="rgba(255,255,255,0.3)" />
                                        </View>
                                    </TouchableOpacity>
                                </BlurView>
                            ))}
                        </View>

                        {/* Version */}
                        <Text style={styles.version}>CORRE APP v1.0.5</Text>
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
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    safeArea: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },

    // Header
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
        alignItems: 'flex-start', // Fixed: Aligned to left
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },

    // Profile Section
    profileGlassCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 30,
        position: 'relative',
    },
    cardHeaderAction: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between', // Pushes buttons to edges
        zIndex: 10,
    },
    editButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileContent: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        backgroundColor: '#000',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '900',
        color: '#FFF',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    userName: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: 1,
    },
    tierBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 12,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    memberSince: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // Points Section
    pointsSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    pointsNumber: {
        fontSize: 56,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
        letterSpacing: -2,
        lineHeight: 56,
        textShadowColor: 'rgba(255, 87, 34, 0.3)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 20,
    },
    pointsLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
        marginBottom: 4,
    },
    lifetimePoints: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 30,
    },
    goalsPreviewSection: {
        paddingHorizontal: 20,
        marginBottom: 28,
        gap: 8,
    },
    goalsPreviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    goalsPreviewTitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.6,
    },
    goalsPreviewManage: {
        color: theme.colors.brand.primary,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    goalPreviewCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    goalPreviewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    goalPreviewLabel: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    goalPreviewValue: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 12,
        fontWeight: '700',
    },
    goalPreviewTrack: {
        height: 5,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    goalPreviewFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: theme.colors.brand.primary,
    },
    statCard: {
        width: '48%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 8,
    },
    statContent: {
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statIcon: {
        fontSize: 12,
        marginRight: 6,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },

    // Menu
    menuSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 8,
    },
    menuItemGlass: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemIcon: {
        marginRight: 12,
        width: 24,
        alignItems: 'center',
    },
    menuItemLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    menuItemDestructive: {
        color: '#FF4444',
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuBadge: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    menuBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
    },

    // Version
    version: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.2)',
        textAlign: 'center',
        paddingVertical: 20,
        letterSpacing: 2,
    },
});
