import React, { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Input, ErrorMessage } from '../../components/common';
import { theme } from '../../constants/theme';
import { AuthApi } from '../../api/endpoints/auth.api';
import { validateField } from '../../utils/validation';
import { Header } from '../../components/common/Header'; // Assuming a common Header component exists or I'll create one/use existing pattern

type ChangePasswordScreenProps = {
    navigation: any;
};

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Validation errors
    const [currentPasswordError, setCurrentPasswordError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const handleChangePassword = async () => {
        // Reset errors
        setError('');
        setCurrentPasswordError('');
        setNewPasswordError('');
        setConfirmPasswordError('');

        // Validate fields
        const currentPwdValidation = validateField('password', currentPassword);
        const newPwdValidation = validateField('password', newPassword);

        // Custom simple validation for demo/mvp if validateField is too strict or specific
        if (!currentPassword) setCurrentPasswordError(t('errors.required') || 'Required');
        if (newPwdValidation) setNewPasswordError(newPwdValidation);
        if (newPassword !== confirmPassword) {
            setConfirmPasswordError(t('errors.passwordMismatch') || 'Passwords do not match');
            return;
        }

        if (currentPwdValidation || newPwdValidation || !currentPassword || newPassword !== confirmPassword) {
            return;
        }

        setLoading(true);

        try {
            // Re-authenticate first to ensure security (optional but recommended)
            // For now, Supabase doesn't enforce re-auth for password updates if session is valid,
            // but we can try to sign in with current password to verify it.
            // However, that might invalidate the current session tokens in some configs.
            // We'll proceed with direct update for now as per plan.

            const response = await AuthApi.updateUser({ password: newPassword });

            if (response.error) {
                setError(response.error.message);
            } else {
                Alert.alert(
                    t('common.success'),
                    t('auth.passwordUpdated') || 'Password updated successfully',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (err: any) {
            setError(err.message || t('errors.unknownError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background.primary} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <Header
                        title={t('auth.changePassword') || "Change Password"}
                        onBack={() => navigation.goBack()}
                    />
                </View>

                <View style={styles.content}>
                    {error ? <ErrorMessage message={error} /> : null}

                    <Input
                        label={t('auth.currentPassword') || "Current Password"}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        error={currentPasswordError}
                        isPassword
                        autoCapitalize="none"
                        containerStyle={styles.inputSpacing}
                    />

                    <Input
                        label={t('auth.newPassword') || "New Password"}
                        placeholder="••••••••"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        error={newPasswordError}
                        isPassword
                        autoCapitalize="none"
                        containerStyle={styles.inputSpacing}
                    />

                    <Input
                        label={t('auth.confirmPassword') || "Confirm New Password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        error={confirmPasswordError}
                        isPassword
                        autoCapitalize="none"
                        containerStyle={styles.inputSpacing}
                    />

                    <Button
                        title={t('common.save') || "Update Password"}
                        onPress={handleChangePassword}
                        loading={loading}
                        variant="primary"
                        style={styles.button}
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
    },
    header: {
        marginBottom: theme.spacing[4],
    },
    content: {
        padding: theme.spacing[6],
    },
    inputSpacing: {
        marginBottom: theme.spacing[4],
    },
    button: {
        marginTop: theme.spacing[4],
    },
});
