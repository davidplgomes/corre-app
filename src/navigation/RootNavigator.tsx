import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../constants/theme';

const APP_VERSION = 'v1.0.2';

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

export const RootNavigator: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <SplashScreen />;
    }

    return (
        <NavigationContainer>
            {user ? <TabNavigator /> : <AuthNavigator />}
        </NavigationContainer>
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
