import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, TrophyIcon } from '../../components/common/TabIcons';

type AchievementsProps = {
    navigation: any;
};

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedDate?: string;
    progress?: number;
    target?: number;
}

// Mock achievements
const ACHIEVEMENTS: Achievement[] = [
    { id: '1', title: 'Primeira Corrida', description: 'Complete sua primeira corrida', icon: '🏃', unlocked: true, unlockedDate: '2025-12-01' },
    { id: '2', title: '5km Concluído', description: 'Complete uma corrida de 5km', icon: '🎯', unlocked: true, unlockedDate: '2025-12-05' },
    { id: '3', title: '10km Concluído', description: 'Complete uma corrida de 10km', icon: '🔥', unlocked: true, unlockedDate: '2025-12-15' },
    { id: '4', title: 'Meia Maratona', description: 'Complete uma meia maratona (21.1km)', icon: '🏅', unlocked: true, unlockedDate: '2026-01-01' },
    { id: '5', title: 'Maratona', description: 'Complete uma maratona (42.2km)', icon: '🏆', unlocked: false, progress: 21, target: 42 },
    { id: '6', title: '50km Total', description: 'Acumule 50km de corrida', icon: '⭐', unlocked: true, unlockedDate: '2025-12-20' },
    { id: '7', title: '100km Total', description: 'Acumule 100km de corrida', icon: '💫', unlocked: true, unlockedDate: '2026-01-05' },
    { id: '8', title: '500km Total', description: 'Acumule 500km de corrida', icon: '🌟', unlocked: false, progress: 350, target: 500 },
    { id: '9', title: 'Corredor Noturno', description: 'Complete 5 corridas noturnas', icon: '🌙', unlocked: true, unlockedDate: '2026-01-10' },
    { id: '10', title: 'Madrugador', description: 'Complete 5 corridas antes das 7h', icon: '🌅', unlocked: false, progress: 3, target: 5 },
    { id: '11', title: 'Consistência', description: 'Corra 7 dias seguidos', icon: '📅', unlocked: false, progress: 4, target: 7 },
    { id: '12', title: 'Velocista', description: 'Pace abaixo de 5 min/km', icon: '⚡', unlocked: true, unlockedDate: '2026-01-12' },
];

