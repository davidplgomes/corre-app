import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { BackButton } from '../../components/common';
import {
    archiveUserGoal,
    GoalProgress,
    GoalType,
    getGoalProgress,
    getUserGoals,
    goalTypeDefinitions,
    upsertUserGoal,
} from '../../services/supabase/goals';
import { useAuth } from '../../contexts/AuthContext';

type GoalsScreenProps = {
    navigation: any;
};

const GOAL_ORDER: GoalType[] = ['weekly_distance', 'weekly_runs', 'monthly_distance', 'streak'];

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [goals, setGoals] = useState<GoalProgress[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<GoalType>('weekly_distance');
    const [targetInput, setTargetInput] = useState('20');
    const [customTitle, setCustomTitle] = useState('');

    const usedGoalTypes = useMemo(() => new Set(goals.map((goal) => goal.goal_type)), [goals]);

    const loadGoals = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const userGoals = await getUserGoals(user.id);
            const goalProgress = await getGoalProgress(user.id, userGoals);

            const sorted = [...goalProgress].sort((a, b) => {
                const aIndex = GOAL_ORDER.indexOf(a.goal_type);
                const bIndex = GOAL_ORDER.indexOf(b.goal_type);
                return aIndex - bIndex;
            });

            setGoals(sorted);
        } catch (error) {
            console.error('Error loading goals:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, t]);

    useFocusEffect(
        useCallback(() => {
            loadGoals();
        }, [loadGoals])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        loadGoals();
    }, [loadGoals]);

    const openCreateModal = () => {
        const defaultType = GOAL_ORDER.find((type) => !usedGoalTypes.has(type)) || 'weekly_distance';
        const def = goalTypeDefinitions[defaultType];

        setEditingGoalId(null);
        setSelectedType(defaultType);
        setTargetInput('20');
        setCustomTitle(def.title);
        setShowModal(true);
    };

    const openEditModal = (goal: GoalProgress) => {
        setEditingGoalId(goal.id);
        setSelectedType(goal.goal_type);
        setTargetInput(String(goal.target_value));
        setCustomTitle(goal.title);
        setShowModal(true);
    };

    const handleSaveGoal = async () => {
        if (!user?.id || saving) return;

        const target = Number(targetInput.replace(',', '.'));
        if (!Number.isFinite(target) || target <= 0) {
            Alert.alert(t('common.error'), t('validation.invalidNumber', 'Enter a valid target value.'));
            return;
        }

        if (!editingGoalId && usedGoalTypes.has(selectedType)) {
            Alert.alert(t('common.error'), t('goals.typeAlreadyExists', 'You already have this goal type. Edit it instead.'));
            return;
        }

        setSaving(true);
        try {
            await upsertUserGoal(user.id, selectedType, target, customTitle.trim());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowModal(false);
            await loadGoals();
        } catch (error: any) {
            console.error('Error saving goal:', error);
            Alert.alert(t('common.error'), error?.message || t('errors.unknownError'));
        } finally {
            setSaving(false);
        }
    };

    const handleArchiveGoal = (goal: GoalProgress) => {
        if (!user?.id) return;

        Alert.alert(
            t('goals.removeGoal', 'Remove goal?'),
            t('goals.removeGoalDescription', 'This goal will be removed from your profile.'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.remove', 'Remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await archiveUserGoal(goal.id, user.id);
                            await loadGoals();
                        } catch (error) {
                            console.error('Error removing goal:', error);
                            Alert.alert(t('common.error'), t('errors.unknownError'));
                        }
                    },
                },
            ]
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
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <BackButton
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    navigation.goBack();
                                }}
                            />
                            <View style={styles.headerTitles}>
                                <Text style={styles.headerLabel}>{t('profile.your', 'YOUR')}</Text>
                                <Text style={styles.headerTitle}>{t('goals.title', 'GOALS')}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                            <Text style={styles.addButtonText}>{t('goals.addGoal', 'ADD')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
                    >
                        {goals.length === 0 ? (
                            <BlurView intensity={20} tint="dark" style={styles.emptyCard}>
                                <Text style={styles.emptyTitle}>{t('goals.emptyTitle', 'No goals yet')}</Text>
                                <Text style={styles.emptySubtitle}>
                                    {t('goals.emptySubtitle', 'Create your first goal and track it from Strava activity sync.')}
                                </Text>
                                <TouchableOpacity style={styles.primaryButton} onPress={openCreateModal}>
                                    <Text style={styles.primaryButtonText}>{t('goals.createFirst', 'CREATE FIRST GOAL')}</Text>
                                </TouchableOpacity>
                            </BlurView>
                        ) : (
                            goals.map((goal) => {
                                const def = goalTypeDefinitions[goal.goal_type];
                                const progressLabel = goal.goal_type.includes('distance')
                                    ? `${goal.current_value.toFixed(1)} / ${Number(goal.target_value).toFixed(1)} ${goal.unit}`
                                    : `${Math.round(goal.current_value)} / ${Math.round(Number(goal.target_value))} ${goal.unit}`;

                                return (
                                    <BlurView key={goal.id} intensity={25} tint="dark" style={styles.goalCard}>
                                        <View style={styles.goalHeader}>
                                            <View style={styles.goalHeaderLeft}>
                                                <Text style={styles.goalEmoji}>{def.emoji}</Text>
                                                <View>
                                                    <Text style={styles.goalTitle}>{goal.title}</Text>
                                                    <Text style={styles.goalProgressLabel}>{progressLabel}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.goalPercent}>{Math.round(goal.progress_percent)}%</Text>
                                        </View>

                                        <View style={styles.progressTrack}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${goal.progress_percent}%`,
                                                        backgroundColor: goal.completed
                                                            ? theme.colors.success
                                                            : theme.colors.brand.primary,
                                                    },
                                                ]}
                                            />
                                        </View>

                                        <View style={styles.goalActions}>
                                            <TouchableOpacity onPress={() => openEditModal(goal)}>
                                                <Text style={styles.goalActionText}>{t('common.edit')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleArchiveGoal(goal)}>
                                                <Text style={[styles.goalActionText, styles.goalActionDanger]}>
                                                    {t('common.remove', 'Remove')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </BlurView>
                                );
                            })
                        )}
                    </ScrollView>
                </SafeAreaView>
            </ImageBackground>

            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>
                            {editingGoalId ? t('goals.editGoal', 'Edit Goal') : t('goals.newGoal', 'New Goal')}
                        </Text>

                        <Text style={styles.modalLabel}>{t('goals.goalType', 'Goal Type')}</Text>
                        <View style={styles.typeGrid}>
                            {GOAL_ORDER.map((type) => {
                                const def = goalTypeDefinitions[type];
                                const blocked = editingGoalId
                                    ? type !== selectedType
                                    : usedGoalTypes.has(type) && type !== selectedType;
                                return (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.typeButton,
                                            selectedType === type && styles.typeButtonActive,
                                            blocked && styles.typeButtonDisabled,
                                        ]}
                                        disabled={blocked}
                                        onPress={() => {
                                            setSelectedType(type);
                                            if (!customTitle.trim()) {
                                                setCustomTitle(def.title);
                                            }
                                        }}
                                    >
                                        <Text style={styles.typeButtonText}>{def.emoji} {def.title}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.modalLabel}>{t('goals.goalName', 'Goal Name')}</Text>
                        <TextInput
                            style={styles.input}
                            value={customTitle}
                            onChangeText={setCustomTitle}
                            placeholder={goalTypeDefinitions[selectedType].title}
                            placeholderTextColor="rgba(255,255,255,0.4)"
                        />

                        <Text style={styles.modalLabel}>{t('goals.targetValue', 'Target Value')}</Text>
                        <TextInput
                            style={styles.input}
                            value={targetInput}
                            onChangeText={setTargetInput}
                            keyboardType="decimal-pad"
                            placeholder="20"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowModal(false)}>
                                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={handleSaveGoal} disabled={saving}>
                                <Text style={styles.modalSaveText}>
                                    {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    addButton: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
        backgroundColor: `${theme.colors.brand.primary}1F`,
    },
    addButtonText: {
        color: theme.colors.brand.primary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
        gap: 12,
    },
    emptyCard: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 20,
        marginBottom: 16,
    },
    primaryButton: {
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1,
    },
    goalCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    goalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    goalEmoji: {
        fontSize: 24,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    goalProgressLabel: {
        marginTop: 2,
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
    goalPercent: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    progressFill: {
        height: 6,
        borderRadius: 3,
    },
    goalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        marginTop: 12,
    },
    goalActionText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    goalActionDanger: {
        color: '#EF4444',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#0E0E0E',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 12,
    },
    modalLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
        marginTop: 8,
    },
    typeGrid: {
        gap: 8,
        marginBottom: 6,
    },
    typeButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    typeButtonActive: {
        borderColor: theme.colors.brand.primary,
        backgroundColor: `${theme.colors.brand.primary}24`,
    },
    typeButtonDisabled: {
        opacity: 0.45,
    },
    typeButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    input: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        color: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 14,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 20,
    },
    modalCancel: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 11,
        paddingHorizontal: 16,
    },
    modalCancelText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
    modalSave: {
        borderRadius: 10,
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 11,
        paddingHorizontal: 18,
    },
    modalSaveText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 13,
    },
});

export default GoalsScreen;
