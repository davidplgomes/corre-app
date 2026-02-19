import React, { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Input, ErrorMessage } from '../../components/common';
import { theme } from '../../constants/theme';
import { AuthApi } from '../../api/endpoints/auth.api';
import { validateField } from '../../utils/validation';
import { Header } from '../../components/common/Header';

type ChangeEmailScreenProps = {
    navigation: any;
};

export const ChangeEmailScreen: React.FC<ChangeEmailScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');

    const handleChangeEmail = async () => {
        setError('');
        setEmailError('');

        const validation = validateField('email', newEmail);
        if (validation) {
            setEmailError(validation);
            return;
        }

        setLoading(true);

        try {
            const response = await AuthApi.updateUser({ email: newEmail });

            if (response.error) {
                setError(response.error.message);
            } else {
                Alert.alert(
                    t('common.checkInbox') || 'Check your inbox',
                    t('auth.emailUpdateConfirmation') || 'Confirmation links have been sent to both your old and new email addresses. Please click both to complete the change.',
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
                        title={t('auth.changeEmail') || "Change Email"}
                        onBack={() => navigation.goBack()}
                    />
                </View>

                <View style={styles.content}>
                    <Text style={styles.infoText}>
                        {t('auth.changeEmailInfo') || "To change your email address, enter the new address below. You will need to confirm the change via links sent to both your current and new email addresses."}
                    </Text>

                    {error ? <ErrorMessage message={error} /> : null}

                    <Input
                        label={t('auth.newEmail') || "New Email Address"}
                        placeholder="new@email.com"
                        value={newEmail}
                        onChangeText={setNewEmail}
                        error={emailError}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        containerStyle={styles.inputSpacing}
                    />

                    <Button
                        title={t('common.sendConfirmation') || "Send Confirmation"}
                        onPress={handleChangeEmail}
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
    infoText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing[6],
        lineHeight: 22,
    },
    inputSpacing: {
        marginBottom: theme.spacing[4],
    },
    button: {
        marginTop: theme.spacing[4],
    },
});
