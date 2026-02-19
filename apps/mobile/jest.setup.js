// Mock the global Expo runtime to prevent "import outside scope" errors
// This is needed for Expo SDK 54+
global.__ExpoImportMetaRegistry = {
    get: () => undefined,
};

// Mock AsyncStorage
import '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock expo core module
jest.mock('expo', () => ({
    registerRootComponent: jest.fn(),
}));

// Mock Expo modules with proper implementations
jest.mock('expo-font', () => ({
    loadAsync: jest.fn().mockResolvedValue(true),
    isLoaded: jest.fn().mockReturnValue(true),
    isLoading: jest.fn().mockReturnValue(false),
    useFonts: jest.fn().mockReturnValue([true, null]),
}));

jest.mock('expo-asset', () => ({
    Asset: {
        loadAsync: jest.fn().mockResolvedValue([]),
        fromModule: jest.fn().mockReturnValue({ downloadAsync: jest.fn() }),
    },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn().mockResolvedValue(null),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
    setStringAsync: jest.fn().mockResolvedValue(true),
    getStringAsync: jest.fn().mockResolvedValue(''),
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
    BlurView: ({ children }) => children,
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
    default: {
        expoConfig: { extra: {} },
        manifest: { extra: {} },
    },
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
    locale: 'en-US',
    locales: ['en-US'],
    getLocales: () => [{ languageTag: 'en-US', languageCode: 'en' }],
}));

// Mock Stripe
jest.mock('@stripe/stripe-react-native', () => ({
    StripeProvider: ({ children }) => children,
    CardField: () => null,
    useStripe: () => ({
        initPaymentSheet: jest.fn().mockResolvedValue({}),
        presentPaymentSheet: jest.fn().mockResolvedValue({}),
        confirmPayment: jest.fn().mockResolvedValue({ error: null }),
    }),
}));

// Mock PostHog
jest.mock('posthog-react-native', () => ({
    usePostHog: () => ({
        capture: jest.fn(),
    }),
    PostHogProvider: ({ children }) => children,
    default: jest.fn(),
}));

// Mock Firebase Analytics
jest.mock('@react-native-firebase/analytics', () => {
    return () => ({
        logEvent: jest.fn(),
        logScreenView: jest.fn(),
        setUserId: jest.fn(),
    });
});

// Mock Reanimated
jest.mock('react-native-reanimated', () => ({
    default: {
        call: () => { },
    },
}));

// Mock Vector Icons
jest.mock('@expo/vector-icons', () => {
    const { View } = require('react-native');
    return {
        Ionicons: View,
        MaterialIcons: View,
        FontAwesome: View,
    };
});

// Mock Navigation
jest.mock('@react-navigation/native', () => {
    return {
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: jest.fn(),
            dispatch: jest.fn(),
        }),
        useFocusEffect: jest.fn(),
    };
});
