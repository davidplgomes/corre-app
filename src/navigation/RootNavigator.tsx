import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/common';

export const RootNavigator: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner text="Loading..." />;
    }

    return (
        <NavigationContainer>
            {user ? <TabNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};
