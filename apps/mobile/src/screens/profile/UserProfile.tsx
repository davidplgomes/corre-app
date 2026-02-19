import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { theme, tierColors } from '../../constants/theme';
import {
    ChevronRightIcon,
    InstagramIcon,
    InfoIcon,
    LockIcon,
    CloseIcon,
    TrophyIcon,
    RunIcon,
    MedalIcon,
    SunriseIcon,
    PartyIcon,
    MapIcon,
    PencilIcon
} from '../../components/common/TabIcons';
import { LoadingSpinner } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { getPublicProfile, getProfile, PublicProfile } from '../../services/supabase/users';
import { sendFriendRequest, removeFriend, cancelFriendRequest, getFriendshipStatus } from '../../services/supabase/friendships';
import { getUserAchievements } from '../../services/supabase/achievements';
import { getUserRuns } from '../../services/supabase/feed';
import { FeedPostItem } from '../../components/feed/FeedPostItem';
import { ArrowLogo } from '../../components/common/ArrowLogo';

type UserProfileProps = {
    route: { params: { userId: string } };
    navigation: any;
};

export const UserProfile: React.FC<UserProfileProps> = ({ route, navigation }) => {
    const { t } = useTranslation();
    const { profile: currentUser, user } = useAuth();
    const { userId } = route.params;
    const isOwnProfile = user?.id === userId;

    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted'>('none');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [recentRuns, setRecentRuns] = useState<any[]>([]);
    const [achievements, setAchievements] = useState<any[]>([]);

    useEffect(() => {
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        try {
            setLoading(true);

            if (isOwnProfile) {
                // Own profile: fetch full data, no privacy restrictions
                const fullProfile = await getProfile(userId);
                if (fullProfile) {
                    setProfile({
                        id: fullProfile.id,
                        full_name: fullProfile.full_name,
                        membership_tier: fullProfile.membership_tier,
                        privacy_visibility: (fullProfile as any).privacy_visibility || 'anyone',
                        avatar_url: (fullProfile as any).avatar_url || undefined,
                        current_month_points: fullProfile.current_month_points,
                        total_lifetime_points: fullProfile.total_lifetime_points,
                        neighborhood: fullProfile.neighborhood || undefined,
                        city: (fullProfile as any).city || undefined,
                        bio: (fullProfile as any).bio || undefined,
                        instagram_handle: (fullProfile as any).instagram_handle || undefined,
                        created_at: fullProfile.created_at || undefined,
                    });
                }
                // No friendship status needed for own profile
                const [runs, badges] = await Promise.all([
                    getUserRuns(userId),
                    getUserAchievements(userId)
                ]);
                setRecentRuns(runs.slice(0, 3));
                setAchievements(badges);
            } else {
                // Other user: respect privacy settings
                const [profileData, status] = await Promise.all([
                    getPublicProfile(userId, currentUser?.id),
                    currentUser?.id ? getFriendshipStatus(userId) : Promise.resolve('none' as const),
                ]);
                setProfile(profileData);
                setFriendshipStatus(status);

                // Fetch extra data if allowed
                if (profileData && profileData.current_month_points !== undefined) {
                    const [runs, badges] = await Promise.all([
                        getUserRuns(userId),
                        getUserAchievements(userId)
                    ]);
                    setRecentRuns(runs.slice(0, 3));
                    setAchievements(badges);
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFriend = async () => {
        if (!currentUser?.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setActionLoading(true);
        try {
            const result = await sendFriendRequest(userId);
            if (result.success) {
                if (result.autoAccepted) {
                    setFriendshipStatus('accepted');
                    Alert.alert(t('common.success'), t('friends.nowFriends'));
                } else {
                    setFriendshipStatus('pending');
                    Alert.alert(t('common.success'), t('friends.requestSent'));
                }
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveFriend = async () => {
        if (!currentUser?.id) return;
        Alert.alert(
            t('friends.removeFriend'),
            t('friends.confirmRemove'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await removeFriend(userId);
                            setFriendshipStatus('none');
                            loadProfile(); // Reload to update visibility
                        } catch (error) {
                            Alert.alert(t('common.error'), t('errors.unknownError'));
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const openInstagram = () => {
        if (profile?.instagram_handle) {
            import('react-native').then(({ Linking }) => {
                Linking.openURL(`https://instagram.com/${profile.instagram_handle}`);
            });
        }
    };

    // Render helpers
    const renderAchievements = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {achievements.map((badge) => {
                let Icon = TrophyIcon;
                switch (badge.icon) {
                    case 'run': case '👟': Icon = RunIcon; break;
                    case 'sunrise': case '🌅': Icon = SunriseIcon; break;
                    case 'medal': case 'medalha': case '🥇': case '🏃': Icon = MedalIcon; break;
                    case 'party': case '🎉': Icon = PartyIcon; break;
                    case 'compass': case '📍': Icon = MapIcon; break;
                    default: Icon = TrophyIcon;
                }

                return (
                    <View key={badge.id} style={styles.achievementCard}>
                        <Icon size={32} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.achievementTitle} numberOfLines={2}>{badge.title}</Text>
                    </View>
                );
            })}
        </ScrollView>
    );

    if (loading) return <LoadingSpinner />;
    if (!profile) return <View style={styles.errorContainer}><Text style={styles.errorText}>Error</Text></View>;

    const tier = (profile.membership_tier || 'basico') as keyof typeof tierColors;
    const tierConfig = tierColors[tier];
    const userInitial = profile.full_name?.charAt(0).toUpperCase() || '?';
    const hasFullAccess = isOwnProfile || profile.current_month_points !== undefined;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/CorreHS.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t('profile.title').toUpperCase()}</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                            <CloseIcon size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Hero Text / Name */}
                    <View style={styles.heroContainer}>
                        <View style={[styles.heroAvatar, { borderColor: tierConfig.primary }]}>
                            {profile.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.heroAvatarImage} />
                            ) : (
                                <Text style={[styles.heroAvatarText, { color: tierConfig.primary }]}>
                                    {userInitial}
                                </Text>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroText}>{profile.full_name?.toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Stats Bar (Glass) */}
                    <View style={styles.statsBar}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.statText, { color: tierConfig.primary }]}>{tierConfig.label.toUpperCase()}</Text>
                        </View>
                        <ArrowLogo size={80} color="#FFF" backgroundColor="transparent" style={{ marginHorizontal: 20 }} />
                        {hasFullAccess && (
                            <Text style={styles.pointsText}>{profile.current_month_points}PTS</Text>
                        )}
                    </View>

                    {/* Main Content Glass Card */}
                    <BlurView intensity={30} tint="dark" style={styles.glassCard}>
                        <View style={styles.glassContent}>

                            {/* Bio & Details Section */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <InfoIcon size={14} color="rgba(255,255,255,0.5)" />
                                    <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>{t('profile.about').toUpperCase()}</Text>
                                </View>
                                <Text style={styles.bioText}>
                                    {profile.bio || t('profile.noBio')}
                                </Text>

                                <View style={styles.detailRow}>
                                    {/* Location */}
                                    <View style={styles.detailItem}>
                                        <Text style={styles.detailIcon}>📍</Text>
                                        <Text style={styles.detailText}>
                                            {profile.city || profile.neighborhood || 'N/A'}
                                        </Text>
                                    </View>

                                    {/* Instagram */}
                                    {profile.instagram_handle && (
                                        <TouchableOpacity style={styles.detailItem} onPress={openInstagram}>
                                            <InstagramIcon size={16} color="#FFF" />
                                            <Text style={[styles.detailText, { textDecorationLine: 'underline', marginLeft: 6 }]}>
                                                @{profile.instagram_handle}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {/* Achievements Section */}
                            {hasFullAccess && achievements.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <TrophyIcon size={14} color="rgba(255,255,255,0.5)" />
                                        <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>{t('profile.achievements').toUpperCase()}</Text>
                                        <Text style={styles.countBadge}>{achievements.length}</Text>
                                    </View>
                                    {renderAchievements()}
                                </View>
                            )}

                            {/* Recent Activity Section */}
                            {hasFullAccess && recentRuns.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.label}>{t('profile.recentActivity').toUpperCase()}</Text>
                                    {recentRuns.map((run) => (
                                        <View key={run.id} style={{ marginBottom: 16 }}>
                                            <FeedPostItem item={run} />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Privacy Lock */}
                            {!hasFullAccess && (
                                <View style={styles.privateContainer}>
                                    <LockIcon size={32} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.privateText}>{t('userProfile.privateProfile')}</Text>
                                </View>
                            )}

                            {/* Action Buttons - hidden for own profile */}
                            {!isOwnProfile && (
                                <View style={styles.actionSection}>
                                    {friendshipStatus === 'none' && (
                                        <TouchableOpacity style={styles.actionButton} onPress={handleAddFriend} disabled={actionLoading}>
                                            <Text style={styles.actionButtonText}>{t('friends.addFriend').toUpperCase()}</Text>
                                            <View style={styles.arrowContainer}><Text style={styles.arrowText}>+</Text></View>
                                        </TouchableOpacity>
                                    )}
                                    {friendshipStatus === 'pending' && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={[styles.actionButton, { opacity: 0.7, flex: 1 }]}>
                                                <Text style={styles.actionButtonText}>{t('friends.pending').toUpperCase()}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={{
                                                    width: 40, height: 40, borderRadius: 20,
                                                    backgroundColor: 'rgba(255,80,80,0.12)',
                                                    borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)',
                                                    alignItems: 'center', justifyContent: 'center',
                                                }}
                                                onPress={async () => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    const success = await cancelFriendRequest(userId);
                                                    if (success) setFriendshipStatus('none');
                                                }}
                                            >
                                                <Text style={{ color: '#FF6464', fontSize: 16, fontWeight: '900' }}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    {friendshipStatus === 'accepted' && (
                                        <TouchableOpacity style={[styles.actionButton, { backgroundColor: 'rgba(255,100,100,0.1)', borderWidth: 1, borderColor: '#FF4444' }]} onPress={handleRemoveFriend} disabled={actionLoading}>
                                            <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>{t('friends.removeFriend').toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                        </View>
                    </BlurView>
                </ScrollView>
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
    errorContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FFF',
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
        marginTop: 40,
    },
    headerTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 2,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        color: '#FFF',
        fontSize: 20,
        marginTop: -3,
    },
    heroContainer: {
        marginVertical: 40,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    heroAvatarText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    heroAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    heroText: {
        fontSize: 32, // Slightly smaller to fit with avatar
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
        lineHeight: 36,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 20,
        alignItems: 'center',
    },
    statText: {
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    statIcon: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
    },
    pointsText: {
        color: theme.colors.brand.primary,
        fontWeight: '900',
        fontSize: 16,
    },
    glassCard: {
        marginHorizontal: 10,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderBottomWidth: 0,
        minHeight: 500,
    },
    glassContent: {
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        letterSpacing: 1,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    bioText: {
        color: '#FFF',
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    detailIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    detailText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
    countBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    achievementsScroll: {
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    achievementCard: {
        width: 100,
        height: 120,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    achievementIcon: {
        fontSize: 40,
        marginBottom: 8,
    },
    achievementTitle: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        fontWeight: '700',
        paddingHorizontal: 4,
    },
    privateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        marginBottom: 20,
    },
    privateIcon: {
        fontSize: 32,
        marginBottom: 10,
    },
    privateText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    actionSection: {
        marginTop: 20,
    },
    actionButton: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    actionButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
        marginLeft: 24,
    },
    arrowContainer: {
        width: 40,
        height: 40,
        backgroundColor: '#000',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        color: '#FFF',
        fontSize: 20,
        marginTop: -2,
    },
    // Keep scrollView and scrollContent as they are used
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
});
