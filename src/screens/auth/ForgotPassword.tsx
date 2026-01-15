import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input, ErrorMessage } from '../../components/common';
import { resetPassword } from '../../services/supabase/auth';
import { validateField } from '../../utils/validation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type ForgotPasswordScreenProps = {
    navigation: NativeStackNavigationProp<any>;
};

export const ForgotPassword: React.FC<ForgotPasswordScreenProps> = ({
    navigation,
}) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        // Clear previous errors
        setEmailError('');
        setError('');
        setSuccess(false);

        // Validate email
        const emailValidation = validateField('email', email);

        if (emailValidation) {
            setEmailError(emailValidation);
            return;
        }

        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || t('errors.unknownError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('auth.resetPassword')}</Text>
                        <Text style={styles.description}>
                            Enter your email address and we'll send you instructions to reset
                            your password.
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error && <ErrorMessage message={error} />}

                    {/* Success Message */}
                    {success && (
                        <View style={styles.successContainer}>
                            <Text style={styles.successIcon}>✅</Text>
                            <Text style={styles.successMessage}>
                                Password reset instructions have been sent to your email!
                            </Text>
                        </View>
                    )}

                    {/* Reset Password Form */}
                    {!success && (
                        <View style={styles.form}>
                            <Input
                                label={t('auth.email')}
                                placeholder={t('auth.emailPlaceholder')}
                                value={email}
                                onChangeText={setEmail}
                                error={emailError}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                textContentType="emailAddress"
                            />

                            <Button
                                title={t('auth.resetPassword')}
                                onPress={handleResetPassword}
                                loading={loading}
                                style={styles.resetButton}
                            />
                        </View>
                    )}

                    {/* Back to Login Link */}
                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.backText}>← {t('auth.login')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        marginBottom: 24,
    },
    resetButton: {
        marginTop: 8,
    },
    successContainer: {
        backgroundColor: '#D1FAE5',
        borderWidth: 1,
        borderColor: '#6EE7B7',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    successIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    successMessage: {
        fontSize: 16,
        color: '#065F46',
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
    },
    backText: {
        fontSize: 16,
        color: '#7C3AED',
        fontWeight: '600',
    },
});
