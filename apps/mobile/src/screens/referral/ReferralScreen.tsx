import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Share,
    Clipboard,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme, tierColors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common';
import {
    getOrCreateReferralCode,
    getReferralStats,
    getReferredUsers,
    generateShareMessage,
    ReferralStats,
    Referral,
} from '../../services/supabase/referrals';

interface ReferralScreenProps {
    navigation: any;
}

const StatCard = ({
    icon,
    value,
    label,
    color
}: {
    icon: string;
    value: number | string;
    label: string;
    color: string;
}) => (
    <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const ReferredUserCard = ({ referral, t }: { referral: Referral; t: any }) => {
    const statusColors = {
        pending: { bg: '#FEF3C7', text: '#D97706', label: t('referral.status.pending') },
        subscribed: { bg: '#D1FAE5', text: '#059669', label: t('referral.status.subscribed') },
        rewarded: { bg: '#DBEAFE', text: '#2563EB', label: t('referral.status.rewarded') },
    };
    const statusConfig = statusColors[referral.status] || statusColors.pending;

    return (
        <View style={styles.referredCard}>
            <View style={styles.referredAvatar}>
                {referral.referred_user?.avatar_url ? (
                    <Image
                        source={{ uri: referral.referred_user.avatar_url }}
                        style={styles.avatarImage}
                    />
                ) : (
                    <Ionicons name="person" size={24} color="#888" />
                )}
            </View>
            <View style={styles.referredInfo}>
                <Text style={styles.referredName}>
                    {referral.referred_user?.full_name || t('referral.friend')}
                </Text>
                <Text style={styles.referredDate}>
                    {t('referral.joinedOn')} {new Date(referral.created_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })}
                </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                    {statusConfig.label}
                </Text>
            </View>
        </View>
    );
};

export const ReferralScreen: React.FC<ReferralScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [copied, setCopied] = useState(false);

    const loadData = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [code, statsData, referralsData] = await Promise.all([
                getOrCreateReferralCode(user.id),
                getReferralStats(user.id),
                getReferredUsers(user.id),
            ]);

            setReferralCode(code);
            setStats(statsData);
            setReferrals(referralsData);
        } catch (error) {
            console.error('Error loading referral data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const handleCopyCode = async () => {
        if (!referralCode) return;

        try {
            await Clipboard.setString(referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            Alert.alert('Error', 'Failed to copy code');
        }
    };

    const handleShare = async () => {
        if (!referralCode) return;

        const userName = profile?.fullName || 'A friend';
        const shareData = generateShareMessage(referralCode, userName);

        try {
            await Share.share({
                title: shareData.title,
                message: shareData.message,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

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
                <Text style={styles.headerTitle}>{t('referral.title')}</Text>
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
            >
                {/* Hero Section */}
                <LinearGradient
                    colors={[theme.colors.brand.primary, theme.colors.brand.secondary || theme.colors.brand.primary]}
                    style={styles.heroSection}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name="gift" size={48} color="#FFF" />
                    <Text style={styles.heroTitle}>{t('referral.heroTitle')}</Text>
                    <Text style={styles.heroSubtitle}>
                        {t('referral.heroSubtitle')}
                    </Text>
                </LinearGradient>

                {/* Referral Code Section */}
                <View style={styles.codeSection}>
                    <Text style={styles.sectionTitle}>{t('referral.yourCode')}</Text>
                    <View style={styles.codeContainer}>
                        <Text style={styles.codeText}>{referralCode || '...'}</Text>
                        <TouchableOpacity
                            style={[styles.copyButton, copied && styles.copyButtonSuccess]}
                            onPress={handleCopyCode}
                        >
                            <Ionicons
                                name={copied ? "checkmark" : "copy-outline"}
                                size={20}
                                color="#FFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                        <Ionicons name="share-social" size={20} color="#FFF" />
                        <Text style={styles.shareButtonText}>{t('referral.shareLink')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Section */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>{t('referral.yourReferrals')}</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon="people"
                            value={stats?.totalReferrals || 0}
                            label={t('referral.invites')}
                            color="#3B82F6"
                        />
                        <StatCard
                            icon="checkmark-circle"
                            value={stats?.successfulReferrals || 0}
                            label={t('referral.successful')}
                            color="#10B981"
                        />
                        <StatCard
                            icon="trophy"
                            value={stats?.pointsEarned || 0}
                            label={t('referral.freeMonths')}
                            color="#F59E0B"
                        />
                    </View>
                </View>

                {/* Rewards Info */}
                <View style={styles.rewardsSection}>
                    <Text style={styles.sectionTitle}>{t('referral.howItWorks')}</Text>
                    <View style={styles.rewardCard}>
                        <View style={styles.rewardStep}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>{t('referral.step1Title')}</Text>
                                <Text style={styles.stepDesc}>{t('referral.step1Desc')}</Text>
                            </View>
                        </View>
                        <View style={styles.rewardStep}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>{t('referral.step2Title')}</Text>
                                <Text style={styles.stepDesc}>{t('referral.step2Desc')}</Text>
                            </View>
                        </View>
                        <View style={styles.rewardStep}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>{t('referral.step3Title')}</Text>
                                <Text style={styles.stepDesc}>{t('referral.step3Desc')}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Referred Users List */}
                {referrals.length > 0 && (
                    <View style={styles.referralsSection}>
                        <Text style={styles.sectionTitle}>{t('referral.friendsInvited')}</Text>
                        {referrals.map((referral) => (
                            <ReferredUserCard key={referral.id} referral={referral} t={t} />
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {referrals.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color="#666" />
                        <Text style={styles.emptyTitle}>{t('referral.noReferrals')}</Text>
                        <Text style={styles.emptySubtitle}>
                            {t('referral.noReferralsDesc')}
                        </Text>
                    </View>
                )}
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

    // Hero
    heroSection: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 16,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },

    // Code Section
    codeSection: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    codeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    codeText: {
        flex: 1,
        fontSize: 28,
        fontWeight: '800',
        color: theme.colors.brand.primary,
        letterSpacing: 3,
        textAlign: 'center',
    },
    copyButton: {
        backgroundColor: theme.colors.brand.primary,
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    copyButtonSuccess: {
        backgroundColor: '#10B981',
    },
    shareButton: {
        backgroundColor: theme.colors.brand.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },

    // Stats
    statsSection: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 11,
        color: '#888',
        marginTop: 4,
        textAlign: 'center',
    },

    // Rewards
    rewardsSection: {
        marginBottom: 24,
    },
    rewardCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 20,
    },
    rewardStep: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    stepDesc: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },

    // Referred Users
    referralsSection: {
        marginBottom: 24,
    },
    referredCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    referredAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    referredInfo: {
        flex: 1,
    },
    referredName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFF',
    },
    referredDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
});

export default ReferralScreen;