export const Achievements: React.FC<AchievementsProps> = ({ navigation }) => {
    const { t } = useTranslation();

    // Mock achievements with translations
    const achievements: Achievement[] = [
        { id: '1', title: t('achievements.firstRun'), description: t('achievements.firstRunDesc'), icon: '🏃', unlocked: true, unlockedDate: '2025-12-01' },
        { id: '2', title: t('achievements.5km'), description: t('achievements.5kmDesc'), icon: '🎯', unlocked: true, unlockedDate: '2025-12-05' },
        { id: '3', title: t('achievements.10km'), description: t('achievements.10kmDesc'), icon: '🔥', unlocked: true, unlockedDate: '2025-12-15' },
        { id: '4', title: t('achievements.halfMarathon'), description: t('achievements.halfMarathonDesc'), icon: '🏅', unlocked: true, unlockedDate: '2026-01-01' },
        { id: '5', title: t('achievements.marathon'), description: t('achievements.marathonDesc'), icon: '🏆', unlocked: false, progress: 21, target: 42 },
        { id: '6', title: t('achievements.50kmTotal'), description: t('achievements.50kmTotalDesc'), icon: '⭐', unlocked: true, unlockedDate: '2025-12-20' },
        { id: '7', title: t('achievements.100kmTotal'), description: t('achievements.100kmTotalDesc'), icon: '💫', unlocked: true, unlockedDate: '2026-01-05' },
        { id: '8', title: t('achievements.500kmTotal'), description: t('achievements.500kmTotalDesc'), icon: '🌟', unlocked: false, progress: 350, target: 500 },
        { id: '9', title: t('achievements.nightRunner'), description: t('achievements.nightRunnerDesc'), icon: '🌙', unlocked: true, unlockedDate: '2026-01-10' },
        { id: '10', title: t('achievements.earlyBird'), description: t('achievements.earlyBirdDesc'), icon: '🌅', unlocked: false, progress: 3, target: 5 },
        { id: '11', title: t('achievements.consistency'), description: t('achievements.consistencyDesc'), icon: '📅', unlocked: false, progress: 4, target: 7 },
        { id: '12', title: t('achievements.speedster'), description: t('achievements.speedsterDesc'), icon: '⚡', unlocked: true, unlockedDate: '2026-01-12' },
    ];

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;

    const renderAchievement = (achievement: Achievement) => (
        <View
            key={achievement.id}
            style={[styles.achievementCard, !achievement.unlocked && styles.achievementLocked]}
        >
            <View style={[styles.iconContainer, achievement.unlocked && styles.iconContainerUnlocked]}>
                <Text style={styles.icon}>{achievement.icon}</Text>
            </View>
            <View style={styles.achievementInfo}>
                <Text style={[styles.achievementTitle, !achievement.unlocked && styles.textLocked]}>
                    {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>

                {/* Progress bar for locked achievements */}
                {!achievement.unlocked && achievement.progress !== undefined && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <LinearGradient
                                colors={[theme.colors.brand.primary, theme.colors.brand.secondary]}
                                style={[
                                    styles.progressFill,
                                    { width: `${(achievement.progress / (achievement.target || 1)) * 100}%` }
                                ]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {achievement.progress}/{achievement.target}
                        </Text>
                    </View>
                )}

                {/* Unlocked date */}
                {achievement.unlocked && achievement.unlockedDate && (
                    <Text style={styles.unlockedDate}>
                        ✓ {new Date(achievement.unlockedDate).toLocaleDateString('pt-BR')}
                    </Text>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <View style={styles.backIcon}>
                                <ChevronRightIcon size={20} color="#FFF" />
                            </View>
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerLabel}>{t('profile.your').toUpperCase()}</Text>
                            <Text style={styles.headerTitle}>{t('profile.achievements').toUpperCase()}</Text>
                        </View>
                        <View style={styles.trophyBadge}>
                            <TrophyIcon size={20} color={theme.colors.brand.primary} />
                        </View>
                    </View>

                    {/* Progress Summary */}
                    <BlurView intensity={20} tint="dark" style={styles.summaryCard}>
                        <View style={styles.summaryContent}>
                            <View style={styles.summaryNumberRow}>
                                <Text style={styles.summaryNumber}>{unlockedCount}</Text>
                                <Text style={styles.summaryTotal}>/{totalCount}</Text>
                            </View>
                            <Text style={styles.summaryLabel}>{t('profile.achievements').toUpperCase()} {t('profile.completed').toUpperCase()}</Text>
                            <View style={styles.summaryProgress}>
                                <LinearGradient
                                    colors={[theme.colors.brand.primary, theme.colors.brand.secondary]}
                                    style={[
                                        styles.summaryProgressFill,
                                        { width: `${(unlockedCount / totalCount) * 100}%` }
                                    ]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>
                    </BlurView>

                    {/* Unlocked Section */}
                    <Text style={styles.sectionTitle}>{t('profile.unlocked').toUpperCase()}</Text>
                    {achievements.filter(a => a.unlocked).map(renderAchievement)}

                    {/* Locked Section */}
                    <Text style={styles.sectionTitle}>{t('profile.inProgress').toUpperCase()}</Text>
                    {achievements.filter(a => !a.unlocked).map(renderAchievement)}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    backButton: {
        marginRight: 16,
    },
    backIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        transform: [{ rotate: '180deg' }],
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    trophyBadge: {
        marginLeft: 'auto',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,136,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    // Summary
    summaryCard: {
        marginHorizontal: 20,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 32,
    },
    summaryContent: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    summaryNumberRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    summaryNumber: {
        fontSize: 64,
        fontWeight: '900',
        color: theme.colors.brand.primary,
        includeFontPadding: false,
    },
    summaryTotal: {
        fontSize: 24,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginTop: 8,
        marginBottom: 16,
    },
    summaryProgress: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    summaryProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    // Section
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        paddingHorizontal: 20,
        marginTop: 8,
        marginBottom: 16,
    },
    // Achievement Card
    achievementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    achievementLocked: {
        opacity: 0.6,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    iconContainerUnlocked: {
        backgroundColor: 'rgba(255,136,0,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,136,0,0.5)',
    },
    icon: {
        fontSize: 24,
    },
    achievementInfo: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    textLocked: {
        color: 'rgba(255,255,255,0.6)',
    },
    achievementDescription: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
    unlockedDate: {
        fontSize: 11,
        color: theme.colors.success,
        marginTop: 8,
        fontWeight: '600',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        marginRight: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '600',
    },
});
