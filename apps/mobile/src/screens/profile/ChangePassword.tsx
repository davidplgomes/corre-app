import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { Button, Input } from '../../components/common';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase/client';

type ChangePasswordProps = {
    navigation: any;
};

export const ChangePassword: React.FC<ChangePasswordProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!password || !confirmPassword) {
            Alert.alert(t('common.error'), t('errors.fillAllFields'));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t('common.error'), t('errors.passwordsDoNotMatch'));
            return;
        }

        if (password.length < 6) {
            Alert.alert(t('common.error'), t('errors.passwordTooShort'));
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            Alert.alert(t('common.success'), t('success.passwordUpdated'));
            navigation.goBack();
        } catch (error: any) {
            console.error('Error updating password:', error);
            Alert.alert(t('common.error'), error.message || t('errors.updatePassword'));
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
                    <Text style={styles.headerTitle}>{t('profile.changePassword')}</Text>
                    <View style={{ width: 60 }} />
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.formContainer}>
                        <Text style={styles.description}>
                            {t('auth.enterNewPasswordBelow')}
                        </Text>

                        <Input
                            label={t('auth.newPassword')}
                            value={password}
                            onChangeText={setPassword}
                            placeholder={t('auth.minSixCharacters')}
                            secureTextEntry
                        />

                        <View style={styles.spacer} />

                        <Input
                            label={t('auth.confirmPassword')}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t('auth.repeatNewPassword')}
                            secureTextEntry
                        />

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
    },
    description: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing[6],
        textAlign: 'center',
    },
    spacer: {
        height: theme.spacing[4],
    },
    spacerLarge: {
        height: theme.spacing[8],
    },
});
