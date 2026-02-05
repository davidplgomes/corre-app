import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common';
import {
    getWalletBalance,
    getXPProgress,
    getPointsHistory,
} from '../../services/supabase/wallet';
import { WalletBalance, XPProgress, PointTransaction } from '../../types';

const { width } = Dimensions.get('window');

interface WalletScreenProps {
    navigation: any;
}

// XP Level visualization
const XPLevelCard = ({ xpProgress }: { xpProgress: XPProgress }) => {
    const levelColors = {
        starter: ['#4A4A4A', '#2A2A2A'],
        pacer: ['#6366F1', '#4F46E5'],
        elite: ['#F59E0B', '#D97706'],
    };

    const levelIcons = {
        starter: 'fitness-outline',
        pacer: 'rocket-outline',
        elite: 'trophy-outline',
    };

    const progressPercent = xpProgress.next_level
        ? Math.min(100, (xpProgress.current_xp / (xpProgress.current_xp + xpProgress.xp_to_next_level)) * 100)
        : 100;

    return (
        <LinearGradient
            colors={levelColors[xpProgress.level] as [string, string]}
            style={styles.xpCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.xpHeader}>
                <View style={styles.xpLevelBadge}>
                    <Ionicons
                        name={levelIcons[xpProgress.level] as any}
                        size={24}
                        color="#FFF"
                    />
                    <Text style={styles.xpLevelText}>
                        {xpProgress.level.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.xpRenewalBadge}>
                    <Text style={styles.renewalText}>
                        {xpProgress.renewal_discount}% OFF
                    </Text>
                    <Text style={styles.renewalSubtext}>renewal</Text>
                </View>
            </View>

            <View style={styles.xpProgressSection}>
                <Text style={styles.xpAmount}>{xpProgress.current_xp.toLocaleString()} XP</Text>
                {xpProgress.next_level && (
                    <Text style={styles.xpToNext}>
                        {xpProgress.xp_to_next_level.toLocaleString()} XP to {xpProgress.next_level.toUpperCase()}
                    </Text>
                )}
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            <Text style={styles.xpNote}>
                XP resets monthly. Earn XP to unlock renewal discounts!
            </Text>
        </LinearGradient>
    );
};

// Points Balance Card
const PointsBalanceCard = ({ wallet }: { wallet: WalletBalance }) => {
    return (
        <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
                <Ionicons name="wallet-outline" size={28} color={theme.colors.brand.primary} />
                <Text style={styles.pointsTitle}>Points Balance</Text>
            </View>

            <Text style={styles.totalPoints}>{wallet.total_available.toLocaleString()}</Text>
            <Text style={styles.pointsLabel}>available points</Text>

            {wallet.expiring_soon > 0 && (
                <View style={styles.expiringBanner}>
                    <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                    <Text style={styles.expiringText}>
                        {wallet.expiring_soon} points expiring in 7 days
                    </Text>
                </View>
            )}

            <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>Points Breakdown</Text>
                <View style={styles.breakdownRow}>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownValue}>{wallet.breakdown.routine}</Text>
                        <Text style={styles.breakdownLabel}>Routine</Text>
                        <Text style={styles.breakdownTtl}>30 days TTL</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownValue}>{wallet.breakdown.special}</Text>
                        <Text style={styles.breakdownLabel}>Special</Text>
                        <Text style={styles.breakdownTtl}>60 days TTL</Text>
                    </View>
                    <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownValue}>{wallet.breakdown.race}</Text>
                        <Text style={styles.breakdownLabel}>Race</Text>
                        <Text style={styles.breakdownTtl}>12 months TTL</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

