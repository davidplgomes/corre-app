import { MembershipTier } from '@constants/tiers';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  neighborhood: string | null;
  bio: string | null;
  city: string | null;
  instagramHandle: string | null;
  avatarUrl: string | null; // NEW: Profile picture URL
  membershipTier: MembershipTier;
  currentMonthPoints: number;
  totalLifetimePoints: number;
  // NEW: Gamification fields
  current_xp?: number;
  total_xp?: number;
  current_points?: number;
  level?: number;
  languagePreference: 'en' | 'pt' | 'es';
  qrCodeSecret: string;
  isMerchant: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser extends SupabaseUser {
  profile?: UserProfile;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  neighborhood: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  fullName?: string;
  neighborhood?: string;
  languagePreference?: 'en' | 'pt' | 'es';
}
