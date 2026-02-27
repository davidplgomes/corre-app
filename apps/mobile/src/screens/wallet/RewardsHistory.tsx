import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { BackButton } from '../../components/common';
import { getPointsHistory, getAvailablePoints } from '../../services/supabase/wallet';

type RewardsHistoryProps = {
    navigation: any;
};

type FilterType = 'all' | 'earned' | 'spent';

interface Transaction {
    id: string;
    type: 'earn' | 'spend';
    amount: number;
    description: string;
    source: string;
    created_at: string;
}

const TRANSACTION_ICONS: Record<string, { emoji: string; color: string }> = {
    run: { emoji: '🏃', color: '#10B981' },
    strava: { emoji: '⚡', color: '#FC4C02' },
    event: { emoji: '📅', color: '#7C3AED' },
    checkin: { emoji: '📍', color: '#3B82F6' },
    referral: { emoji: '👥', color: '#EC4899' },
    purchase: { emoji: '🛒', color: '#EF4444' },
    subscription: { emoji: '💳', color: '#F59E0B' },
    bonus: { emoji: '🎁', color: '#10B981' },
    expired: { emoji: '⏰', color: '#6B7280' },
};

export const RewardsHistory: React.FC<RewardsHistoryProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [totalPoints, setTotalPoints] = useState(0);
    const [stats, setStats] = useState({ earned: 0, spent: 0 });

    const loadTransactions = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [transactionsData, pointsData] = await Promise.all([
                getPointsHistory(user.id).catch(() => []),
                getAvailablePoints(user.id).catch(() => 0),
            ]);

            // Map transactions to our format
            const mappedTransactions: Transaction[] = transactionsData.map((tx: any) => ({
                id: tx.id,
                type: tx.points_amount > 0 ? 'earn' : 'spend',
                amount: Math.abs(tx.points_amount || 0),
                description: tx.description || getDefaultDescription(tx.source_type),
                source: tx.source_type || 'bonus',
                created_at: tx.earned_at || tx.created_at,
            }));

            // Calculate stats
            const earned = mappedTransactions
                .filter(tx => tx.type === 'earn')
                .reduce((sum, tx) => sum + tx.amount, 0);
            const spent = mappedTransactions
                .filter(tx => tx.type === 'spend')
                .reduce((sum, tx) => sum + tx.amount, 0);

            setTransactions(mappedTransactions);
            setTotalPoints(pointsData);
            setStats({ earned, spent });
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    const getDefaultDescription = (source: string): string => {
        switch (source) {
            case 'run': return 'Run completed';
            case 'strava': return 'Strava activity synced';
            case 'event': return 'Event participation';
            case 'checkin': return 'Event check-in';
            case 'referral': return 'Friend referral bonus';
            case 'purchase': return 'Shop purchase';
            case 'subscription': return 'Subscription reward';
            case 'bonus': return 'Bonus points';
            case 'expired': return 'Points expired';
            default: return 'Points transaction';
        }
    };

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    useEffect(() => {
        switch (filter) {
            case 'earned':
                setFilteredTransactions(transactions.filter(tx => tx.type === 'earn'));
                break;
            case 'spent':
                setFilteredTransactions(transactions.filter(tx => tx.type === 'spend'));
                break;
            default:
                setFilteredTransactions(transactions);
        }
    }, [filter, transactions]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadTransactions();
    }, [loadTransactions]);

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            });
        }
    };

    const formatTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const config = TRANSACTION_ICONS[item.source] || TRANSACTION_ICONS.bonus;
        const isEarn = item.type === 'earn';

        return (
            <BlurView intensity={20} tint="dark" style={styles.transactionCard}>
                <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
                    <Text style={styles.iconEmoji}>{config.emoji}</Text>
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{item.description}</Text>
                    <Text style={styles.transactionTime}>
                        {formatDate(item.created_at)} at {formatTime(item.created_at)}
                    </Text>
                </View>
                <Text style={[
                    styles.transactionAmount,
                    isEarn ? styles.amountEarn : styles.amountSpend
                ]}>
                    {isEarn ? '+' : '-'}{item.amount}
                </Text>
            </BlurView>
        );
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
                                <Text style={styles.headerLabel}>POINTS</Text>
                                <Text style={styles.headerTitle}>HISTORY</Text>
                            </View>
                        </View>
                    </View>

                    {/* Balance Card */}
                    <View style={styles.balanceContainer}>
                        <BlurView intensity={30} tint="dark" style={styles.balanceCard}>
                            <Text style={styles.balanceLabel}>AVAILABLE POINTS</Text>
                            <Text style={styles.balanceValue}>{totalPoints.toLocaleString()}</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, styles.statEarned]}>
                                        +{stats.earned.toLocaleString()}
                                    </Text>
                                    <Text style={styles.statLabel}>Earned</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, styles.statSpent]}>
                                        -{stats.spent.toLocaleString()}
                                    </Text>
                                    <Text style={styles.statLabel}>Spent</Text>
                                </View>
                            </View>
                        </BlurView>
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.filterContainer}>
                        {(['all', 'earned', 'spent'] as FilterType[]).map((f) => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setFilter(f);
                                }}
                            >
                                <Text style={[
                                    styles.filterText,
                                    filter === f && styles.filterTextActive
                                ]}>
                                    {f.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Transactions List */}
                    {filteredTransactions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Text style={styles.emptyIcon}>📊</Text>
                            </View>
                            <Text style={styles.emptyTitle}>No transactions</Text>
                            <Text style={styles.emptySubtitle}>
                                {filter === 'all'
                                    ? 'Your points history will appear here'
                                    : `No ${filter} points yet`
                                }
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredTransactions}
                            keyExtractor={(item) => item.id}
                            renderItem={renderTransaction}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#FFF"
                                />
                            }
                        />
                    )}
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

    // Balance Card
    balanceContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    balanceCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
        overflow: 'hidden',
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 8,
    },
    balanceValue: {
        fontSize: 48,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statEarned: {
        color: '#10B981',
    },
    statSpent: {
        color: '#EF4444',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },

    // Filter
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 10,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: theme.colors.brand.primary,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
    },
    filterTextActive: {
        color: '#000',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
        gap: 10,
    },

    // Transaction Card
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    iconEmoji: {
        fontSize: 20,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionDescription: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 4,
    },
    transactionTime: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
    transactionAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    amountEarn: {
        color: '#10B981',
    },
    amountSpend: {
        color: '#EF4444',
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyIcon: {
        fontSize: 44,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
});

export default RewardsHistory;
