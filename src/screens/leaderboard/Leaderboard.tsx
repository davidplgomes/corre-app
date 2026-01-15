import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../../components/common';
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
        try {
            setLoading(true);
            const [leaderboardData, rankData] = await Promise.all([
                getCurrentMonthLeaderboard(50),
                profile?.id ? getUserRank(profile.id) : { rank: null, points: 0, total: 0 },
            ]);

            if (leaderboardData && leaderboardData.length > 0) {
                setLeaderboard(leaderboardData);
            }
            if (rankData.rank !== null) {
                setUserRank(rankData);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
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

        return (
            <View style={[styles.row, isCurrentUser && styles.rowHighlight]}>
                {/* Rank */}
                <View style={styles.rankContainer}>
                    <Text style={styles.rankNumber}>{rank}.</Text>
                </View>

                {/* Avatar */}
                <View style={[styles.avatar, { borderColor: getTierColor(tier) }]}>
                    <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>

                {/* Info */}
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{name}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: getTierColor(tier) }]}>
                        <Text style={styles.tierText}>{getTierLabel(tier)}</Text>
                    </View>
                </View>

                {/* Points */}
                <View style={styles.pointsContainer}>
                    <Text style={styles.points}>{points}</Text>
                    <Text style={styles.pointsLabel}>Pontos</Text>
                </View>
            </View>
        );
    };

    if (loading && leaderboard.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerLabel}>RANKING</Text>
                    <Text style={styles.headerTitle}>Mensal</Text>
                </View>

                {/* Current User Card */}
                <View style={styles.userCard}>
                    <View style={styles.userCardLeft}>
                        <Text style={styles.userCardRank}>{currentUser.rank}.</Text>
                        <View style={[styles.userCardAvatar, { borderColor: getTierColor(currentUser.tier) }]}>
                            <Text style={styles.userCardAvatarText}>
                                {currentUser.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.userCardName}>{currentUser.name}</Text>
                            <View style={[styles.tierBadge, { backgroundColor: getTierColor(currentUser.tier) }]}>
                                <Text style={styles.tierText}>{getTierLabel(currentUser.tier)}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.userCardRight}>
                        <Text style={styles.userCardPoints}>{currentUser.points}</Text>
                        <Text style={styles.userCardPointsLabel}>Pontos</Text>
                    </View>
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
                            tintColor={theme.colors.brand.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
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

    // Header
    header: {
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[4],
    },
    headerLabel: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        marginBottom: theme.spacing[1],
    },
    headerTitle: {
        fontSize: theme.typography.size.displaySM,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },

    // User Card (Featured at top)
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[6],
        padding: theme.spacing[4],
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    userCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userCardRank: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
        marginRight: theme.spacing[3],
    },
    userCardAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.background.elevated,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[3],
    },
    userCardAvatarText: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    userCardName: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    userCardRight: {
        alignItems: 'flex-end',
    },
    userCardPoints: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary,
    },
    userCardPointsLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
    },

    // List
    listContent: {
        paddingHorizontal: theme.spacing[6],
        paddingBottom: 120,
    },

    // Row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    rowHighlight: {
        backgroundColor: theme.colors.brand.subtle,
        marginHorizontal: -theme.spacing[6],
        paddingHorizontal: theme.spacing[6],
        borderRadius: theme.radius.md,
    },
    rankContainer: {
        width: 32,
    },
    rankNumber: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.secondary,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background.card,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[3],
    },
    avatarText: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.medium as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    tierBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing[2],
        paddingVertical: 2,
        borderRadius: theme.radius.sm,
    },
    tierText: {
        fontSize: theme.typography.size.micro,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.black,
        letterSpacing: theme.typography.letterSpacing.wide,
    },
    pointsContainer: {
        alignItems: 'flex-end',
    },
    points: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    pointsLabel: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
    },
});
