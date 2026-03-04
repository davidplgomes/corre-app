import React, { useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar, Switch, Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';
import { BackButton, Button } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import {
    getNotificationPreference,
    getPrivacySetting,
    PrivacyVisibility,
    updateNotificationPreference,
    updatePrivacySettings,
} from '../../services/supabase/users';
import {
    connectStrava,
    disconnectStravaComplete,
    getStravaConnection,
    StravaConnection,
    triggerStravaSync,
} from '../../services/supabase/strava';
import {
    cancelAllNotifications,
    clearPushToken,
    registerForPushNotificationsAsync,
    savePushToken,
} from '../../services/notifications';

import AsyncStorage from '@react-native-async-storage/async-storage';

type SettingsProps = {
    navigation: any;
};

export const Settings: React.FC<SettingsProps> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const { profile } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [stravaConnection, setStravaConnection] = React.useState<StravaConnection | null>(null);
    const stravaConnected = !!stravaConnection;
    const [stravaLoading, setStravaLoading] = React.useState(false);
    const [stravaSyncing, setStravaSyncing] = React.useState(false);
    const [lastSyncedAt, setLastSyncedAt] = React.useState<string | null>(null);
    const [refreshing, setRefreshing] = React.useState(false);

    const [privacyVisibility, setPrivacyVisibility] = React.useState<PrivacyVisibility>('friends');

    React.useEffect(() => {
        loadSettings();
        if (profile?.id) {
            getPrivacySetting(profile.id).then(setPrivacyVisibility);
        }
    }, [profile?.id]);

    // Refresh Strava connection status when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            checkStravaConnection();
        }, [])
    );

    const checkStravaConnection = async () => {
        const connection = await getStravaConnection();
        setStravaConnection(connection);
    };

    const onRefresh = useCallback(async () => {
        if (!profile?.id) return;
        setRefreshing(true);
        try {
            await Promise.all([
                checkStravaConnection(),
                getPrivacySetting(profile.id).then(setPrivacyVisibility),
                getNotificationPreference(profile.id).then(setNotificationsEnabled),
            ]);
        } catch (error) {
            console.error('Error refreshing settings:', error);
        } finally {
            setRefreshing(false);
        }
    }, [profile?.id]);

    const handleManualStravaSync = async () => {
        if (!stravaConnected || stravaSyncing) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStravaSyncing(true);

        try {
            const result = await triggerStravaSync();

            if (!result.success) {
                Alert.alert(t('common.error'), result.error || t('strava.syncFailed', 'Failed to sync Strava activities'));
                return;
            }

            const activitiesSynced = result.activitiesSynced || 0;
            const pointsAwarded = result.pointsAwarded || 0;
            const xpAwarded = result.xpAwarded || 0;
            setLastSyncedAt(new Date().toISOString());

            if (activitiesSynced === 0) {
                Alert.alert(t('common.success'), t('strava.noNewActivities', 'No new activities found on Strava.'));
                return;
            }

            Alert.alert(
                t('common.success'),
                xpAwarded > 0
                    ? t('strava.syncSuccessWithPointsAndXp', {
                        count: activitiesSynced,
                        points: pointsAwarded,
                        xp: xpAwarded,
                        defaultValue: `${activitiesSynced} activities synced. You earned ${pointsAwarded} points and ${xpAwarded} XP.`,
                    })
                    : pointsAwarded > 0
                    ? t('strava.syncSuccessWithPoints', {
                        count: activitiesSynced,
                        points: pointsAwarded,
                        defaultValue: `${activitiesSynced} activities synced. You earned ${pointsAwarded} points.`,
                    })
                    : t('strava.syncSuccess', {
                        count: activitiesSynced,
                        defaultValue: `${activitiesSynced} activities synced successfully.`,
                    })
            );
        } catch (error) {
            console.error('Manual Strava sync error:', error);
            Alert.alert(t('common.error'), t('strava.syncFailed', 'Failed to sync Strava activities'));
        } finally {
            setStravaSyncing(false);
        }
    };

    const handleStravaToggle = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStravaLoading(true);

        try {
            if (stravaConnected) {
                Alert.alert(
                    t('settings.disconnectStrava', 'Disconnect Strava'),
                    t('settings.disconnectStravaConfirm', 'This will remove your Strava connection and delete synced activities. Continue?'),
                    [
                        { text: t('common.cancel'), style: 'cancel', onPress: () => setStravaLoading(false) },
                        {
                            text: t('common.disconnect', 'Disconnect'),
                            style: 'destructive',
                            onPress: async () => {
                                const success = await disconnectStravaComplete();
                                if (success) {
                                    setStravaConnection(null);
                                    Alert.alert(t('common.success'), t('settings.stravaDisconnected', 'Strava disconnected successfully'));
                                } else {
                                    Alert.alert(t('common.error'), t('settings.stravaDisconnectError', 'Failed to disconnect Strava'));
                                }
                                setStravaLoading(false);
                            }
                        }
                    ]
                );
            } else {
                const result = await connectStrava();
                if (result.success) {
                    await checkStravaConnection(); // Reload to capture the athlete name
                    Alert.alert(t('common.success'), t('settings.stravaConnected', 'Strava connected successfully! Your activities will sync automatically.'));
                } else {
                    Alert.alert(t('common.error'), result.error || t('settings.stravaConnectError', 'Failed to connect Strava'));
                }
                setStravaLoading(false);
            }
        } catch (error) {
            console.error('Strava toggle error:', error);
            setStravaLoading(false);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        }
    };

    const loadSettings = async () => {
        try {
            if (profile?.id) {
                const remoteEnabled = await getNotificationPreference(profile.id);
                setNotificationsEnabled(remoteEnabled);
                await AsyncStorage.setItem('@corre:notificationsEnabled', String(remoteEnabled));
                return;
            }

            const storedNotifications = await AsyncStorage.getItem('@corre:notificationsEnabled');


            if (storedNotifications !== null) {
                setNotificationsEnabled(storedNotifications === 'true');
            }

        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handlePrivacyChange = async (visibility: PrivacyVisibility) => {
        if (!profile?.id) return;
        Haptics.selectionAsync();
        try {
            await updatePrivacySettings(profile.id, visibility);
            setPrivacyVisibility(visibility);
            Alert.alert(t('common.success'), t('privacy.updated'));
        } catch (error) {
            Alert.alert(t('common.error'), t('errors.unknownError'));
        }
    };

    const changeLanguage = (lang: string) => {
        Haptics.selectionAsync();
        i18n.changeLanguage(lang);
    };

    const handleToggleNotifications = async (value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const previousValue = notificationsEnabled;
        setNotificationsEnabled(value);
        try {
            if (profile?.id) {
                await updateNotificationPreference(profile.id, value);
            }
            await AsyncStorage.setItem('@corre:notificationsEnabled', String(value));
            if (profile?.id) {
                if (value) {
                    const token = await registerForPushNotificationsAsync();
                    if (token) {
                        await savePushToken(profile.id, token);
                    }
                } else {
                    await Promise.all([
                        clearPushToken(profile.id),
                        cancelAllNotifications(),
                    ]);
                }
            }
        } catch (error) {
            console.error('Failed to save notifications setting:', error);
            setNotificationsEnabled(previousValue);
            Alert.alert(
                t('common.error'),
                t('settings.notificationsSaveError', 'Could not update notification settings. Please try again.')
            );
        }
    };



    const languages = [
        { code: 'pt', label: 'Português' },
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.brand.primary}
                            colors={[theme.colors.brand.primary]}
                        />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <BackButton
                            style={styles.backButton}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.goBack();
                            }}
                        />
                        <View>
                            <Text style={styles.headerLabel}>{t('settings.title').toUpperCase()}</Text>
                            <Text style={styles.headerTitle}>{t('settings.preferences').toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Notifications Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('settings.notifications', 'NOTIFICAÇÕES').toUpperCase()}</Text>
                        <View style={styles.settingCard}>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>{t('settings.enableNotifications')}</Text>
                                <Text style={styles.settingDescription}>
                                    {t('settings.notificationsDescription', 'Receber alertas de eventos e atividades')}
                                </Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={handleToggleNotifications}
                                trackColor={{ false: theme.colors.gray[600], true: theme.colors.brand.primary }}
                                thumbColor={theme.colors.white}
                            />
                        </View>
                    </View>



                    {/* Integrations Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('settings.connectedApps').toUpperCase()}</Text>
                        <TouchableOpacity
                            style={styles.settingCard}
                            onPress={handleStravaToggle}
                            disabled={stravaLoading}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Strava</Text>
                                <Text style={styles.settingDescription}>
                                    {stravaConnected
                                        ? t('settings.stravaConnectedStatusName', `Connected as ${stravaConnection?.athlete_name || 'Athlete'}\nTap to disconnect`)
                                        : t('settings.stravaDisconnectedStatus', 'Tap to connect your account')}
                                </Text>
                            </View>
                            {stravaLoading ? (
                                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                            ) : (
                                <View style={[
                                    styles.connectionBadge,
                                    stravaConnected && styles.connectionBadgeActive
                                ]}>
                                    <Text style={[
                                        styles.connectionBadgeText,
                                        stravaConnected && styles.connectionBadgeTextActive
                                    ]}>
                                        {stravaConnected ? t('common.connected', 'CONNECTED') : t('common.connect', 'CONNECT')}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {/* Strava Attribution - Required by Strava Brand Guidelines */}
                        <View style={styles.stravaAttribution}>
                            <Text style={styles.stravaAttributionText}>Powered by </Text>
                            <Text style={styles.stravaAttributionBrand}>Strava</Text>
                        </View>
                        {stravaConnected && (
                            <>
                                <Button
                                    title={stravaSyncing ? t('strava.syncing', 'Syncing...') : t('strava.syncNow', 'Sync Now')}
                                    onPress={handleManualStravaSync}
                                    loading={stravaSyncing}
                                    disabled={stravaLoading || stravaSyncing}
                                    size="small"
                                    style={styles.stravaSyncButton}
                                />
                                {lastSyncedAt && (
                                    <Text style={styles.stravaLastSync}>
                                        {t('strava.lastSync', 'Last synced')}: {new Date(lastSyncedAt).toLocaleString()}
                                    </Text>
                                )}
                            </>
                        )}
                    </View>

                    {/* Language Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('profile.language').toUpperCase()}</Text>
                        {languages.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={styles.languageOption}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <Text style={styles.languageLabel}>{lang.label}</Text>
                                {i18n.language === lang.code && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>


                    {/* Account Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('common.edit').toUpperCase()}</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('EditProfile');
                            }}
                        >
                            <Text style={styles.menuItemLabel}>{t('profile.editProfile')}</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('ChangePassword');
                            }}
                        >
                            <Text style={styles.menuItemLabel}>{t('profile.changePassword')}</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('ChangeEmail');
                            }}
                        >
                            <Text style={styles.menuItemLabel}>{t('profile.changeEmail')}</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <View style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>{t('settings.privacy')}</Text>
                        </View>
                        <View style={styles.privacyOptions}>
                            <TouchableOpacity
                                style={[styles.privacyOption, privacyVisibility === 'friends' && styles.privacyOptionActive]}
                                onPress={() => handlePrivacyChange('friends')}
                            >
                                <Text style={[styles.privacyOptionText, privacyVisibility === 'friends' && styles.privacyOptionTextActive]}>
                                    {t('privacy.friends')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.privacyOption, privacyVisibility === 'anyone' && styles.privacyOptionActive]}
                                onPress={() => handlePrivacyChange('anyone')}
                            >
                                <Text style={[styles.privacyOptionText, privacyVisibility === 'anyone' && styles.privacyOptionTextActive]}>
                                    {t('privacy.anyone')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.privacyOption, privacyVisibility === 'nobody' && styles.privacyOptionActive]}
                                onPress={() => handlePrivacyChange('nobody')}
                            >
                                <Text style={[styles.privacyOptionText, privacyVisibility === 'nobody' && styles.privacyOptionTextActive]}>
                                    {t('privacy.nobody')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Help & Support Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('settings.helpSupport', 'HELP & SUPPORT').toUpperCase()}</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                navigation.navigate('HelpSupport');
                            }}
                        >
                            <Text style={styles.menuItemLabel}>{t('settings.helpCenter', 'Help Center')}</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('settings.version').toUpperCase()}</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                Alert.alert(t('settings.termsOfUse'), 'Content protected by copyright.');
                            }}
                        >
                            <Text style={styles.menuItemLabel}>{t('settings.termsOfUse')}</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                Haptics.selectionAsync();
                                Alert.alert(t('settings.privacyPolicy'), 'Read our full policy on the website.');
                            }}
                        >
                            <Text style={styles.menuItemLabel}>{t('settings.privacyPolicy')}</Text>
                            <ChevronRightIcon size={20} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                        <View style={styles.menuItem}>
                            <Text style={styles.menuItemLabel}>{t('settings.version')}</Text>
                            <Text style={styles.versionText}>1.0.5</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View >
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 24,
    },
    backButton: {
        marginRight: theme.spacing[4],
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900' as any,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900' as any,
        fontStyle: 'italic',
        color: '#FFF',
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
        marginBottom: theme.spacing[3],
    },

    // Setting Card (with switch)
    settingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    settingInfo: {
        flex: 1,
        marginRight: theme.spacing[4],
    },
    settingLabel: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    settingDescription: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
    },

    // Language Option
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    languageLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        color: theme.colors.white,
        fontSize: 14,
        fontWeight: theme.typography.weight.bold as any,
    },

    // Menu Item
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    menuItemLabel: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
    },
    versionText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.tertiary,
    },
    connectionBadge: {
        backgroundColor: `${theme.colors.brand.primary}1A`, // 10% opacity orange
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${theme.colors.brand.primary}33`, // 20% opacity orange
    },
    connectionBadgeActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    connectionBadgeText: {
        fontSize: 10,
        fontWeight: '700' as const,
        color: theme.colors.brand.primary,
        letterSpacing: 0.5,
    },
    connectionBadgeTextActive: {
        color: '#000',
    },
    privacyOptions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    privacyOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    privacyOptionActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    privacyOptionText: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: theme.colors.text.tertiary,
    },
    privacyOptionTextActive: {
        color: '#FFF',
    },
    stravaAttribution: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
    stravaAttributionText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
    },
    stravaAttributionBrand: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FC4C02', // Strava orange
    },
    stravaSyncButton: {
        marginTop: 8,
    },
    stravaLastSync: {
        marginTop: 8,
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
    },
});
