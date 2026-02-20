import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ImageBackground,
    LayoutAnimation,
    Platform,
    UIManager
} from 'react-native';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { theme, tierColors, levelColors } from '../../constants/theme';
import { DigitalCard } from '../../components/loyalty/DigitalCard';
import { QRCodeIcon, GiftIcon, ClockIcon } from '../../components/common/TabIcons';

type LoyaltyCardProps = {
    navigation: any;
};

// Reusable Stat Component
const StatBox = ({ label, value }: { label: string, value: string | number }) => (
    <View style={styles.statBox}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ navigation }) => {
    const { profile, user } = useAuth();
    const { t } = useTranslation();

    // Use profile data or fallback to mock data
    // New Logic: Level based on XP, not Plan
    const currentXP = profile?.current_xp || 0; // Fallback to 0 if not in DB yet
    const currentPoints = profile?.current_points || 0;

    let currentLevel = 'starter';
    if (currentXP >= 15000) currentLevel = 'elite';
    else if (currentXP >= 10000) currentLevel = 'pacer';

    const levelConfig = levelColors[currentLevel as keyof typeof levelColors] || levelColors.starter;

    const memberData = {
        name: profile?.fullName || user?.email?.split('@')[0] || 'Membro CORRE',
        id: profile?.id?.slice(0, 10).toUpperCase() || '0123456789',
        tier: levelConfig.label,
        tierColor: levelConfig.primary,
    };

    // Dynamic QR Code Logic
    const [qrValue, setQrValue] = React.useState('');
    const [timer, setTimer] = React.useState(30);

    React.useEffect(() => {
        let interval: NodeJS.Timeout;

        const updateQR = async () => {
            if (!user?.id) return;

            try {
                const { getUserQRSecret } = require('../../services/supabase/users');
                const { generateQRPayload } = require('../../utils/totp');

                const secret = await getUserQRSecret(user.id);
                if (secret) {
                    const payload = await generateQRPayload(user.id, secret);
                    setQrValue(payload);
                }
            } catch (err) {
                console.error('QR Gen Error:', err);
            }
        };

        updateQR();
        interval = setInterval(() => {
            const seconds = Math.floor(Date.now() / 1000);
            const remaining = 30 - (seconds % 30);
            setTimer(remaining);

            if (remaining === 30 || remaining === 0) {
                updateQR();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user?.id]);

    const stats = {
        points: currentPoints, // Spendable
        xp: currentXP,       // Level Progress
        nextLevelXP: currentLevel === 'starter' ? 10000 : (currentLevel === 'pacer' ? 15000 : 30000),
        currentLevelName: levelConfig.label,
        nextLevelName: currentLevel === 'starter' ? 'PACER' : (currentLevel === 'pacer' ? 'ELITE' : 'MAX'),
    };

    const xpToNext = stats.nextLevelXP - stats.xp;
    const tierFloor = currentLevel === 'starter' ? 0 : (currentLevel === 'pacer' ? 10000 : 15000);
    const progress = Math.min(((stats.xp - tierFloor) / (stats.nextLevelXP - tierFloor)) * 100, 100);

    React.useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [progress]);

    const benefits = [
        { id: '1', text: t('loyalty.discountPartners'), icon: '🛍️' },
        { id: '2', text: t('loyalty.vipAccess'), icon: '🎫' },
        { id: '3', text: t('loyalty.priorityQueue'), icon: '⚡' },
    ];

    const recentActivity: { id: string; type: string; points: number; description: string; date: string }[] = [];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerLabel}>{t('loyalty.yourWallet').toUpperCase()}</Text>
                            <Text style={styles.headerTitle}>{t('loyalty.fidelity').toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Digital Card Section */}
                    <View style={styles.cardSection}>
                        <DigitalCard member={memberData} qrData={qrValue || 'loading'} />
                        <View style={styles.timerContainer}>
                            <ClockIcon size={12} color="rgba(255,255,255,0.5)" />
                            <Text style={styles.timerText}>{t('loyalty.updatesIn')} {timer}s</Text>
                        </View>
                    </View>

                    {/* Stats Grid - Split XP vs Points */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBoxSeparate}>
                            <Text style={styles.statValueLarge}>{stats.points.toLocaleString()}</Text>
                            <Text style={styles.statLabelSmall}>{t('loyalty.points')} (R$)</Text>
                        </View>
                        <View style={[styles.statBoxSeparate, styles.statBoxAccent, { borderColor: levelConfig.primary }]}>
                            <Text style={[styles.statValueLarge, { color: levelConfig.primary }]}>{stats.xp.toLocaleString()}</Text>
                            <Text style={styles.statLabelSmall}>{t('loyalty.xpLevel')}</Text>
                        </View>
                    </View>

                    {/* Progress Section */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabelLeft}>{t('loyalty.nextLevel')}</Text>
                            <Text style={styles.progressLabelRight}>{stats.nextLevelName}</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <LinearGradient
                                colors={['#666', '#999']}
                                style={[styles.progressBarFill, { width: `${progress}%` }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>
                        <View style={styles.progressFooter}>
                            <Text style={styles.progressCurrent}>{t('loyalty.current')}: {stats.currentLevelName}</Text>
                            <Text style={styles.progressRemaining}>{xpToNext} {t('loyalty.xpTo')} {stats.nextLevelName}</Text>
                        </View>
                    </View>

                    {/* Quick Actions with Proper Icons - matching HomeScreen style */}
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={styles.actionWrapper}
                            onPress={() => navigation.navigate('MerchantScanner')}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.actionBlur}>
                                <View style={styles.actionContent}>
                                    <View style={styles.actionIconContainer}>
                                        <QRCodeIcon size={24} color="#FFF" />
                                    </View>
                                    <Text style={styles.actionLabel}>{t('loyalty.scan').toUpperCase()}</Text>
                                </View>
                            </BlurView>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionWrapper}
                            onPress={() => navigation.navigate('Coupons')}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.actionBlur}>
                                <View style={styles.actionContent}>
                                    <View style={styles.actionIconContainer}>
                                        <GiftIcon size={24} color="#FFF" />
                                    </View>
                                    <Text style={styles.actionLabel}>{t('coupons.title').toUpperCase()}</Text>
                                </View>
                            </BlurView>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionWrapper}
                            onPress={() => navigation.navigate('RunHistory')}
                            activeOpacity={0.8}
                        >
                            <BlurView intensity={20} tint="dark" style={styles.actionBlur}>
                                <View style={styles.actionContent}>
                                    <View style={styles.actionIconContainer}>
                                        <ClockIcon size={24} color="#FFF" />
                                    </View>
                                    <Text style={styles.actionLabel}>{t('loyalty.history').toUpperCase()}</Text>
                                </View>
                            </BlurView>
                        </TouchableOpacity>
                    </View>

                    {/* Benefits List */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('loyalty.yourBenefits').toUpperCase()}</Text>
                        <View style={styles.benefitsGrid}>
                            {benefits.map((benefit) => (
                                <BlurView key={benefit.id} intensity={10} tint="dark" style={styles.benefitGlass}>
                                    <View style={styles.benefitCard}>
                                        <Text style={styles.benefitIcon}>{benefit.icon}</Text>
                                        <Text style={styles.benefitText}>{benefit.text}</Text>
                                    </View>
                                </BlurView>
                            ))}
                        </View>
                    </View>

                    {/* Recent Activity */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('loyalty.recentActivity').toUpperCase()}</Text>
                        <BlurView intensity={15} tint="dark" style={styles.listGlass}>
                            <View style={styles.listContainer}>
                                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
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
                                )) : (
                                    <View style={styles.activityRow}>
                                        <Text style={styles.activityDate}>{t('loyalty.noActivity', 'Nenhuma atividade recente')}</Text>
                                    </View>
                                )}
                            </View>
                        </BlurView>
                    </View>

                </ScrollView>
            </SafeAreaView >
        </View >
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
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        marginBottom: 20,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    cardSection: {
        alignItems: 'center',
        marginBottom: 30,
        zIndex: 10,
        paddingHorizontal: 20,
    },
    statsGlass: {
        marginHorizontal: 20,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '900',
        letterSpacing: 1,
    },
    // New stats layout - separate boxes
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 12,
    },
    statBoxSeparate: {
        flex: 1,
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderRadius: 12,
        paddingVertical: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statBoxAccent: {
        borderColor: theme.colors.brand.primary,
        borderWidth: 1,
    },
    statValueLarge: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 4,
    },
    accentText: {
        color: theme.colors.brand.primary,
    },
    statLabelSmall: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    // New progress section
    progressSection: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    progressLabelLeft: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    progressLabelRight: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.brand.primary,
        letterSpacing: 0.5,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressCurrent: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
    },
    progressRemaining: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
    },
    // Action cards - matching HomeScreen style
    actionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 30,
        gap: 12,
    },
    actionWrapper: {
        flex: 1,
    },
    actionBlur: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    actionContent: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCard: {
        flex: 1,
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderRadius: 12,
        paddingVertical: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionIconText: {
        fontSize: 20,
        color: '#FFF',
    },
    actionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 1,
    },
    // Keep old styles for compatibility
    actionGlass: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    actionText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    sectionGlass: {
        marginHorizontal: 20,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    sectionInner: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    progressLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    progressValue: {
        fontSize: 14,
        color: theme.colors.brand.primary,
        fontWeight: '900',
    },
    progressSub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        fontStyle: 'italic',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 16,
        letterSpacing: 1,
        paddingLeft: 4,
    },
    benefitsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    benefitGlass: {
        width: '48%',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    benefitCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        height: 100,
        justifyContent: 'center',
    },
    benefitIcon: {
        fontSize: 20,
        marginBottom: 8,
    },
    benefitText: {
        fontSize: 12,
        color: '#FFF',
        lineHeight: 16,
        fontWeight: '600',
    },
    listGlass: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    listContainer: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    activityDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activityDesc: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: '600',
        marginBottom: 2,
    },
    activityDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
    },
    activityPoints: {
        fontSize: 14,
        fontWeight: '700',
    },
    positivePoints: {
        color: theme.colors.success,
    },
    negativePoints: {
        color: '#FFF',
    },
    // Timer styles
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    timerText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
});
