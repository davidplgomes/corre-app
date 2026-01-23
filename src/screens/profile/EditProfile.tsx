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
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input } from '../../components/common';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase/client';
import { ChevronRightIcon } from '../../components/common/TabIcons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar, updateUserAvatarUrl } from '../../services/supabase/storage';
import * as Haptics from 'expo-haptics';

type EditProfileProps = {
    navigation: any;
};

export const EditProfile: React.FC<EditProfileProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { profile, refreshProfile } = useAuth();
    const [fullName, setFullName] = useState(profile?.fullName || '');
    const [neighborhood, setNeighborhood] = useState(profile?.neighborhood || '');
    const [city, setCity] = useState(profile?.city || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [instagramHandle, setInstagramHandle] = useState(profile?.instagramHandle || '');
    const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatarUrl || null);
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

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert(t('common.error'), t('errors.fillAllFields'));
            return;
        }

        setLoading(true);
        try {
            let newAvatarUrl = profile?.avatarUrl;

            // Upload avatar if changed (local URI starts with file://)
            if (avatarUri && avatarUri.startsWith('file://') && profile?.id) {
                setUploadingAvatar(true);
                try {
                    newAvatarUrl = await uploadAvatar(profile.id, avatarUri);
                    await updateUserAvatarUrl(profile.id, newAvatarUrl);
                } catch (avatarError) {
                    console.error('Avatar upload failed:', avatarError);
                    // Continue with other updates even if avatar fails
                } finally {
                    setUploadingAvatar(false);
                }
            }

            const { error } = await supabase
                .from('users')
                .update({
                    full_name: fullName,
                    neighborhood: neighborhood,
                    city: city,
                    bio: bio,
                    instagram_handle: instagramHandle,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile?.id);

            if (error) throw error;

            await refreshProfile();
            Alert.alert(t('common.success'), t('success.profileUpdated'));
            navigation.goBack();
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
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
                    {/* Placeholder for right side to balance header */}
                    <View style={{ width: 60 }} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.formContainer}>
                        {/* Avatar Picker */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity style={styles.avatarPicker} onPress={pickImage} disabled={uploadingAvatar}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>
                                            {fullName?.charAt(0)?.toUpperCase() || '?'}
                                        </Text>
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

                        <Input
                            label={t('auth.fullName')}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder={t('auth.fullNamePlaceholder')}
                            autoCapitalize="words"
                        />

                        <View style={styles.spacer} />

                        <Input
                            label={t('auth.neighborhood')}
                            value={neighborhood}
                            onChangeText={setNeighborhood}
                            placeholder={t('auth.selectNeighborhood')}
                        />

                        <View style={styles.spacer} />

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
                            maxLength={500}
                            // Custom style for multiline input if needed, usually Input supports it or we pass style
                            style={{ minHeight: 100, textAlignVertical: 'top' }}
                        />
                        <Text style={styles.charCount}>{bio.length}/500</Text>

                        <View style={styles.spacer} />

                        <Input
                            label={t('profile.instagram')}
                            value={instagramHandle}
                            onChangeText={(text) => setInstagramHandle(text.replace('@', ''))}
                            placeholder={t('profile.enterInstagram')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            leftIcon={<Text style={{ color: '#FFF', fontWeight: 'bold' }}>@</Text>}
                        />

                        {/* Future: Avatar Upload could go here */}

                        <View style={styles.spacerLarge} />

                        <Button
                            title={t('common.save')}
                            onPress={handleSave}
                            loading={loading}
                        />
                    </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    backButton: {
        paddingVertical: theme.spacing[2],
    },
    backText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
    },
    headerTitle: {
        fontSize: theme.typography.size.h4,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    content: {
        flex: 1,
    },
    formContainer: {
        padding: theme.spacing[6],
        paddingBottom: 120, // Extra padding for save button accessibility
    },
    spacer: {
        height: theme.spacing[4],
    },
    spacerLarge: {
        height: theme.spacing[8],
    },
    charCount: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        textAlign: 'right',
        marginTop: 4,
    },
    // Avatar Styles
    avatarSection: {
        alignItems: 'center',
        marginBottom: theme.spacing[6],
    },
    avatarPicker: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        position: 'relative',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
        borderRadius: 50,
    },
    avatarInitial: {
        fontSize: 40,
        fontWeight: '900' as any,
        color: theme.colors.brand.primary,
    },
    avatarLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarHint: {
        marginTop: theme.spacing[2],
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.tertiary,
    },
});
