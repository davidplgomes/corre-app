import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventList } from '../screens/events/EventList';
import { EventDetail } from '../screens/events/EventDetail';
import { CheckIn } from '../screens/events/CheckIn';
import { CreateEvent } from '../screens/events/CreateEvent';
import { Leaderboard } from '../screens/leaderboard/Leaderboard';
import { LoyaltyCard } from '../screens/loyalty/LoyaltyCard';
import { MerchantScanner } from '../screens/loyalty/MerchantScanner';
import { Profile } from '../screens/profile/Profile';
import { Settings } from '../screens/profile/Settings';
import { RunHistory } from '../screens/profile/RunHistory';
import { Achievements } from '../screens/profile/Achievements';
import { RunMap } from '../screens/profile/RunMap';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { ProductDetail } from '../screens/marketplace/ProductDetail';
import { CalendarIcon, TrophyIcon, CardIcon, PersonIcon, ShoppingBagIcon } from '../components/common/TabIcons';
import { theme } from '../constants/theme';

// Stack param lists
export type EventsStackParamList = {
    EventList: undefined;
    EventDetail: { eventId: string };
    CheckIn: { eventId: string; event: any };
    CreateEvent: undefined;
};

export type LoyaltyStackParamList = {
    LoyaltyCard: undefined;
    MerchantScanner: undefined;
};

export type MarketplaceStackParamList = {
    MarketplaceMain: undefined;
    ProductDetail: { product: any };
};

export type ProfileStackParamList = {
    ProfileMain: undefined;
    Settings: undefined;
    RunHistory: undefined;
    Achievements: undefined;
    RunMap: undefined;
};

export type MainTabParamList = {
    Events: undefined;
    Leaderboard: undefined;
    Marketplace: undefined;
    Loyalty: undefined;
    Profile: undefined;
};

// Stacks
const EventsStack = createStackNavigator<EventsStackParamList>();
const LoyaltyStack = createStackNavigator<LoyaltyStackParamList>();
const MarketplaceStack = createStackNavigator<MarketplaceStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Events Stack Navigator
const EventsStackNavigator: React.FC = () => (
    <EventsStack.Navigator screenOptions={{ headerShown: false }}>
        <EventsStack.Screen name="EventList" component={EventList} />
        <EventsStack.Screen name="EventDetail" component={EventDetail} />
        <EventsStack.Screen name="CheckIn" component={CheckIn} />
        <EventsStack.Screen name="CreateEvent" component={CreateEvent} />
    </EventsStack.Navigator>
);

// Loyalty Stack Navigator
const LoyaltyStackNavigator: React.FC = () => (
    <LoyaltyStack.Navigator screenOptions={{ headerShown: false }}>
        <LoyaltyStack.Screen name="LoyaltyCard" component={LoyaltyCard} />
        <LoyaltyStack.Screen name="MerchantScanner" component={MerchantScanner} />
    </LoyaltyStack.Navigator>
);

// Marketplace Stack Navigator
const MarketplaceStackNavigator: React.FC = () => (
    <MarketplaceStack.Navigator screenOptions={{ headerShown: false }}>
        <MarketplaceStack.Screen name="MarketplaceMain" component={MarketplaceScreen} />
        <MarketplaceStack.Screen name="ProductDetail" component={ProductDetail} />
    </MarketplaceStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator: React.FC = () => (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
        <ProfileStack.Screen name="ProfileMain" component={Profile} />
        <ProfileStack.Screen name="Settings" component={Settings} />
        <ProfileStack.Screen name="RunHistory" component={RunHistory} />
        <ProfileStack.Screen name="Achievements" component={Achievements} />
        <ProfileStack.Screen name="RunMap" component={RunMap} />
    </ProfileStack.Navigator>
);

// Tab Icon Component
interface TabIconProps {
    label: string;
    icon: 'calendar' | 'trophy' | 'card' | 'person' | 'bag';
    focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ label, icon, focused }) => {
    const color = focused ? theme.colors.brand.primary : theme.colors.text.tertiary;
    const iconSize = 22;

    const renderIcon = () => {
        switch (icon) {
            case 'calendar':
                return <CalendarIcon size={iconSize} color={color} filled={focused} />;
            case 'trophy':
                return <TrophyIcon size={iconSize} color={color} filled={focused} />;
            case 'card':
                return <CardIcon size={iconSize} color={color} filled={focused} />;
            case 'person':
                return <PersonIcon size={iconSize} color={color} filled={focused} />;
            case 'bag':
                return <ShoppingBagIcon size={iconSize} color={color} filled={focused} />;
        }
    };

    return (
        <View style={styles.tabItem}>
            {renderIcon()}
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {label}
            </Text>
            {focused && <View style={styles.activeDot} />}
        </View>
    );
};

export const TabNavigator: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 64 + insets.bottom,
                        paddingBottom: insets.bottom,
                    }
                ],
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="Events"
                component={EventsStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Eventos" icon="calendar" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Leaderboard"
                component={Leaderboard}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Ranking" icon="trophy" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Marketplace"
                component={MarketplaceStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Loja" icon="bag" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Loyalty"
                component={LoyaltyStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Cartão" icon="card" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Perfil" icon="person" focused={focused} />
                    ),
                }}
            />
        </Tab.Navigator >
    );
};

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.background.elevated,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.default,
        paddingTop: theme.spacing[3],
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing[1],
        minWidth: 50,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: theme.typography.weight.medium as any,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
    },
    tabLabelActive: {
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.semibold as any,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.brand.primary,
        marginTop: theme.spacing[1],
    },
});
