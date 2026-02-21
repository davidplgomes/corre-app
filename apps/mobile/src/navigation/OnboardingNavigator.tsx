import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Onboarding, ProfileSetup, StravaConnect } from '../screens/auth';
import { theme } from '../constants/theme';

export type OnboardingStackParamList = {
    Onboarding: undefined;
    ProfileSetup: undefined;
    StravaConnect: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
    return (
        <Stack.Navigator
            initialRouteName="Onboarding"
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: theme.colors.background.primary },
            }}
        >
            <Stack.Screen name="Onboarding" component={Onboarding} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetup} />
            <Stack.Screen name="StravaConnect" component={StravaConnect} />
        </Stack.Navigator>
    );
};
