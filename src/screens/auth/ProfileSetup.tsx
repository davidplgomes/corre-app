import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ScrollView,
    Image,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/common';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase/client';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar, updateUserAvatarUrl } from '../../services/supabase/storage';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type ProfileSetupProps = {
    navigation: any;
};

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { profile, refreshProfile } = useAuth();
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        Haptics.selectionAsync();

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('errors.permissionRequired'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            // 1. Upload Avatar if selected
            let newAvatarUrl = profile?.avatarUrl;
            if (avatarUri && avatarUri.startsWith('file://') && profile?.id) {
                setUploadingAvatar(true);
                try {
                    newAvatarUrl = await uploadAvatar(profile.id, avatarUri);
                    await updateUserAvatarUrl(profile.id, newAvatarUrl);
                } catch (avatarError) {
                    console.error('Avatar upload failed:', avatarError);
                } finally {
                    setUploadingAvatar(false);
                }
            }

            // 2. Update Profile Data
            const updates: any = {
                updated_at: new Date().toISOString(),
            };
            if (bio) updates.bio = bio;
            if (city) updates.city = city;

            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', profile?.id);

            if (error) throw error;

            await refreshProfile();

            // 3. Mark Onboarding as Complete
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');

            // 4. Navigate to Home
            // Note: Since we are in a stack that might be reset, we rely on RootNavigator to re-render 
            // but calling replace logic or resetting navigation might be needed depending on implementation.
            // For now, we assume this screen is part of a flow that leads back to Root.
            // Best approach: Force a re-render of RootNavigator or navigate to an Authorized state if possible.
            // However, since RootNavigator watches `hasSeenOnboarding`, adjusting it should trigger re-render if state is lifted or context is used.
            // But `hasSeenOnboarding` is local state in RootNavigator. We might need a Context or a restart.
            // Simpler approach for this step: Just navigate to a known route if possible, or reload.
            // Actually, since RootNavigator is parent, and we changed AsyncStorage, we need to let it know? 
            // Valid strategy: navigation.replace('TabNavigator') if it was a valid route, but it's conditioned.
            // We will address the RootNavigator state update in the next step.

            // Temporary: Just try to navigate to "Main" or reset.
            // In the new flow, we will likely expose a method or context to update onboarding status.

            // For now, just set storage and let's assume we implement a re-check mechanism or Context.
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }], // Placeholder, will fix in RootNavigator
            });

        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert(t('common.error'), t('errors.updateProfile'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Setup Profile</Text>
                    <Text style={styles.headerSubtitle}>Let's get to know you better</Text>
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarPicker} onPress={pickImage} disabled={uploadingAvatar}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <View style={styles.iconContainer}>
                                        <Text style={styles.iconText}>+</Text>
                                    </View>
                                </View>
                            )}
                            {uploadingAvatar && (
                                <View style={styles.avatarLoading}>
                                    <ActivityIndicator color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>{t('profile.tapToChange')}</Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label={t('profile.city')}
                            value={city}
                            onChangeText={setCity}
                            placeholder={t('profile.enterCity')}
                        />
                        <View style={styles.spacer} />
                        <Input
                            label={t('profile.bio')}
                            value={bio}
                            onChangeText={setBio}
                            placeholder={t('profile.enterBio')}
                            multiline
                            numberOfLines={4}
                            style={{ minHeight: 100, textAlignVertical: 'top' }}
                        />
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        title="Finish"
                        onPress={handleFinish}
                        loading={loading}
                    />
                </View>
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
        padding: 24,
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarPicker: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.background.elevated,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 24,
        color: theme.colors.brand.primary,
        fontWeight: 'bold',
    },
    avatarLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarHint: {
        marginTop: 12,
        color: theme.colors.text.tertiary,
        fontSize: 14,
    },
    form: {
        marginBottom: 24,
    },
    spacer: {
        height: 16,
    },
    footer: {
        marginTop: 'auto',
    },
});
