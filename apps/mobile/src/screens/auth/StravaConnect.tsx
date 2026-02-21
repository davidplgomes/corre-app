import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    ImageBackground,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { connectStrava, isStravaConnected, getStravaStats } from '../../services/supabase/strava';
import * as Haptics from 'expo-haptics';
import { useOnboarding } from '../../navigation/RootNavigator';
import {
    StravaIcon,
    SyncIcon,
    BoltIcon,
    LeaderboardIcon,
    CheckCircleIcon,
} from '../../components/common/TabIcons';

const { width, height } = Dimensions.get('window');
const STRAVA_ORANGE = '#FC4C02';

type StravaConnectProps = {
    navigation: any;
};

export const StravaConnect: React.FC<StravaConnectProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { completeOnboarding } = useOnboarding();
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(false);
    const [stats, setStats] = useState<{ totalKm: number; totalActivities: number } | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        setChecking(true);
        try {
            const isConnected = await isStravaConnected();
            setConnected(isConnected);
            if (isConnected) {
                const stravaStats = await getStravaStats();
                if (stravaStats) {
                    setStats({
                        totalKm: stravaStats.total_km || 0,
                        totalActivities: stravaStats.total_activities || 0,
                    });
                }
            }
        } catch (error) {
            console.error('Error checking Strava connection:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleConnect = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            const result = await connectStrava();
            if (result.success) {
                setConnected(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const stravaStats = await getStravaStats();
                if (stravaStats) {
                    setStats({
                        totalKm: stravaStats.total_km || 0,
                        totalActivities: stravaStats.total_activities || 0,
                    });
                }
            } else {
                Alert.alert(
                    t('common.error'),
                    result.error || t('strava.connectionError')
                );
            }
        } catch (error) {
            console.error('Strava connect error:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('common.error'), t('strava.connectionError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        Haptics.selectionAsync();
        await completeOnboarding();
    };

    const handleContinue = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await completeOnboarding();
    };

    if (checking) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={STRAVA_ORANGE} />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <ImageBackground
                source={require('../../../assets/run_bg_club.png')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                {/* Gradient overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                    locations={[0, 0.5, 1]}
                    style={styles.gradient}
                />

                <SafeAreaView style={styles.safeArea}>
                    {/* Step Indicator */}
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepText}>{t('onboarding.step', 'STEP')} 3/3</Text>
                    </View>

                    {/* Spacer */}
                    <View style={styles.spacer} />

                    {/* Main Content */}
                    <View style={styles.content}>
                        {/* Strava Logo */}
                        <View style={styles.logoSection}>
                            <View style={[styles.logoCircle, connected && styles.logoCircleConnected]}>
                                {connected ? (
                                    <CheckCircleIcon size={48} color="#FFF" filled />
                                ) : (
                                    <StravaIcon size={48} color="#FFF" />
                                )}
                            </View>
                            {connected && (
                                <View style={styles.connectedBadge}>
                                    <Text style={styles.connectedBadgeText}>
                                        {t('strava.connected', 'CONNECTED')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>
                            {connected
                                ? t('strava.allSet', "YOU'RE ALL SET").toUpperCase()
                                : t('strava.connectTitle', 'CONNECT STRAVA').toUpperCase()
                            }
                        </Text>
                        <Text style={styles.subtitle}>
                            {connected
                                ? t('strava.syncReady', 'Your runs will sync automatically')
                                : t('strava.connectSubtitle', 'Sync your runs and earn points for every activity')
                            }
                        </Text>

                        {/* Stats (when connected) */}
                        {connected && stats && (stats.totalKm > 0 || stats.totalActivities > 0) && (
                            <View style={styles.statsContainer}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{stats.totalKm.toFixed(1)}</Text>
                                    <Text style={styles.statLabel}>KM</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statBox}>
                                    <Text style={styles.statValue}>{stats.totalActivities}</Text>
                                    <Text style={styles.statLabel}>{t('strava.runs', 'RUNS')}</Text>
                                </View>
                            </View>
                        )}

                        {/* Benefits (when not connected) */}
                        {!connected && (
                            <View style={styles.benefitsContainer}>
                                <View style={styles.benefitRow}>
                                    <View style={styles.benefitIconWrapper}>
                                        <SyncIcon size={20} color={STRAVA_ORANGE} />
                                    </View>
                                    <View style={styles.benefitTextContainer}>
                                        <Text style={styles.benefitTitle}>
                                            {t('strava.benefit1Title', 'Auto-sync runs')}
                                        </Text>
                                        <Text style={styles.benefitDesc}>
                                            {t('strava.benefit1Desc', 'Activities appear automatically')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.benefitRow}>
                                    <View style={styles.benefitIconWrapper}>
                                        <BoltIcon size={20} color={STRAVA_ORANGE} />
                                    </View>
                                    <View style={styles.benefitTextContainer}>
                                        <Text style={styles.benefitTitle}>
                                            {t('strava.benefit2Title', 'Earn points')}
                                        </Text>
                                        <Text style={styles.benefitDesc}>
                                            {t('strava.benefit2Desc', 'Get rewarded for every run')}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.benefitRow}>
                                    <View style={styles.benefitIconWrapper}>
                                        <LeaderboardIcon size={20} color={STRAVA_ORANGE} />
                                    </View>
                                    <View style={styles.benefitTextContainer}>
                                        <Text style={styles.benefitTitle}>
                                            {t('strava.benefit3Title', 'Climb leaderboards')}
                                        </Text>
                                        <Text style={styles.benefitDesc}>
                                            {t('strava.benefit3Desc', 'Compete with the community')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Footer Buttons */}
                    <View style={styles.footer}>
                        {connected ? (
                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={handleContinue}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.continueButtonText}>
                                    {t('strava.letsGo', "LET'S GO").toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.stravaButton}
                                    onPress={handleConnect}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <StravaIcon size={22} color="#FFF" />
                                            <Text style={styles.stravaButtonText}>
                                                {t('strava.connectWithStrava', 'Connect with Strava')}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={handleSkip}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.skipButtonText}>
                                        {t('common.skipForNow', 'Skip for now')}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Powered by Strava */}
                        <View style={styles.poweredBy}>
                            <Text style={styles.poweredByText}>Powered by</Text>
                            <StravaIcon size={14} color={STRAVA_ORANGE} />
                            <Text style={[styles.poweredByText, { color: STRAVA_ORANGE, fontWeight: '700' }]}>
                                Strava
                            </Text>
                        </View>
                    </View>
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
    },
    backgroundImage: {
        width,
        height,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 24,
    },
    stepContainer: {
        alignItems: 'center',
        paddingTop: 16,
    },
    stepText: {
        fontSize: 12,
        fontWeight: '700',
        color: STRAVA_ORANGE,
        letterSpacing: 2,
    },
    spacer: {
        flex: 0.15,
    },
    content: {
        flex: 1,
        alignItems: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: STRAVA_ORANGE,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: STRAVA_ORANGE,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    logoCircleConnected: {
        backgroundColor: theme.colors.success,
        shadowColor: theme.colors.success,
    },
    connectedBadge: {
        marginTop: 16,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    connectedBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.colors.success,
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '85%',
        marginBottom: 32,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statBox: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statValue: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFF',
        fontStyle: 'italic',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1.5,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    benefitsContainer: {
        width: '100%',
        gap: 12,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    benefitIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(252, 76, 2, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    benefitTextContainer: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 2,
    },
    benefitDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 18,
    },
    footer: {
        paddingBottom: 16,
    },
    stravaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: STRAVA_ORANGE,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 10,
        shadowColor: STRAVA_ORANGE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    stravaButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    continueButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 16,
        borderRadius: 30,
        shadowColor: theme.colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 16,
        marginTop: 8,
    },
    skipButtonText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
    },
    poweredBy: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        gap: 6,
    },
    poweredByText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '500',
    },
});
