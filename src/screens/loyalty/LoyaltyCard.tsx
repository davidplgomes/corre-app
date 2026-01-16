import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Screen } from '../../components/common/Screen';
import { useAuth } from '../../contexts/AuthContext';
import { theme, tierColors } from '../../constants/theme';
import { DigitalCard } from '../../components/loyalty/DigitalCard';
import { LinearGradient } from 'expo-linear-gradient';

type LoyaltyCardProps = {
    navigation: any;
};

// Reusable Stat Component
const StatBox = ({ label, value, subLabel }: { label: string, value: string | number, subLabel?: string }) => (
    <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subLabel && <Text style={styles.statSub}>{subLabel}</Text>}
    </View>
);

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ navigation }) => {
    const { profile, user } = useAuth();

    // Use profile data or fallback to mock data
    const tier = (profile?.membershipTier || 'basico') as keyof typeof tierColors;
    const tierConfig = tierColors[tier] || tierColors.basico;

    const memberData = {
        name: profile?.fullName || user?.email?.split('@')[0] || 'Membro CORRE',
        id: profile?.id?.slice(0, 10).toUpperCase() || '0123456789',
        tier: tierConfig.label,
        tierColor: tierConfig.primary,
    };

    const stats = {
        points: profile?.currentMonthPoints || 1250,
        lifetime: profile?.totalLifetimePoints || 4850,
        nextTier: 5000,
    };

    const progress = Math.min((stats.lifetime / stats.nextTier) * 100, 100);

    const benefits = [
        { id: '1', text: '10% OFF em parceiros', active: true, icon: '🛍️' },
        { id: '2', text: 'Acesso VIP a eventos', active: true, icon: '🎫' },
        { id: '3', text: 'Prioridade na fila', active: true, icon: '⚡' },
    ];

    const recentActivity = [
        { id: '1', type: 'earn', points: 150, description: 'Corrida Noturna', date: '14 Jan' },
        { id: '2', type: 'earn', points: 100, description: 'Treino Semanal', date: '12 Jan' },
        { id: '3', type: 'redeem', points: -200, description: 'Resgate Store', date: '10 Jan' },
    ];

    return (
        <Screen
            preset="scroll"
            safeAreaEdges={['top']}
            contentContainerStyle={styles.scrollContent}
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>SUA CARTEIRA</Text>
                    <Text style={styles.headerTitle}>Fidelidade</Text>
                </View>
                {/* Optional: Add a settings or info icon here */}
            </View>

            {/* Digital Card Section - Center Stage */}
            <View style={styles.cardSection}>
                <DigitalCard member={memberData} />
            </View>

            {/* Stats Grid */}
            <View style={styles.statsContainer}>
                <StatBox label="PONTOS MÊS" value={stats.points} />
                <View style={styles.divider} />
                <StatBox label="TOTAL GERAL" value={stats.lifetime} />
            </View>

            {/* Progress to Next Tier */}
            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Próximo Nível: ELITE</Text>
                    <Text style={styles.progressValue}>{Math.floor(progress)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <LinearGradient
                        colors={[theme.colors.brand.primary, theme.colors.brand.secondary]}
                        style={[styles.progressBarFill, { width: `${progress}%` }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />
                </View>
                <Text style={styles.progressSub}>
                    Faltam {stats.nextTier - stats.lifetime} pontos para subir de nível
                </Text>
            </View>

            {/* Menu / Actions */}
            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('MerchantScanner')}
                >
                    <View style={styles.actionIcon}>
                        <Text style={{ fontSize: 24 }}>📷</Text>
                    </View>
                    <Text style={styles.actionText}>Escanear</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <View style={styles.actionIcon}>
                        <Text style={{ fontSize: 24 }}>🎁</Text>
                    </View>
                    <Text style={styles.actionText}>Resgatar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <View style={styles.actionIcon}>
                        <Text style={{ fontSize: 24 }}>📜</Text>
                    </View>
                    <Text style={styles.actionText}>Histórico</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Activity List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ÚLTIMAS ATIVIDADES</Text>
                <View style={styles.listContainer}>
                    {recentActivity.map((activity, index) => (
                        <View key={activity.id} style={[
                            styles.activityRow,
                            index !== recentActivity.length - 1 && styles.borderBottom
                        ]}>
                            <View style={styles.activityLeft}>
                                <View style={[
                                    styles.activityDot,
                                    { backgroundColor: activity.type === 'earn' ? theme.colors.success : theme.colors.brand.primary }
                                ]} />
                                <View>
                                    <Text style={styles.activityDesc}>{activity.description}</Text>
                                    <Text style={styles.activityDate}>{activity.date}</Text>
                                </View>
                            </View>
                            <Text style={[
                                styles.activityPoints,
                                activity.type === 'redeem' ? styles.negativePoints : styles.positivePoints
                            ]}>
                                {activity.points > 0 ? '+' : ''}{activity.points}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Benefits List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SEUS BENEFÍCIOS</Text>
                <View style={styles.benefitsGrid}>
                    {benefits.map((benefit) => (
                        <View key={benefit.id} style={styles.benefitCard}>
                            <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                            <Text style={styles.benefitText}>{benefit.text}</Text>
                        </View>
                    ))}
                </View>
            </View>

        </Screen>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.background.primary,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        marginBottom: theme.spacing[6],
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text.tertiary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.text.primary,
        letterSpacing: -0.5,
    },
    cardSection: {
        alignItems: 'center',
        marginBottom: theme.spacing[8],
        zIndex: 10, // Ensure card flips over other elements if needed
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing[6],
        backgroundColor: theme.colors.background.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: theme.spacing[6],
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: theme.colors.border.default,
        marginHorizontal: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.text.tertiary,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    statSub: {
        fontSize: 10,
        color: theme.colors.success,
        marginTop: 2,
    },
    progressSection: {
        marginHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        fontWeight: '600',
    },
    progressValue: {
        fontSize: 12,
        color: theme.colors.brand.primary,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressSub: {
        fontSize: 11,
        color: theme.colors.text.tertiary,
    },
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    actionIcon: {
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    section: {
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.text.tertiary,
        marginBottom: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    listContainer: {
        backgroundColor: theme.colors.background.card,
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.subtle,
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activityDesc: {
        fontSize: 14,
        color: theme.colors.text.primary,
        fontWeight: '500',
        marginBottom: 2,
    },
    activityDate: {
        fontSize: 11,
        color: theme.colors.text.tertiary,
    },
    activityPoints: {
        fontSize: 14,
        fontWeight: '700',
    },
    positivePoints: {
        color: theme.colors.success,
    },
    negativePoints: {
        color: theme.colors.text.primary,
    },
    benefitsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    benefitCard: {
        width: '48%', // roughly half - gap
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border.subtle,
    },
    benefitIcon: {
        fontSize: 20,
        marginBottom: 8,
    },
    benefitText: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        lineHeight: 18,
        fontWeight: '500',
    },
});
