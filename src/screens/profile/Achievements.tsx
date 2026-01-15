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
import { theme } from '../../constants/theme';

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
    const unlockedCount = ACHIEVEMENTS.filter(a => a.unlocked).length;
    const totalCount = ACHIEVEMENTS.length;

    const renderAchievement = (achievement: Achievement) => (
        <View
            key={achievement.id}
            style={[styles.achievementCard, !achievement.unlocked && styles.achievementLocked]}
        >
            <View style={styles.iconContainer}>
                <Text style={[styles.icon, !achievement.unlocked && styles.iconLocked]}>
                    {achievement.icon}
                </Text>
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
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${(achievement.progress / (achievement.target || 1)) * 100}%` }
                                ]}
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
                        Desbloqueado em {new Date(achievement.unlockedDate).toLocaleDateString('pt-BR')}
                    </Text>
                )}
            </View>
            {achievement.unlocked && (
                <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backText}>← Voltar</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerLabel}>CONQUISTAS</Text>
                        <Text style={styles.headerTitle}>Suas Medalhas</Text>
                    </View>

                    {/* Progress Summary */}
                    <View style={styles.summary}>
                        <Text style={styles.summaryNumber}>{unlockedCount}</Text>
                        <Text style={styles.summaryLabel}>de {totalCount} conquistas</Text>
                        <View style={styles.summaryProgress}>
                            <View
                                style={[
                                    styles.summaryProgressFill,
                                    { width: `${(unlockedCount / totalCount) * 100}%` }
                                ]}
                            />
                        </View>
                    </View>

                    {/* Unlocked Section */}
                    <Text style={styles.sectionTitle}>Desbloqueadas</Text>
                    {ACHIEVEMENTS.filter(a => a.unlocked).map(renderAchievement)}

                    {/* Locked Section */}
                    <Text style={styles.sectionTitle}>Em Progresso</Text>
                    {ACHIEVEMENTS.filter(a => !a.unlocked).map(renderAchievement)}
                </ScrollView>
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
        paddingBottom: theme.spacing[4],
    },
    backButton: {
        marginBottom: theme.spacing[3],
    },
    backText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
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

    // Summary
    summary: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingBottom: theme.spacing[8],
    },
    summaryNumber: {
        fontSize: theme.typography.size.displayLG,
        fontWeight: theme.typography.weight.black as any,
        color: theme.colors.brand.primary,
    },
    summaryLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing[4],
    },
    summaryProgress: {
        width: '100%',
        height: 8,
        backgroundColor: theme.colors.background.card,
        borderRadius: 4,
        overflow: 'hidden',
    },
    summaryProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 4,
    },

    // Section
    sectionTitle: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        paddingHorizontal: theme.spacing[6],
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[3],
    },

    // Achievement Card
    achievementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme.spacing[6],
        marginBottom: theme.spacing[3],
        padding: theme.spacing[4],
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    achievementLocked: {
        opacity: 0.6,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing[4],
    },
    icon: {
        fontSize: 24,
    },
    iconLocked: {
        opacity: 0.4,
    },
    achievementInfo: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    textLocked: {
        color: theme.colors.text.secondary,
    },
    achievementDescription: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
    },
    unlockedDate: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.success,
        marginTop: theme.spacing[2],
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing[2],
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 2,
        overflow: 'hidden',
        marginRight: theme.spacing[2],
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 2,
    },
    progressText: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: theme.typography.weight.bold as any,
    },
});
