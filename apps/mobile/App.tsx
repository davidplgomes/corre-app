import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { initI18n } from './src/services/i18n';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { CONFIG } from './src/constants/config';
import { ChatwootWidgetContainer } from './src/components/support/ChatwootWidgetContainer';
import { migrateAuthTokensToSecureStore } from './src/services/supabase/tokenMigration';
import * as Linking from 'expo-linking';

// Simple Error Boundary to catch crashes
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FF3B30' }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>App Crashed</Text>
          <Text style={{ color: 'white', textAlign: 'center' }}>{this.state.error?.message || 'Unknown error'}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Wrapper that conditionally applies StripeProvider only if configured
const AppContent: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  if (CONFIG.stripe.enabled && CONFIG.stripe.publishableKey) {
    return (
      <StripeProvider
        publishableKey={CONFIG.stripe.publishableKey}
        merchantIdentifier="merchant.com.corre"
      >
        <StripeDeepLinkHandler />
        {children}
      </StripeProvider>
    );
  }
  // Stripe not configured - render without provider
  return children;
};

const StripeDeepLinkHandler: React.FC = () => {
  const { handleURLCallback } = useStripe();

  useEffect(() => {
    const processUrl = async (url: string | null) => {
      if (!url) return;
      try {
        await handleURLCallback(url);
      } catch (error) {
        console.error('[Stripe] Failed to process URL callback:', error);
      }
    };

    Linking.getInitialURL().then(processUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      processUrl(url);
    });

    return () => subscription.remove();
  }, [handleURLCallback]);

  return null;
};

export default function App() {
  const [isI18nReady, setI18nReady] = useState(false);

  // Run one-time security migration on app startup
  useEffect(() => {
    console.log('[App] Starting initialization...');
    console.log('[App] Supabase enabled:', CONFIG.supabase.enabled);
    console.log('[App] Stripe enabled:', CONFIG.stripe.enabled);

    migrateAuthTokensToSecureStore();

    // Initialize i18n safely without blocking startup
    initI18n()
      .then(() => {
        console.log('[App] i18n initialized');
        setI18nReady(true);
      })
      .catch(err => {
        console.error('[App] Failed to init i18n:', err);
        setI18nReady(true);
      });
  }, []);

  if (!isI18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppContent>
          <View style={{ flex: 1 }}>
            <AuthProvider>
              <StatusBar style="auto" />
              <RootNavigator />
              <ChatwootWidgetContainer />
            </AuthProvider>
          </View>
        </AppContent>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
