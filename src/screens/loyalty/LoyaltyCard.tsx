import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Screen } from '../../components/common/Screen';
import { useAuth } from '../../contexts/AuthContext';
import { theme, tierColors } from '../../constants/theme';
import Svg, { Rect, Path } from 'react-native-svg';

type LoyaltyCardProps = {
    navigation: any;
};

// Simple QR Code placeholder component
const QRCodePlaceholder: React.FC<{ size: number }> = ({ size }) => (
    <View style={[styles.qrPlaceholder, { width: size, height: size }]}>
        <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
            <Rect x="3" y="3" width="7" height="7" fill="#000" />
            <Rect x="14" y="3" width="7" height="7" fill="#000" />
            <Rect x="3" y="14" width="7" height="7" fill="#000" />
            <Rect x="14" y="14" width="3" height="3" fill="#000" />
            <Rect x="18" y="14" width="3" height="3" fill="#000" />
            <Rect x="14" y="18" width="3" height="3" fill="#000" />
            <Rect x="18" y="18" width="3" height="3" fill="#000" />
        </Svg>
        <Text style={styles.qrText}>QR CODE</Text>
    </View>
);

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ navigation }) => {
    const { profile, user } = useAuth();

    // Use profile data or fallback to mock data
    const tier = (profile?.membershipTier || 'basico') as keyof typeof tierColors;
    const tierConfig = tierColors[tier] || tierColors.basico;

    const memberData = {
        name: profile?.fullName || user?.email?.split('@')[0] || 'Membro CORRE',
        memberId: profile?.id?.slice(0, 10) || '0123456789',
        points: profile?.currentMonthPoints || 1250,
        lifetimePoints: profile?.totalLifetimePoints || 4850,
        tier: tierConfig.label,
        tierColor: tierConfig.primary,
    };

    const benefits = [
        { id: '1', text: '10% desconto em lojas parceiras', active: true },
        { id: '2', text: 'Acesso a todos eventos', active: true },
        { id: '3', text: 'Prioridade em inscrições', active: true },
        { id: '4', text: 'Recompensas mensais', active: true },
    ];

    const recentActivity = [
        { id: '1', type: 'earn', points: 150, description: 'Corrida Noturna', date: '14 Jan' },
        { id: '2', type: 'earn', points: 100, description: 'Treino Semanal', date: '12 Jan' },
        { id: '3', type: 'redeem', points: -200, description: 'Desconto Loja X', date: '10 Jan' },
    ];

    return (
        <Screen
            preset="scroll"
            safeAreaEdges={['top']}
            contentContainerStyle={styles.scrollContent}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerLabel}>CARTÃO</Text>
                <Text style={styles.headerTitle}>Fidelidade</Text>
            </View>

            {/* Membership Card */}
            <View style={[styles.membershipCard, { borderColor: memberData.tierColor + '40' }]}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.brandSection}>
                        <Text style={styles.brandName}>CORRE</Text>
                        <View style={styles.clubBadge}>
                            <Text style={styles.clubText}>RUNNING CLUB</Text>
                        </View>
                    </View>
                    <View style={[styles.tierBadge, { backgroundColor: memberData.tierColor }]}>
                        <Text style={styles.tierBadgeText}>{memberData.tier}</Text>
                    </View>
                </View>

                {/* Member Info */}
                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{memberData.name}</Text>
                    <Text style={styles.memberId}>Member ID: {memberData.memberId}</Text>
                </View>

                {/* Points Display */}
                <View style={styles.pointsRow}>
                    <View style={styles.pointsBlock}>
                        <Text style={styles.pointsNumber}>{memberData.points}</Text>
                        <Text style={styles.pointsLabel}>Pontos do Mês</Text>
                    </View>
                    <View style={styles.pointsDivider} />
                    <View style={styles.pointsBlock}>
                        <Text style={styles.pointsNumberSmall}>{memberData.lifetimePoints}</Text>
                        <Text style={styles.pointsLabel}>Total Acumulado</Text>
                    </View>
                </View>

                {/* Decorative accent */}
                <View style={[styles.cardAccent, { backgroundColor: memberData.tierColor }]} />
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
                <View style={styles.qrContainer}>
                    <QRCodePlaceholder size={160} />
                </View>
                <Text style={styles.qrHint}>Escaneie para acumular pontos</Text>
                <TouchableOpacity style={styles.scanButton}>
                    <Text style={styles.scanButtonText}>Escanear QR de Parceiro</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ATIVIDADE RECENTE</Text>
                {recentActivity.map((activity) => (
                    <View key={activity.id} style={styles.activityItem}>
                        <View style={styles.activityInfo}>
                            <Text style={styles.activityDescription}>{activity.description}</Text>
                            <Text style={styles.activityDate}>{activity.date}</Text>
                        </View>
                        <Text style={[
                            styles.activityPoints,
                            activity.type === 'redeem' && styles.activityPointsNegative
                        ]}>
                            {activity.points > 0 ? '+' : ''}{activity.points}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Benefits Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SEUS BENEFÍCIOS</Text>
                <View style={styles.benefitsList}>
                    {benefits.map((benefit) => (
                        <View key={benefit.id} style={styles.benefitItem}>
                            <View style={styles.benefitCheck}>
                                <Text style={styles.benefitCheckText}>✓</Text>
                            </View>
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
    header: {
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[6],
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

    // Membership Card
    membershipCard: {
        marginHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.xl,
        padding: theme.spacing[6],
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[6],
    },
    brandSection: {
        flexDirection: 'column',
    },
    brandName: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
        letterSpacing: theme.typography.letterSpacing.wider,
    },
    clubBadge: {
        marginTop: theme.spacing[1],
    },
    clubText: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
    },
    tierBadge: {
        paddingHorizontal: theme.spacing[3],
        paddingVertical: theme.spacing[1],
        borderRadius: theme.radius.sm,
    },
    tierBadgeText: {
        fontSize: theme.typography.size.micro,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.black,
        letterSpacing: theme.typography.letterSpacing.wide,
    },
    memberInfo: {
        marginBottom: theme.spacing[6],
    },
    memberName: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    memberId: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.tertiary,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointsBlock: {
        flex: 1,
    },
    pointsDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border.default,
        marginHorizontal: theme.spacing[4],
    },
    pointsNumber: {
        fontSize: theme.typography.size.displayMD,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
        letterSpacing: theme.typography.letterSpacing.tighter,
    },
    pointsNumberSmall: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    pointsLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
    },
    cardAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
    },

    // QR Section
    qrSection: {
        alignItems: 'center',
        marginHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
    },
    qrContainer: {
        padding: theme.spacing[4],
        backgroundColor: theme.colors.white,
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing[3],
    },
    qrPlaceholder: {
        backgroundColor: theme.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrText: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.gray[400],
        marginTop: theme.spacing[2],
        letterSpacing: theme.typography.letterSpacing.widest,
    },
    qrHint: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing[4],
    },
    scanButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[3],
        borderRadius: theme.radius.full,
    },
    scanButtonText: {
        fontSize: theme.typography.size.bodySM,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.white,
    },

    // Section
    section: {
        paddingHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[8],
    },
    sectionTitle: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        marginBottom: theme.spacing[4],
    },

    // Activity
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    activityInfo: {
        flex: 1,
    },
    activityDescription: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    activityDate: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
    },
    activityPoints: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.success,
    },
    activityPointsNegative: {
        color: theme.colors.error,
    },

    // Benefits
    benefitsList: {
        gap: theme.spacing[3],
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    benefitCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[3],
    },
    benefitCheckText: {
        color: theme.colors.white,
        fontSize: 12,
        fontWeight: theme.typography.weight.bold as any,
    },
    benefitText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
    },
});
