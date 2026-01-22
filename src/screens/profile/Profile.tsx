import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/supabase/auth';
import { theme, tierColors } from '../../constants/theme';
import { ChevronRightIcon, ClockIcon, MedalIcon, SettingsIcon, MapIcon, PersonIcon, PencilIcon } from '../../components/common/TabIcons';

type ProfileProps = {
    navigation: any;
};

export const Profile: React.FC<ProfileProps> = ({ navigation }) => {
    const { t } = useTranslation();
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
            label: t('profile.runHistory'),
            icon: <ClockIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('RunHistory');
            },
            badge: stats.thisWeekRuns,
        },
        {
            id: 'runMap',
            label: t('profile.runMap'),
            icon: <MapIcon size={20} color="#FFF" />,
            onPress: () => {
                Haptics.selectionAsync();
                navigation.navigate('RunMap');
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
            badge: 8,
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
                    >
                        {/* Header */}
                        <View style={styles.headerSection}>
                            <Text style={styles.headerLabel}>{t('profile.myProfile').toUpperCase()}</Text>
                            <Text style={styles.headerTitle}>{t('navigation.profile').toUpperCase()}</Text>
                        </View>

                        {/* Avatar Section */}
                        <BlurView intensity={20} tint="dark" style={styles.profileGlassCard}>
                            <View style={styles.cardHeaderAction}>
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
                                    <Text style={styles.avatarText}>{userInitial}</Text>
                                </View>
                                <Text style={styles.userName}>{userName.toUpperCase()}</Text>
                                <View style={[styles.tierBadge, { backgroundColor: tierConfig.primary }]}>
                                    <Text style={styles.tierText}>{tierConfig.label}</Text>
                                </View>
                                <Text style={styles.memberSince}>{t('profile.memberSince')} {t('profile.january')} 2025</Text>
                            </View>
                        </BlurView>

                        {/* Points Highlight */}
                        <View style={styles.pointsSection}>
                            <Text style={styles.pointsNumber}>{stats.currentPoints}</Text>
                            <Text style={styles.pointsLabel}>{t('profile.currentPoints').toUpperCase()}</Text>
                            <Text style={styles.lifetimePoints}>{stats.lifetimePoints} total</Text>
                        </View>

                        {/* Stats Grid */}
                        <View style={styles.statsGrid}>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>📍</Text>
                                        <Text style={styles.statLabel}>{t('profile.distance').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{stats.totalDistance}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>⏱</Text>
                                        <Text style={styles.statLabel}>{t('profile.time').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{stats.totalTime}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>🏃</Text>
                                        <Text style={styles.statLabel}>{t('events.runs').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{stats.totalRuns}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={30} tint="dark" style={styles.statCard}>
                                <View style={styles.statContent}>
                                    <View style={styles.statHeader}>
                                        <Text style={styles.statIcon}>⚡</Text>
                                        <Text style={styles.statLabel}>{t('profile.averagePace').toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.statValue}>{stats.averagePace}</Text>
                                </View>
                            </BlurView>
                        </View>

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
                        <Text style={styles.version}>CORRE APP v1.0.2</Text>
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
        right: 16,
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
