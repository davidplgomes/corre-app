import React, { createContext, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../constants/theme';
import { supabase } from '../services/supabase/client';

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
    const { user, loading, profile, refreshProfile } = useAuth();
    const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState(false);
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
            setHasCompletedOnboarding(false);
            return;
        }

        if (!profile) {
            // User exists but profile hasn't loaded yet — keep waiting
            return;
        }

        // Both user and profile are available — check onboarding_completed field
        setHasCompletedOnboarding(profile.onboardingCompleted === true);
        setProfileChecked(true);
    }, [user, profile, loading]);

    const completeOnboarding = useCallback(async () => {
        if (!user) return;

        try {
            // Update database to mark onboarding as completed
            await supabase
                .from('users')
                .update({ onboarding_completed: true })
                .eq('id', user.id);

            // Refresh profile to get updated state
            await refreshProfile();

            // Trigger re-render → TabNavigator
            setHasCompletedOnboarding(true);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            // Still navigate even if save fails
            setHasCompletedOnboarding(true);
        }
    }, [user, refreshProfile]);

    if (loading || !profileChecked) {
        return <SplashScreen />;
    }

    return (
        <OnboardingContext.Provider value={{ completeOnboarding }}>
            <NavigationContainer>
                {!user ? (
                    <AuthNavigator />
                ) : !hasCompletedOnboarding ? (
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
