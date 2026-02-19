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
import { UsersApi } from '../../api/endpoints/users.api';
import { Header } from '../../components/common/Header';
import * as ImagePicker from 'expo-image-picker';
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
            if (avatarUri && avatarUri.startsWith('file://')) {
                setUploadingAvatar(true);
                try {
                    const uploadResponse = await UsersApi.uploadAvatar(avatarUri);
                    if (uploadResponse.data) {
                        newAvatarUrl = uploadResponse.data.publicUrl;
                    }
                } catch (avatarError) {
                    console.error('Avatar upload failed:', avatarError);
                    // Continue with other updates even if avatar fails
                } finally {
                    setUploadingAvatar(false);
                }
            }

            if (!profile?.id) throw new Error(t('errors.userNotFound'));

            const response = await UsersApi.updateProfile(profile.id, {
                fullName: fullName,
                neighborhood: neighborhood,
                city: city,
                bio: bio,
                instagramHandle: instagramHandle,
                avatarUrl: newAvatarUrl, // Update avatar URL in profile if changed
            });

            if (response.error) {
                throw new Error(response.error.message);
            }

            await refreshProfile();
            Alert.alert(t('common.success'), t('success.profileUpdated'));
            navigation.goBack();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Alert.alert(t('common.error'), error.message || t('errors.updateProfile'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <Header title={t('profile.editProfile')} onBack={() => navigation.goBack()} />

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
                            containerStyle={styles.inputSpacing}
                        />

                        <Input
                            label={t('auth.neighborhood')}
                            value={neighborhood}
                            onChangeText={setNeighborhood}
                            placeholder={t('auth.selectNeighborhood')}
                            containerStyle={styles.inputSpacing}
                        />

                        <Input
                            label={t('profile.city')}
                            value={city}
                            onChangeText={setCity}
                            placeholder={t('profile.enterCity')}
                            containerStyle={styles.inputSpacing}
                        />

                        <Input
                            label={t('profile.bio')}
                            value={bio}
                            onChangeText={setBio}
                            placeholder={t('profile.enterBio')}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            style={{ minHeight: 100, textAlignVertical: 'top' }}
                            containerStyle={styles.inputSpacing}
                        />
                        <Text style={styles.charCount}>{bio.length}/500</Text>

                        <Input
                            label={t('profile.instagram')}
                            value={instagramHandle}
                            onChangeText={(text) => setInstagramHandle(text.replace('@', ''))}
                            placeholder={t('profile.enterInstagram')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            leftIcon={<Text style={{ color: '#FFF', fontWeight: 'bold' }}>@</Text>}
                            containerStyle={styles.inputSpacing}
                        />

                        <View style={styles.divider} />

                        <Text style={styles.sectionTitle}>{t('auth.security') || "Security"}</Text>

                        <TouchableOpacity
                            style={styles.securityButton}
                            onPress={() => navigation.navigate('ChangePassword')}
                        >
                            <Text style={styles.securityButtonText}>{t('auth.changePassword') || "Change Password"}</Text>
                            <Text style={styles.chevron}>→</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.securityButton}
                            onPress={() => navigation.navigate('ChangeEmail')}
                        >
                            <Text style={styles.securityButtonText}>{t('auth.changeEmail') || "Change Email"}</Text>
                            <Text style={styles.chevron}>→</Text>
                        </TouchableOpacity>

                        <View style={styles.spacerLarge} />

                        <Button
                            title={t('common.save')}
                            onPress={handleSave}
                            loading={loading}
                            variant="primary"
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
    content: {
        flex: 1,
    },
    formContainer: {
        padding: theme.spacing[6],
        paddingBottom: 120,
    },
    inputSpacing: {
        marginBottom: theme.spacing[4],
    },
    spacerLarge: {
        height: theme.spacing[8],
    },
    charCount: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: theme.spacing[4],
    },
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
        fontWeight: '900',
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
    divider: {
        height: 1,
        backgroundColor: theme.colors.border.default,
        marginVertical: theme.spacing[6],
    },
    sectionTitle: {
        fontSize: theme.typography.size.h5,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[4],
    },
    securityButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    securityButtonText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.primary,
    },
    chevron: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.tertiary,
    },
});
