import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
    ImageBackground,
    Image,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CloseIcon } from '../../components/common/TabIcons';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, AnimatedListItem } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentMonthLeaderboard, getUserRank } from '../../services/supabase/leaderboard';
import { LeaderboardEntry } from '../../types';
import { theme, tierColors } from '../../constants/theme';

// Mock data for demo (matching the design)
const MOCK_LEADERBOARD = [
    { id: '1', user_id: '1', points: 1450, rank: 1, name: 'Carlos Mendes', tier: 'baixa_pace' },
    { id: '2', user_id: '2', points: 1250, rank: 2, name: 'Ana Silva', tier: 'basico' },
    { id: '3', user_id: '3', points: 1180, rank: 3, name: 'Bruno Costa', tier: 'baixa_pace' },
    { id: '4', user_id: '4', points: 820, rank: 4, name: 'Mara Anderson', tier: 'basico' },
    { id: '5', user_id: '5', points: 790, rank: 5, name: 'Vandui Drinnez', tier: 'free' },
    { id: '6', user_id: '6', points: 650, rank: 6, name: 'Lucas Ferreira', tier: 'basico' },
    { id: '7', user_id: '7', points: 580, rank: 7, name: 'Sofia Santos', tier: 'free' },
    { id: '8', user_id: '8', points: 450, rank: 8, name: 'Miguel Pereira', tier: 'parceiros' },
];

