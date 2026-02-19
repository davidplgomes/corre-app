import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import './src/services/i18n';  // Initialize i18n

import { StripeProvider } from '@stripe/stripe-react-native';
import { CONFIG } from './src/constants/config';

import { ChatwootWidgetContainer } from './src/components/support/ChatwootWidgetContainer';
import { migrateAuthTokensToSecureStore } from './src/services/supabase/tokenMigration';

export default function App() {
  // Run one-time security migration on app startup
  useEffect(() => {
    migrateAuthTokensToSecureStore();
  }, []);

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={CONFIG.stripe.publishableKey}
        merchantIdentifier="merchant.com.corre" // Optional, for Apple Pay
      >
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <ChatwootWidgetContainer />
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
