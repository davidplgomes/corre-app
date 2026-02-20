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
import { EventParticipants } from '../screens/events/EventParticipants';
import { FeedScreen } from '../screens/feed/FeedScreen';
import { PostDetails } from '../screens/feed/PostDetails';
import { Leaderboard } from '../screens/leaderboard/Leaderboard';
import { LoyaltyCard } from '../screens/loyalty/LoyaltyCard';
import { MerchantScanner } from '../screens/loyalty/MerchantScanner';
import { Coupons } from '../screens/loyalty/Coupons';
import { Profile } from '../screens/profile/Profile';
import { Settings } from '../screens/profile/Settings';
import { EditProfile } from '../screens/profile/EditProfile';
import { ChangePasswordScreen, ChangeEmailScreen } from '../screens/auth';
import { SubscriptionScreen } from '../screens/profile/SubscriptionScreen';
import { RunHistory } from '../screens/profile/RunHistory';
import { Achievements } from '../screens/profile/Achievements';
import { RunMap } from '../screens/profile/RunMap';
import { Friends } from '../screens/profile/Friends';
import { UserProfile } from '../screens/profile/UserProfile';
import { GuestPassScreen } from '../screens/profile/GuestPassScreen';
import { WelcomeKitScreen } from '../screens/profile/WelcomeKitScreen';
import { RunTracker } from '../screens/runs/RunTracker';
import { MarketplaceScreen } from '../screens/marketplace/MarketplaceScreen';
import { ProductDetail } from '../screens/marketplace/ProductDetail';
import { CreateListing } from '../screens/marketplace/CreateListing';
import { SellerOnboarding } from '../screens/marketplace/SellerOnboarding';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { CartScreen, CheckoutScreen, OrderHistoryScreen, OrderDetailScreen } from '../screens/shop';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { EventWaitlistScreen } from '../screens/events/EventWaitlistScreen';
import { PartnerCouponScreen } from '../screens/loyalty/PartnerCouponScreen';
import { ReferralScreen } from '../screens/referral/ReferralScreen';
import { CalendarIcon, TrophyIcon, CardIcon, PersonIcon, ShoppingBagIcon, FeedIcon, HomeIcon } from '../components/common/TabIcons';
import { useTranslation } from 'react-i18next';
import { theme } from '../constants/theme';

// Stack param lists
export type EventsStackParamList = {
    EventList: undefined;
    EventDetail: { eventId: string };
    CheckIn: { eventId: string; event: any };
    CreateEvent: undefined;
    EventParticipants: { eventId: string; eventTitle: string };
    UserProfile: { userId: string };
    EventWaitlist: undefined;
};

export type FeedStackParamList = {
    FeedMain: undefined;
    Leaderboard: { from?: string } | undefined;
    PostDetails: { postId: string; post?: any };
    UserProfile: { userId: string };
};

export type LoyaltyStackParamList = {
    LoyaltyCard: undefined;
    MerchantScanner: undefined;
    Coupons: undefined;
    PartnerCoupons: { partnerId?: string };
};

export type MarketplaceStackParamList = {
    MarketplaceMain: undefined;
    ProductDetail: { product: any; type: 'shop' | 'community' };
    CreateListing: undefined;
    SellerOnboarding: undefined;
    Cart: undefined;
    Checkout: { cartItems: any[]; subtotal: number; pointsToUse: number; total: number };
    OrderHistory: undefined;
    OrderDetail: { orderId: string };
};

export type ProfileStackParamList = {
    ProfileMain: undefined;
    Settings: undefined;
    EditProfile: undefined;
    ChangePassword: undefined;
    ChangeEmail: undefined;
    RunHistory: undefined;
    RunTracker: undefined;
    Achievements: undefined;
    RunMap: undefined;
    Friends: undefined;
    UserProfile: { userId: string };
    SubscriptionScreen: undefined;
    Wallet: undefined;
    Notifications: undefined;
    GuestPass: undefined;
    WelcomeKit: undefined;
    Referral: undefined;
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
        <EventsStack.Screen name="UserProfile" component={UserProfile} />
        <EventsStack.Screen name="EventWaitlist" component={EventWaitlistScreen} />
    </EventsStack.Navigator>
);