// Transaction Item
const TransactionItem = ({ transaction }: { transaction: PointTransaction }) => {
    const isExpired = new Date(transaction.expires_at) < new Date();
    const isConsumed = transaction.points_remaining === 0;

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const sourceIcons = {
        routine: 'calendar-outline',
        special: 'star-outline',
        race: 'trophy-outline',
        purchase_refund: 'refresh-outline',
    };

    return (
        <View style={[styles.transactionItem, (isExpired || isConsumed) && styles.transactionInactive]}>
            <View style={styles.transactionIcon}>
                <Ionicons
                    name={sourceIcons[transaction.source_type] as any}
                    size={20}
                    color={isExpired || isConsumed ? '#666' : theme.colors.brand.primary}
                />
            </View>
            <View style={styles.transactionDetails}>
                <Text style={styles.transactionSource}>
                    {transaction.source_type.charAt(0).toUpperCase() + transaction.source_type.slice(1)}
                </Text>
                <Text style={styles.transactionDate}>
                    {formatDate(transaction.earned_at)}
                    {!isExpired && !isConsumed && ` • Expires ${formatDate(transaction.expires_at)}`}
                </Text>
            </View>
            <View style={styles.transactionPoints}>
                <Text style={[
                    styles.transactionAmount,
                    (isExpired || isConsumed) && styles.transactionAmountInactive
                ]}>
                    {isConsumed ? 'Used' : isExpired ? 'Expired' : `+${transaction.points_remaining}`}
                </Text>
                {transaction.points_remaining < transaction.points_amount && !isConsumed && (
                    <Text style={styles.transactionOriginal}>
                        of {transaction.points_amount}
                    </Text>
                )}
            </View>
        </View>
    );
};

export const WalletScreen: React.FC<WalletScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [wallet, setWallet] = useState<WalletBalance | null>(null);
    const [xpProgress, setXpProgress] = useState<XPProgress | null>(null);
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);

    const loadWalletData = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [walletData, xpData, txHistory] = await Promise.all([
                getWalletBalance(user.id),
                getXPProgress(user.id),
                getPointsHistory(user.id, 20),
            ]);

            setWallet(walletData);
            setXpProgress(xpData);
            setTransactions(txHistory);
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadWalletData();
    }, [loadWalletData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadWalletData();
    }, [loadWalletData]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wallet</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* XP Level Card */}
                {xpProgress && <XPLevelCard xpProgress={xpProgress} />}

                {/* Points Balance Card */}
                {wallet && <PointsBalanceCard wallet={wallet} />}

                {/* How to Earn */}
                <View style={styles.howToEarnCard}>
                    <Text style={styles.sectionTitle}>How to Earn</Text>
                    <View style={styles.earnRow}>
                        <View style={styles.earnItem}>
                            <Text style={styles.earnPoints}>+3</Text>
                            <Text style={styles.earnLabel}>Routine</Text>
                        </View>
                        <View style={styles.earnItem}>
                            <Text style={styles.earnPoints}>+5</Text>
                            <Text style={styles.earnLabel}>Special</Text>
                        </View>
                        <View style={styles.earnItem}>
                            <Text style={styles.earnPoints}>+10</Text>
                            <Text style={styles.earnLabel}>Race</Text>
                        </View>
                    </View>
                </View>

                {/* Transaction History */}
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {transactions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={48} color="#666" />
                            <Text style={styles.emptyText}>No transactions yet</Text>
                            <Text style={styles.emptySubtext}>
                                Check in at events to start earning points!
                            </Text>
                        </View>
                    ) : (
                        transactions.map((tx) => (
                            <TransactionItem key={tx.id} transaction={tx} />
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },

    // XP Card
    xpCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    xpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    xpLevelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    xpLevelText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 2,
    },
    xpRenewalBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
    },
    renewalText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    renewalSubtext: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
    },
    xpProgressSection: {
        marginBottom: 12,
    },
    xpAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFF',
    },
    xpToNext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 4,
    },
    xpNote: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },

    // Points Card
    pointsCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pointsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    pointsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    totalPoints: {
        fontSize: 48,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        textAlign: 'center',
    },
    pointsLabel: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 16,
    },
    expiringBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 16,
    },
    expiringText: {
        fontSize: 13,
        color: '#F59E0B',
    },
    breakdownContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 16,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginBottom: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakdownItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    breakdownValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    breakdownLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    breakdownTtl: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },

    // How to Earn
    howToEarnCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    earnRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    earnItem: {
        alignItems: 'center',
    },
    earnPoints: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    earnLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },

    // History Section
    historySection: {
        marginTop: 8,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    transactionInactive: {
        opacity: 0.5,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,107,53,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionSource: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    transactionDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    transactionPoints: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.brand.primary,
    },
    transactionAmountInactive: {
        color: '#666',
    },
    transactionOriginal: {
        fontSize: 10,
        color: '#666',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
});

export default WalletScreen;
