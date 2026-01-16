import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/supabase/auth';
import { theme, tierColors } from '../../constants/theme';
import { ChevronRightIcon, RunIcon, MedalIcon, SettingsIcon, MapIcon } from '../../components/common/TabIcons';

type ProfileProps = {
    navigation: any;
};

export const Profile: React.FC<ProfileProps> = ({ navigation }) => {
    const { profile, user } = useAuth();

    const tier = (profile?.membershipTier || 'basico') as keyof typeof tierColors;
    const tierConfig = tierColors[tier];

    const handleLogout = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Stats matching the design
    const stats = {
        totalDistance: '350km',
        totalTime: '32h 15m',
        totalRuns: 45,
        averagePace: "5'30\"/km",
        currentPoints: profile?.currentMonthPoints || 1250,
        lifetimePoints: profile?.totalLifetimePoints || 4850,
        nextTier: 'LENDÁRIO',
        nextTierProgress: 75,
        thisWeekRuns: 3,
        thisWeekDistance: '15.2km',
    };

    const userName = profile?.fullName || user?.email?.split('@')[0] || 'Corredor';
    const userInitial = userName.charAt(0).toUpperCase();

    const menuItems = [
        {
            id: 'history',
            label: 'Histórico de Corridas',
            icon: <RunIcon size={20} color={theme.colors.text.secondary} />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('RunHistory');
            },
            badge: stats.thisWeekRuns,
        },
        {
            id: 'runMap',
            label: 'Mapa de Corridas',
            icon: <MapIcon size={20} color={theme.colors.text.secondary} />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('RunMap');
            },
        },
        {
            id: 'achievements',
            label: 'Conquistas',
            icon: <MedalIcon size={20} color={theme.colors.text.secondary} />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Achievements');
            },
            badge: 8,
        },
        {
            id: 'settings',
            label: 'Configurações',
            icon: <SettingsIcon size={20} color={theme.colors.text.secondary} />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('Settings');
            },
        },
        {
            id: 'logout',
            label: 'Sair',
            icon: null,
            isDestructive: true,
            onPress: handleLogout,
        },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header with Gradient */}
                    <View style={styles.headerSection}>
                        <LinearGradient
                            colors={['rgba(255, 87, 34, 0.15)', 'rgba(255, 87, 34, 0.05)', 'transparent']}
                            style={styles.headerGradient}
                        />
                        <Text style={styles.headerLabel}>PROFILE</Text>
                    </View>

                    {/* Avatar Section with Glow */}
                    <View style={styles.profileSection}>
                        {/* Avatar Glow Effect */}
                        <View style={styles.avatarGlow}>
                            <View style={[styles.avatarGlowInner, { backgroundColor: tierConfig.primary + '30' }]} />
                        </View>

                        {/* Avatar */}
                        <View style={[styles.avatarContainer, { borderColor: tierConfig.primary }]}>
                            <LinearGradient
                                colors={[tierConfig.primary, tierConfig.primary + 'CC']}
                                style={styles.avatarGradient}
                            >
                                <Text style={styles.avatarText}>{userInitial}</Text>
                            </LinearGradient>
                        </View>

                        <Text style={styles.userName}>{userName}</Text>

                        <View style={[styles.tierBadge, { backgroundColor: tierConfig.primary }]}>
                            <Text style={styles.tierText}>{tierConfig.label}</Text>
                        </View>

                        {/* Member since */}
                        <Text style={styles.memberSince}>Membro desde Janeiro 2025</Text>
                    </View>

                    {/* Big Points Display with Glow */}
                    <View style={styles.pointsSection}>
                        <View style={styles.pointsGlow} />
                        <Text style={styles.pointsNumber}>{stats.currentPoints}</Text>
                        <Text style={styles.pointsLabel}>Pontos do Mês</Text>
                        <View style={styles.pointsDivider}>
                            <Text style={styles.lifetimePoints}>{stats.lifetimePoints} total</Text>
                        </View>
                    </View>

                    {/* This Week Summary Card */}
                    <View style={styles.weekCard}>
                        <LinearGradient
                            colors={['rgba(255, 87, 34, 0.1)', 'rgba(255, 87, 34, 0.02)']}
                            style={styles.weekCardGradient}
                        >
                            <Text style={styles.weekCardTitle}>Esta Semana</Text>
                            <View style={styles.weekStats}>
                                <View style={styles.weekStat}>
                                    <Text style={styles.weekStatValue}>{stats.thisWeekRuns}</Text>
                                    <Text style={styles.weekStatLabel}>Corridas</Text>
                                </View>
                                <View style={styles.weekStatDivider} />
                                <View style={styles.weekStat}>
                                    <Text style={styles.weekStatValue}>{stats.thisWeekDistance}</Text>
                                    <Text style={styles.weekStatLabel}>Distância</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Stats Grid - 2x2 */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 87, 34, 0.15)' }]}>
                                <Text style={styles.statIcon}>📍</Text>
                            </View>
                            <Text style={styles.statLabel}>Distância Total</Text>
                            <Text style={styles.statValue}>{stats.totalDistance}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(0, 200, 83, 0.15)' }]}>
                                <Text style={styles.statIcon}>⏱</Text>
                            </View>
                            <Text style={styles.statLabel}>Tempo Total</Text>
                            <Text style={styles.statValue}>{stats.totalTime}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                                <Text style={styles.statIcon}>🏃</Text>
                            </View>
                            <Text style={styles.statLabel}>Corridas</Text>
                            <Text style={styles.statValue}>{stats.totalRuns}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 193, 7, 0.15)' }]}>
                                <Text style={styles.statIcon}>⚡</Text>
                            </View>
                            <Text style={styles.statLabel}>Média Pace</Text>
                            <Text style={styles.statValue}>{stats.averagePace}</Text>
                        </View>
                    </View>

                    {/* Next Tier Progress */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Próximo Nível</Text>
                            <Text style={styles.progressTier}>{stats.nextTier}</Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <LinearGradient
                                colors={[theme.colors.brand.primary, theme.colors.brand.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressFill, { width: `${stats.nextTierProgress}%` }]}
                            />
                        </View>
                        <Text style={styles.progressPercent}>{stats.nextTierProgress}% concluído</Text>
                    </View>

                    {/* Menu Items */}
                    <View style={styles.menuSection}>
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
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
                                        {item.label}
                                    </Text>
                                </View>
                                <View style={styles.menuItemRight}>
                                    {item.badge && (
                                        <View style={styles.menuBadge}>
                                            <Text style={styles.menuBadgeText}>{item.badge}</Text>
                                        </View>
                                    )}
                                    <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Version */}
                    <Text style={styles.version}>Corre App v1.0.0</Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
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
        position: 'relative',
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[4],
        paddingBottom: theme.spacing[2],
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    headerLabel: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        textAlign: 'right',
    },

    // Profile Section
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[4],
        paddingBottom: theme.spacing[6],
    },
    avatarGlow: {
        position: 'absolute',
        top: theme.spacing[2],
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarGlowInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        opacity: 0.5,
    },
    avatarContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing[4],
        overflow: 'hidden',
    },
    avatarGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: theme.typography.size.displaySM,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.white,
    },
    userName: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[3],
    },
    tierBadge: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
        marginBottom: theme.spacing[2],
    },
    tierText: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.black,
        letterSpacing: theme.typography.letterSpacing.wide,
    },
    memberSince: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
    },

    // Points Section
    pointsSection: {
        alignItems: 'center',
        paddingBottom: theme.spacing[6],
        position: 'relative',
    },
    pointsGlow: {
        position: 'absolute',
        top: 0,
        width: 200,
        height: 80,
        backgroundColor: theme.colors.brand.primary,
        opacity: 0.1,
        borderRadius: 100,
    },
    pointsNumber: {
        fontSize: theme.typography.size.displayXL,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
        letterSpacing: theme.typography.letterSpacing.tighter,
        lineHeight: theme.typography.size.displayXL,
    },
    pointsLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
    },
    pointsDivider: {
        marginTop: theme.spacing[2],
    },
    lifetimePoints: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.disabled,
    },

    // Week Card
    weekCard: {
        marginHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[6],
        borderRadius: theme.radius.lg, // 16px
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.brand.primary + '20',
    },
    weekCardGradient: {
        padding: theme.spacing[5],
    },
    weekCardTitle: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.brand.primary,
        letterSpacing: theme.typography.letterSpacing.wide,
        marginBottom: theme.spacing[4],
    },
    weekStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weekStat: {
        flex: 1,
        alignItems: 'center',
    },
    weekStatValue: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    weekStatLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
    },
    weekStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border.default,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing[4],
        gap: theme.spacing[3],
        marginBottom: theme.spacing[6],
    },
    statCard: {
        width: '47%',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing[3],
    },
    statIcon: {
        fontSize: 16,
    },
    statLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing[1],
    },
    statValue: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },

    // Progress
    progressSection: {
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing[3],
    },
    progressLabel: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.secondary,
    },
    progressTier: {
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary,
    },
    progressTrack: {
        height: 8,
        backgroundColor: theme.colors.background.card,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing[2],
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressPercent: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        textAlign: 'right',
    },

    // Menu
    menuSection: {
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[6],
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemIcon: {
        marginRight: theme.spacing[3],
    },
    menuItemLabel: {
        fontSize: theme.typography.size.bodyLG,
        color: theme.colors.text.primary,
    },
    menuItemDestructive: {
        color: theme.colors.error,
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuBadge: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: theme.spacing[2],
        paddingVertical: 2,
        borderRadius: theme.radius.full,
        marginRight: theme.spacing[2],
    },
    menuBadgeText: {
        fontSize: theme.typography.size.micro,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.white,
    },

    // Version
    version: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.disabled,
        textAlign: 'center',
        paddingVertical: theme.spacing[4],
    },
});