// Feed Stack Navigator
const FeedStackNavigator: React.FC = () => (
    <FeedStack.Navigator screenOptions={{ headerShown: false }}>
        <FeedStack.Screen name="FeedMain" component={FeedScreen} />
        <FeedStack.Screen name="Leaderboard" component={Leaderboard} />
        <FeedStack.Screen name="PostDetails" component={PostDetails} />
        <FeedStack.Screen name="UserProfile" component={UserProfile} />
    </FeedStack.Navigator>
);

// Loyalty Stack Navigator
const LoyaltyStackNavigator: React.FC = () => (
    <LoyaltyStack.Navigator screenOptions={{ headerShown: false }}>
        <LoyaltyStack.Screen name="LoyaltyCard" component={LoyaltyCard} />
        <LoyaltyStack.Screen name="MerchantScanner" component={MerchantScanner} />
        <LoyaltyStack.Screen name="Coupons" component={Coupons} />
        <LoyaltyStack.Screen name="PartnerCoupons" component={PartnerCouponScreen} />
    </LoyaltyStack.Navigator>
);

// Marketplace Stack Navigator
const MarketplaceStackNavigator: React.FC = () => (
    <MarketplaceStack.Navigator screenOptions={{ headerShown: false }}>
        <MarketplaceStack.Screen name="MarketplaceMain" component={MarketplaceScreen} />
        <MarketplaceStack.Screen name="ProductDetail" component={ProductDetail} />
        <MarketplaceStack.Screen name="CreateListing" component={CreateListing} />
        <MarketplaceStack.Screen name="SellerOnboarding" component={SellerOnboarding} />
        <MarketplaceStack.Screen name="Cart" component={CartScreen} />
        <MarketplaceStack.Screen name="Checkout" component={CheckoutScreen} />
        <MarketplaceStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <MarketplaceStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </MarketplaceStack.Navigator>
);

// Profile Stack Navigator
const ProfileStackNavigator: React.FC = () => (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
        <ProfileStack.Screen name="ProfileMain" component={Profile} />
        <ProfileStack.Screen name="Settings" component={Settings} />
        <ProfileStack.Screen name="EditProfile" component={EditProfile} />
        <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <ProfileStack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
        <ProfileStack.Screen name="RunHistory" component={RunHistory} />
        <ProfileStack.Screen name="RunTracker" component={RunTracker} />
        <ProfileStack.Screen name="Achievements" component={Achievements} />
        <ProfileStack.Screen name="RunMap" component={RunMap} />
        <ProfileStack.Screen name="Friends" component={Friends} />
        <ProfileStack.Screen name="UserProfile" component={UserProfile} />
        <ProfileStack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
        <ProfileStack.Screen name="Wallet" component={WalletScreen} />
        <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
        <ProfileStack.Screen name="GuestPass" component={GuestPassScreen} />
        <ProfileStack.Screen name="WelcomeKit" component={WelcomeKitScreen} />
        <ProfileStack.Screen name="Referral" component={ReferralScreen} />
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
    const { t } = useTranslation();

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
                        <TabIcon label={t('navigation.home')} icon="home" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Events"
                component={EventsStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label={t('navigation.events')} icon="calendar" focused={focused} />
                    ),
                }}
                listeners={({ navigation }) => ({
                    tabPress: () => {
                        navigation.navigate('Events', { screen: 'EventList' });
                    },
                })}
            />
            <Tab.Screen
                name="Feed"
                component={FeedStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label={t('navigation.feed')} icon="feed" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Marketplace"
                component={MarketplaceStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label={t('navigation.shop')} icon="bag" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Loyalty"
                component={LoyaltyStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label={t('navigation.loyalty')} icon="card" focused={focused} />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileStackNavigator}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon label={t('navigation.profile')} icon="person" focused={focused} />
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
