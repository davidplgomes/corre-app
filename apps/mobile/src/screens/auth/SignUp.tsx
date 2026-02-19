import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input, ErrorMessage, ShakeView, ShakeViewRef, BackButton } from '../../components/common';
import { Screen } from '../../components/common/Screen';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { validateField } from '../../utils/validation';
import type { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../constants/theme';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

type SignUpScreenProps = {
    navigation: StackNavigationProp<any>;
};

export const SignUp: React.FC<SignUpScreenProps> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [fullNameError, setFullNameError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Shake animation refs
    const fullNameShakeRef = useRef<ShakeViewRef>(null);
    const emailShakeRef = useRef<ShakeViewRef>(null);
    const passwordShakeRef = useRef<ShakeViewRef>(null);

    const handleSignUp = async () => {
        setEmailError('');
        setPasswordError('');
        setFullNameError('');
        setError('');

        const emailValidation = validateField('email', email);
        const passwordValidation = validateField('password', password);
        const fullNameValidation = validateField('fullName', fullName);

        if (fullNameValidation) {
            setFullNameError(fullNameValidation);
            fullNameShakeRef.current?.shake();
            return;
        }

        if (emailValidation) {
            setEmailError(emailValidation);
            emailShakeRef.current?.shake();
            return;
        }

        if (passwordValidation) {
            setPasswordError(passwordValidation);
            passwordShakeRef.current?.shake();
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, fullName, neighborhood || 'Porto', i18n.language);
        } catch (err: any) {
            setError(err.message || t('errors.unknownError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen
            preset="scroll"
            safeAreaEdges={['top', 'bottom']}
            contentContainerStyle={styles.scrollContent}
            backgroundColor={theme.colors.background.primary}
            statusBarStyle="light-content"
        >
            <Animated.View
                entering={FadeInDown.duration(800).springify()}
                style={styles.container}
            >
                <View style={styles.header}>
                    <BackButton onPress={() => {
                        Haptics.selectionAsync();
                        navigation.goBack();
                    }} />
                    <View style={styles.headerContent}>
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>{t('auth.joinCorre', 'Join Corre')}</Text>
                        <Text style={styles.tagline}>{t('auth.startJourney', 'Start your running journey today')}</Text>
                    </View>
                </View>

                <View style={styles.formContainer}>
                    {error && <ErrorMessage message={error} />}

                    <ShakeView ref={fullNameShakeRef}>
                        <Input
                            label={t('auth.fullName', 'Full Name')}
                            placeholder={t('auth.fullNamePlaceholder', 'John Doe')}
                            value={fullName}
                            onChangeText={setFullName}
                            error={fullNameError}
                            autoCapitalize="words"
                            autoComplete="name"
                            textContentType="name"
                            containerStyle={styles.inputSpacing}
                        />
                    </ShakeView>

                    <ShakeView ref={emailShakeRef}>
                        <Input
                            label={t('auth.email', 'Email')}
                            placeholder={t('auth.emailPlaceholder', 'your@email.com')}
                            value={email}
                            onChangeText={setEmail}
                            error={emailError}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            textContentType="emailAddress"
                            containerStyle={styles.inputSpacing}
                        />
                    </ShakeView>

                    <ShakeView ref={passwordShakeRef}>
                        <Input
                            label={t('auth.password', 'Password')}
                            placeholder={t('auth.passwordPlaceholder', 'Min. 8 characters')}
                            value={password}
                            onChangeText={setPassword}
                            error={passwordError}
                            isPassword
                            autoCapitalize="none"
                            autoComplete="password-new"
                            textContentType="newPassword"
                            containerStyle={styles.inputSpacing}
                        />
                    </ShakeView>

                    <Input
                        label={t('auth.neighborhood', 'Neighborhood (optional)')}
                        placeholder={t('auth.neighborhoodPlaceholder', 'Ex: Ribeira, Cedofeita...')}
                        value={neighborhood}
                        onChangeText={setNeighborhood}
                        autoCapitalize="words"
                        containerStyle={styles.inputSpacing}
                    />

                    <Button
                        title={loading ? t('auth.creatingAccount', 'Creating Account...') : t('auth.createAccount', 'Create Account')}
                        onPress={handleSignUp}
                        loading={loading}
                        variant="primary"
                        size="large"
                        fullWidth
                        style={styles.signUpButton}
                    />

                    <Text style={styles.termsText}>
                        {t('auth.bySigningUp', 'By signing up, you agree to our')}{' '}
                        <Text style={styles.termsLink}>{t('settings.termsOfUse', 'Terms of Service')}</Text>
                        {' '}{t('common.and', 'and')}{' '}
                        <Text style={styles.termsLink}>{t('settings.privacyPolicy', 'Privacy Policy')}</Text>
                    </Text>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t('auth.alreadyHaveAccount', 'Already have an account?')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginText}>{t('auth.signIn', 'Sign In')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing[6],
        paddingBottom: theme.spacing[8],
    },
    header: {
        marginBottom: theme.spacing[8],
        marginTop: theme.spacing[4],
    },
    headerContent: {
        alignItems: 'center',
    },
    logo: {
        width: 60,
        height: 60,
        marginBottom: theme.spacing[4],
    },
    title: {
        fontSize: theme.typography.size.displaySM,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.text.primary,
        letterSpacing: -1,
        marginBottom: theme.spacing[2],
        textTransform: 'uppercase',
    },
    tagline: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.wide,
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
    },
    inputSpacing: {
        marginBottom: theme.spacing[4],
    },
    signUpButton: {
        marginTop: theme.spacing[4],
        marginBottom: theme.spacing[6],
    },
    termsText: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        textAlign: 'center',
        marginBottom: theme.spacing[8],
        lineHeight: 18,
    },
    termsLink: {
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.semibold as any,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing[2],
    },
    footerText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.text.secondary,
    },
    loginText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.bold as any,
    },
});