export const Leaderboard: React.FC = () => {
    const { t } = useTranslation();
    const { profile } = useAuth();
    const navigation = useNavigation<any>();

    const [leaderboard, setLeaderboard] = useState<any[]>(MOCK_LEADERBOARD);
    const [userRank, setUserRank] = useState<{ rank: number | null; points: number; total: number }>({
        rank: 1,
        points: 1250,
        total: 50,
    });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Current user mock data (matches the design)
    const currentUser = {
        name: profile?.fullName || 'Ana Silva',
        tier: 'basico',
        points: profile?.currentMonthPoints || 1250,
        rank: 1,
    };

    const loadData = useCallback(async () => {
        if (!profile?.id) return;

        try {
            setLoading(true);

            // Fetch real data from Supabase
            const [leaderboardData, userRankData] = await Promise.all([
                getCurrentMonthLeaderboard(50),
                getUserRank(profile.id),
            ]);

            // If we have real data, use it; otherwise fallback to mock
            if (leaderboardData && leaderboardData.length > 0) {
                // Transform data to match expected format
                const transformedData = leaderboardData.map((entry: any, index: number) => ({
                    id: entry.id,
                    user_id: entry.user_id,
                    points: entry.points,
                    rank: entry.rank || index + 1,
                    name: entry.users?.full_name || 'Corredor',
                    tier: entry.users?.membership_tier || 'free',
                }));
                setLeaderboard(transformedData);
            } else {
                // No real data, use mock
                setLeaderboard(MOCK_LEADERBOARD);
            }

            // Update user rank
            if (userRankData && userRankData.rank !== null) {
                setUserRank(userRankData);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            // Fallback to mock data on error
            setLeaderboard(MOCK_LEADERBOARD);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const getTierColor = (tier: string) => {
        // Force orange for everything if requested, or keep colorful. 
        // User said "keep orange... for plan... matches accent". 
        // We'll stick to theme colors but make sure they pop.
        const tierConfig = tierColors[tier as keyof typeof tierColors];
        return tierConfig?.primary || theme.colors.text.tertiary;
    };

    const getTierLabel = (tier: string) => {
        const tierConfig = tierColors[tier as keyof typeof tierColors];
        return tierConfig?.label || 'FREE';
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const rank = item.rank || index + 1;
        const name = item.name || item.users?.full_name || 'Corredor';
        const tier = item.tier || item.users?.membership_tier || 'free';
        const points = item.points;
        const isCurrentUser = item.user_id === profile?.id || name === currentUser.name;

        // Top 3 Styling
        const isTop3 = rank <= 3;
        const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#FFF';

        const handlePress = () => {
            if (item.user_id && item.user_id !== profile?.id) {
                navigation.navigate('UserProfile', { userId: item.user_id });
            }
        };

        return (
            <AnimatedListItem index={index} animationType="fadeUp" staggerDelay={50}>
                <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
                    <BlurView intensity={isCurrentUser ? 20 : 0} tint="dark" style={[styles.rowCard, isCurrentUser && styles.rowHighlight]}>
                        <View style={[styles.rowInner, isCurrentUser && { backgroundColor: 'rgba(255,87,34,0.1)' }]}>
                            {/* Rank */}
                            <View style={styles.rankContainer}>
                                <Text style={[styles.rankNumber, isTop3 && { color: rankColor, fontSize: 18 }]}>
                                    {rank < 10 ? `0${rank}` : rank}
                                </Text>
                            </View>

                            {/* Avatar */}
                            <View style={styles.avatarContainer}>
                                <View style={[styles.avatar, { borderColor: isTop3 ? rankColor : '#333' }]}>
                                    {item.users?.avatar_url ? (
                                        <Image source={{ uri: item.users.avatar_url }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                                    )}
                                </View>
                            </View>

                            {/* Info */}
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, isCurrentUser && { color: theme.colors.brand.primary }]}>{name.toUpperCase()}</Text>
                                <View style={styles.tierRow}>
                                    <Text style={[styles.tierText, { color: getTierColor(tier) }]}>{getTierLabel(tier)}</Text>
                                </View>
                            </View>

                            {/* Points */}
                            <View style={styles.pointsContainer}>
                                <Text style={styles.points}>{points}</Text>
                                <Text style={styles.pointsLabel}>PTS</Text>
                            </View>
                        </View>
                    </BlurView>
                </TouchableOpacity>
            </AnimatedListItem>
        );
    };

    if (loading && leaderboard.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <ImageBackground
                source={require('../../../assets/run-bg.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <View style={styles.overlay} />

                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLabel}>GLOBAL RANKING</Text>
                            <Text style={styles.headerTitle}>LEADERBOARD</Text>
                        </View>
                        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <CloseIcon size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Current User Floating Card (Glass) */}
                    <View style={styles.userCardContainer}>
                        <BlurView intensity={30} tint="dark" style={styles.userGlassCard}>
                            <View style={styles.userCardContent}>
                                <View style={styles.userCardLeft}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.userRankText}>{currentUser.rank}</Text>
                                        <Text style={styles.userRankLabel}>POS</Text>
                                    </View>
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userCardName}>{currentUser.name.toUpperCase()}</Text>
                                        <Text style={[styles.userCardTier, { color: theme.colors.brand.primary }]}>
                                            {getTierLabel(currentUser.tier)} • LEVEL 12
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.userCardRight}>
                                    <Text style={styles.userCardPoints}>{currentUser.points}</Text>
                                    <Text style={styles.userCardPointsLabel}>PTS</Text>
                                </View>
                            </View>
                        </BlurView>
                    </View>

                    {/* Leaderboard List */}
                    <FlatList
                        data={leaderboard}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FFF"
                            />
                        }
                        showsVerticalScrollIndicator={false}
                    />
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
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    safeArea: {
        flex: 1,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
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
    // User Card (Featured at top)
    userCardContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
        transform: [{ rotate: '-1deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    userGlassCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,160,0,0.3)', // Subtle orange tint border
    },
    userCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: 'rgba(255,87,34,0.1)', // Very subtle orange tint
    },
    userCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        width: 44,
        height: 44,
        borderRadius: 12,
        marginRight: 16,
    },
    userRankText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#000',
        lineHeight: 20,
    },
    userRankLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#000',
    },
    userDetails: {
        justifyContent: 'center',
    },
    userCardName: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    userCardTier: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    userCardRight: {
        alignItems: 'flex-end',
    },
    userCardPoints: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        includeFontPadding: false,
    },
    userCardPointsLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
    },
    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    rowCard: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    rowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    rowHighlight: {
        borderColor: theme.colors.brand.primary,
        borderWidth: 1,
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
    },
    rankNumber: {
        fontSize: 14,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
        fontVariant: ['tabular-nums'],
    },
    avatarContainer: {
        marginRight: 12,
        marginLeft: 8,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#000',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFF',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 2,
    },
    tierRow: {},
    tierText: {
        fontSize: 8,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
    points: {
        fontSize: 16,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    pointsLabel: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
    },
});
