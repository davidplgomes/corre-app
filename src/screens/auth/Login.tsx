import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Input, ErrorMessage } from '../../components/common';
import { Screen } from '../../components/common/Screen';
import { GoogleIcon, AppleIcon } from '../../components/auth/AuthIcons';
import { signIn } from '../../services/supabase/auth';
import { validateField } from '../../utils/validation';
import type { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

type LoginScreenProps = {
    navigation: StackNavigationProp<any>;
};

export const Login: React.FC<LoginScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setEmailError('');
        setPasswordError('');
        setError('');

        const emailValidation = validateField('email', email);
        const passwordValidation = validateField('password', password);

        if (emailValidation) {
            setEmailError(emailValidation);
            return;
        }

        if (passwordValidation) {
            setPasswordError(passwordValidation);
            return;
        }

        setLoading(true);

        try {
            await signIn(email, password);
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
            <View style={styles.header}>
                <Image
                    source={require('../../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>CORRE</Text>
                <Text style={styles.tagline}>Run together, grow together</Text>
            </View>

            <View style={styles.formContainer}>
                {error && <ErrorMessage message={error} />}

                <Input
                    label="Email"
                    placeholder="your@email.com"
                    value={email}
                    onChangeText={setEmail}
                    error={emailError}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    containerStyle={styles.inputSpacing}
                />

                <Input
                    label="Password"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    error={passwordError}
                    isPassword
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                    containerStyle={styles.inputSpacing}
                />

                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotButton}
                >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                <Button
                    title={loading ? 'Signing in...' : 'Sign In'}
                    onPress={handleLogin}
                    loading={loading}
                    variant="primary"
                    size="large"
                    fullWidth
                    style={styles.loginButton}
                />

                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                    <TouchableOpacity style={[styles.socialButton, styles.appleButton]}>
                        <AppleIcon size={20} color="#FFFFFF" />
                        <Text style={styles.appleButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
                        <GoogleIcon size={20} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                        <Text style={styles.signUpText}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.primary[600],
    },
    gradientBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        top: -100,
        right: -100,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        top: 150,
        left: -80,
    },
    decorativeCircle3: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        bottom: 100,
        right: -50,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[12],
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing[12],
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: theme.spacing[4],
    },
    title: {
        fontSize: theme.typography.size.displayMD,
        fontWeight: '900', // Black weight
        fontStyle: 'italic', // Speed aesthetic
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
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: -theme.spacing[2],
        marginBottom: theme.spacing[6],
    },
    forgotText: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.semibold as any,
    },
    loginButton: {
        marginBottom: theme.spacing[8],
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing[6],
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border.default,
    },
    dividerText: {
        paddingHorizontal: theme.spacing[4],
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: theme.typography.letterSpacing.wider,
    },
    socialButtons: {
        gap: theme.spacing[3],
        marginBottom: theme.spacing[8],
    },
    socialButton: {
        flexDirection: 'row',
        height: 50,
        borderRadius: theme.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing[3],
        borderWidth: 1,
    },
    appleButton: {
        backgroundColor: '#000000',
        borderColor: theme.colors.border.default,
    },
    appleButtonText: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: '#FFFFFF',
    },
    googleButton: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
    },
    googleButtonText: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: '#000000',
    },
    socialIcon: {
        fontSize: 24,
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
    signUpText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.bold as any,
    },
});
