import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Session, User } from '@services/supabase/client';
import { UserProfile } from '../types/user.types';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';

const TRUSTED_WEB_AUTH_HOST = 'corre-app-web.vercel.app';
const TRUSTED_SUPABASE_HOST_SUFFIX = '.supabase.co';

const isTrustedAuthRecoveryUrl = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl);
    const protocol = parsed.protocol.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (protocol === 'corre:') {
      const customTarget = `${host}${path}`.replace(/^\/+/, '');
      return customTarget === 'auth/reset' || path === '/auth/reset';
    }

    if (protocol !== 'https:' && protocol !== 'http:') {
      return false;
    }

    if (host === TRUSTED_WEB_AUTH_HOST && path === '/auth/reset') {
      return true;
    }

    if (host.endsWith(TRUSTED_SUPABASE_HOST_SUFFIX) && path === '/auth/v1/callback') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string, fullName: string, neighborhood: string, languagePreference?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Handle deep links for auth (password reset, etc.)
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!isTrustedAuthRecoveryUrl(url)) return;

      // Supabase sends auth tokens in URL hash for recovery links.
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (type !== 'recovery' || !accessToken || !refreshToken) return;

      if (__DEV__) {
        console.log('[Auth] Processing trusted password recovery deep link');
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('[Auth] Error setting session from deep link:', error);
      } else {
        setIsPasswordRecovery(true);
      }
    };

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for URL changes while app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (__DEV__) {
        console.log('[Auth] Auth state changed:', event);
      }
      setSession(session);
      setUser(session?.user ?? null);

      // Handle PASSWORD_RECOVERY event
      if (event === 'PASSWORD_RECOVERY') {
        if (__DEV__) {
          console.log('[Auth] Password recovery session detected');
        }
        setIsPasswordRecovery(true);
      }

      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          neighborhood: data.neighborhood,
          bio: data.bio,
          city: data.city,
          instagramHandle: data.instagram_handle,
          avatarUrl: data.avatar_url
            ? `${data.avatar_url}?t=${new Date().getTime()}`
            : null, // NEW
          membershipTier: data.membership_tier,
          currentMonthPoints: data.current_month_points,
          totalLifetimePoints: data.total_lifetime_points,
          languagePreference: data.language_preference,
          qrCodeSecret: data.qr_code_secret,
          isMerchant: data.is_merchant,
          onboardingCompleted: data.onboarding_completed ?? false,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, neighborhood: string, languagePreference: string = 'en') => {
    try {
      // Generate unique QR secret for user
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const qrCodeSecret = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            neighborhood,
            language_preference: languagePreference,
            qr_code_secret: qrCodeSecret,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isPasswordRecovery,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
