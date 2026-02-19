import React, { createContext, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../constants/theme';

const APP_VERSION = 'v1.0.5';

// ─── Onboarding Context ───────────────────────────────────
// Allows ProfileSetup to signal onboarding completion,
// triggering a re-render that swaps OnboardingNavigator → TabNavigator.

interface OnboardingContextType {
    completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
    const ctx = useContext(OnboardingContext);
    if (!ctx) throw new Error('useOnboarding must be used within RootNavigator');
    return ctx;
};

// ─── Splash ────────────────────────────────────────────────

const SplashScreen = () => (
    <View style={styles.splashContainer}>
        <View style={styles.logoContainer}>
            <Image
                source={require('../../assets/logo_transparent.png')}
                style={styles.logo}
                resizeMode="contain"
            />
            <ActivityIndicator
                size="large"
                color={theme.colors.brand.primary}
                style={styles.spinner}
            />
        </View>
        <Text style={styles.versionText}>CORRE APP {APP_VERSION}</Text>
    </View>
);

// ─── Root Navigator ────────────────────────────────────────

export const RootNavigator: React.FC = () => {
    const { user, loading, profile } = useAuth();
    const [hasCompletedProfile, setHasCompletedProfile] = React.useState(false);
    const [profileChecked, setProfileChecked] = React.useState(false);

    React.useEffect(() => {
        if (loading) {
            // Auth still loading — reset so we don't show stale state
            setProfileChecked(false);
            return;
        }

        if (!user) {
            // No user, no need to check profile
            setProfileChecked(true);
            setHasCompletedProfile(false);
            return;
        }

        if (!profile) {
            // User exists but profile hasn't loaded yet — keep waiting
            return;
        }

        // Both user and profile are available — check onboarding
        const isComplete = !!(profile.fullName || profile.city);
        setHasCompletedProfile(isComplete);
        setProfileChecked(true);
    }, [user, profile, loading]);

    const completeOnboarding = useCallback(async () => {
        // No need to set AsyncStorage anymore - we check database profile
        setHasCompletedProfile(true); // triggers re-render → TabNavigator
    }, []);

    if (loading || !profileChecked) {
        return <SplashScreen />;
    }

    return (
        <OnboardingContext.Provider value={{ completeOnboarding }}>
            <NavigationContainer>
                {!user ? (
                    <AuthNavigator />
                ) : !hasCompletedProfile ? (
                    <OnboardingNavigator />
                ) : (
                    <TabNavigator />
                )}
            </NavigationContainer>
        </OnboardingContext.Provider>
    );
};

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 200,
        height: 200,
    },
    spinner: {
        marginTop: 30,
    },
    versionText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 1,
        marginBottom: 50,
    },
});
