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
import { ChevronRightIcon, TrophyIcon, RunIcon, SunriseIcon, MedalIcon, PartyIcon, CompassIcon } from '../../components/common/TabIcons';
import { getAllAchievements, getUserAchievements, Achievement as AchievementType } from '../../services/supabase/achievements';
import { useAuth } from '../../contexts/AuthContext';

type AchievementsProps = {
    navigation: any;
};

interface Achievement extends AchievementType {
    unlocked: boolean;
    unlockedDate?: string; // Mapped from earned_at
    progress?: number;
    target?: number;
}



export const Achievements: React.FC<AchievementsProps> = ({ navigation }) => {
    const { t } = useTranslation();

    const [achievements, setAchievements] = React.useState<Achievement[]>([]);
    const [loading, setLoading] = React.useState(true);

    const { profile: user } = useAuth();

    React.useEffect(() => {
        if (user?.id) loadAchievements();
    }, [user]);

    const loadAchievements = async () => {
        if (!user?.id) return;
        try {
            const all = await getAllAchievements();
            const unlocked = await getUserAchievements(user.id);
            const unlockedIds = new Set(unlocked.map(u => u.id));

            // Merge
            const merged = all.map(a => {
                const isUnlocked = unlockedIds.has(a.id);
                const userAchievement = unlocked.find(u => u.id === a.id);
                return {
                    ...a,
                    unlocked: isUnlocked,
                    unlockedDate: userAchievement?.earned_at
                };
            });
            setAchievements(merged);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;

    const renderAchievement = (achievement: Achievement) => {
        let IconComponent = TrophyIcon;
        // Map codes/icons to components (same as UserProfile)
        switch (achievement.icon) {
            case 'run': case '👟': IconComponent = RunIcon; break;
            case 'sunrise': case '🌅': IconComponent = SunriseIcon; break;
            case 'medal': case 'medalha': case '🥇': case '🏃': IconComponent = MedalIcon; break;
            case 'party': case '🎉': IconComponent = PartyIcon; break;
            case 'compass': case '📍': IconComponent = CompassIcon; break;
            default: IconComponent = TrophyIcon;
        }

        return (
            <View
                key={achievement.id}
                style={[styles.achievementCard, !achievement.unlocked && styles.achievementLocked]}
            >
                <View style={[styles.iconContainer, achievement.unlocked && styles.iconContainerUnlocked]}>
                    <IconComponent size={24} color={achievement.unlocked ? theme.colors.brand.primary : '#FFF'} />
                </View>
                <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementTitle, !achievement.unlocked && styles.textLocked]}>
                        {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>

                    {/* Unlocked date */}
                    {achievement.unlocked && achievement.unlockedDate && (
                        <Text style={styles.unlockedDate}>
                            ✓ {new Date(achievement.unlockedDate).toLocaleDateString('pt-BR')}
                        </Text>
                    )}
                </View>
            </View>
        )
    };

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
