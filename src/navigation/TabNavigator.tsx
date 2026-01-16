import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { EventList } from '../screens/events/EventList';
import { EventDetail } from '../screens/events/EventDetail';
import { CheckIn } from '../screens/events/CheckIn';
import { CreateEvent } from '../screens/events/CreateEvent';
import { EventParticipants } from '../screens/events/EventParticipants'; // New Import
import { FeedScreen } from '../screens/feed/FeedScreen';
import { Leaderboard } from '../screens/leaderboard/Leaderboard';
import { LoyaltyCard } from '../screens/loyalty/LoyaltyCard';
import { MerchantScanner } from '../screens/loyalty/MerchantScanner';
import { Profile } from '../screens/profile/Profile';
import { Settings } from '../screens/profile/Settings';
import { EditProfile } from '../screens/profile/EditProfile';
import { ChangePassword } from '../screens/profile/ChangePassword'; // New Import
import { RunHistory } from '../screens/profile/RunHistory';
import { Achievements } from '../screens/profile/Achievements';
import { RunMap } from '../screens/profile/RunMap';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { ProductDetail } from '../screens/marketplace/ProductDetail';
import { HomeScreen } from '../screens/home/HomeScreen'; // Import HomeScreen
import { CalendarIcon, TrophyIcon, CardIcon, PersonIcon, ShoppingBagIcon, FeedIcon, HomeIcon } from '../components/common/TabIcons'; // Import HomeIcon
import { theme } from '../constants/theme';

// Stack param lists
export type EventsStackParamList = {
    EventList: undefined;
    EventDetail: { eventId: string };
    CheckIn: { eventId: string; event: any };
    CreateEvent: undefined;
    EventParticipants: { eventId: string; eventTitle: string };
};

export type FeedStackParamList = {
    FeedMain: undefined;
    Leaderboard: undefined;
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
    EditProfile: undefined;
    ChangePassword: undefined;
    RunHistory: undefined;
    Achievements: undefined;
    RunMap: undefined;
};

export type MainTabParamList = {
    Home: undefined; // New Tab
    Events: undefined;
    Feed: undefined;
    Marketplace: undefined;
    Loyalty: undefined;
    Profile: undefined;
};

// Stacks
const EventsStack = createStackNavigator<EventsStackParamList>();
const FeedStack = createStackNavigator<FeedStackParamList>();
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
        <EventsStack.Screen name="EventParticipants" component={EventParticipants} />
    </EventsStack.Navigator>
);

// Feed Stack Navigator
const FeedStackNavigator: React.FC = () => (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
        <FeedStack.Screen name="FeedMain" component={FeedScreen} />
        <FeedStack.Screen name="Leaderboard" component={Leaderboard} />
    </FeedStack.Navigator>
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
        <ProfileStack.Screen name="EditProfile" component={EditProfile} />
        <ProfileStack.Screen name="ChangePassword" component={ChangePassword} />
        <ProfileStack.Screen name="RunHistory" component={RunHistory} />
        <ProfileStack.Screen name="Achievements" component={Achievements} />
        <ProfileStack.Screen name="RunMap" component={RunMap} />
    </ProfileStack.Navigator>
);

// Tab Icon Component
interface TabIconProps {
    label: string;
    icon: 'home' | 'calendar' | 'trophy' | 'card' | 'person' | 'bag' | 'feed';
    focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ label, icon, focused }) => {
    // Change active color to White for B&W aesthetic
    const color = focused ? theme.colors.white : theme.colors.text.tertiary;
    const iconSize = 24; // Increased slightly for better visibility

    const renderIcon = () => {
        switch (icon) {
            case 'home':
                return <HomeIcon size={iconSize} color={color} filled={focused} />;
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
            case 'feed':
                return <FeedIcon size={iconSize} color={color} filled={focused} />;
        }
    };

    return (
        <View style={styles.tabItem}>
            {renderIcon()}
            {/* Added container to prevent text shift */}
            <View style={styles.labelContainer}>
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                    {label}
                </Text>
            </View>
        </View>
    );
};

export const TabNavigator: React.FC = () => {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        height: 80 + insets.bottom, // Fixed height to accommodate content
                        paddingBottom: insets.bottom,
                    }
                ],
                tabBarBackground: () => (
                    Platform.OS === 'ios' ? (
                        <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]} />
                    )
                ),
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Início" icon="home" focused={focused} />
                    ),
                }}
            />
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
                name="Feed"
                component={FeedStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label="Social" icon="feed" focused={focused} />
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
        backgroundColor: 'transparent',
        borderTopWidth: 0, // Removed border for cleaner look
        elevation: 0,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        height: 60, // Fixed height for item
        width: 60,
    },
    labelContainer: {
        marginTop: 4,
        height: 14, // Fixed height for label
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: theme.colors.text.tertiary,
    },
    tabLabelActive: {
        color: theme.colors.white,
        fontWeight: '600',
    },
    activeDot: {
        position: 'absolute',
        top: 6, // Top aligned dot? Or bottom?
        // Let's place it very subtly at the top or bottom.
        // Actually, many minimal apps don't have a dot if the icon fills.
        // Let's remove the Dot layout shift by making it absolute bottom
        bottom: 0,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.white,
    },
});
