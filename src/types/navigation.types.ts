import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

// Root Navigator
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Auth Navigator
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  EventsTab: undefined;
  LeaderboardTab: undefined;
  LoyaltyTab: undefined;
  ProfileTab: undefined;
};

// Events Stack Navigator
export type EventsStackParamList = {
  EventList: undefined;
  EventDetail: { eventId: string };
  CreateEvent: undefined;
  CheckIn: { eventId: string };
};

// Loyalty Stack Navigator
export type LoyaltyStackParamList = {
  LoyaltyCard: undefined;
  MerchantScanner: undefined;
};

// Profile Stack Navigator
export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

// Navigation props types
export type RootNavigationProp = StackNavigationProp<RootStackParamList>;
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type EventsNavigationProp = StackNavigationProp<EventsStackParamList>;
export type LoyaltyNavigationProp = StackNavigationProp<LoyaltyStackParamList>;
export type ProfileNavigationProp = StackNavigationProp<ProfileStackParamList>;

// Route props types
export type EventDetailRouteProp = RouteProp<EventsStackParamList, 'EventDetail'>;
export type CheckInRouteProp = RouteProp<EventsStackParamList, 'CheckIn'>;

