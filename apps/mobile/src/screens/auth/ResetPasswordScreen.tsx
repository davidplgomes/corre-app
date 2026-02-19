import React, { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Input, ErrorMessage } from '../../components/common';
import { theme } from '../../constants/theme';
import { AuthApi } from '../../api/endpoints/auth.api';
import { validateField } from '../../utils/validation';

type ResetPasswordScreenProps = {
    navigation: any;
    route: any; // To get query params if using deep linking parsing or react-navigation params
};

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    // In a real deep link scenario with Supabase, the session is often automatically recovered
    // if the link includes the access_token (implicit flow) or code (PKCE).
    // If Supabase client initializes correctly with the URL, `supabase.auth.onAuthStateChange`
    // would fire a PASSWORD_RECOVERY event.
    // However, for this screen we assume the user is "authenticated" via that link mechanism 
    // or we are just providing the UI to input the new password to complete the flow.
    // The `AuthApi.updateUser` call works if the session was established by the link.

    const handleResetPassword = async () => {
        setError('');
        setNewPasswordError('');
        setConfirmPasswordError('');

        const newPwdValidation = validateField('password', newPassword);

        if (newPwdValidation) setNewPasswordError(newPwdValidation);
        if (newPassword !== confirmPassword) {
            setConfirmPasswordError(t('errors.passwordMismatch') || 'Passwords do not match');
            return;
        }

        if (newPwdValidation || newPassword !== confirmPassword) {
            return;
        }

        setLoading(true);

        try {
            const response = await AuthApi.updateUser({ password: newPassword });

            if (response.error) {
                setError(response.error.message);
            } else {
                Alert.alert(
                    t('common.success'),
                    t('auth.passwordResetSuccess') || 'Your password has been reset successfully.',
                    [{
                        text: 'Login',
                        onPress: () => {
                            // If we are logged in (session restored), we might want to go Home,
                            // or if we want to force re-login, we sign out.
                            // Usually with Supabase reset flow, you are logged in.
                            // Let's navigate to Home or fallback to Login.
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }], // Assuming 'Home' is the main app entry
                            });
                        }
                    }]
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
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={styles.content}>
                    <Text style={styles.title}>{t('auth.resetPassword') || "Reset Password"}</Text>
                    <Text style={styles.subtitle}>
                        {t('auth.resetPasswordSubtitle') || "Enter your new password below."}
                    </Text>

                    {error ? <ErrorMessage message={error} /> : null}

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
                        title={t('auth.setNewPassword') || "Set New Password"}
                        onPress={handleResetPassword}
                        loading={loading}
                        variant="primary"
                        style={styles.button}
                        fullWidth
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
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
    },
    content: {
        padding: theme.spacing[6],
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: theme.typography.size.h3,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[2],
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing[8],
    },
    inputSpacing: {
        marginBottom: theme.spacing[4],
    },
    button: {
        marginTop: theme.spacing[4],
    },
});
