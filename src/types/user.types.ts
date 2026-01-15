import { MembershipTier } from '@constants/tiers';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  neighborhood: string | null;
  membershipTier: MembershipTier;
  currentMonthPoints: number;
  totalLifetimePoints: number;
  languagePreference: 'en' | 'pt' | 'es';
  qrCodeSecret: string;
  isMerchant: boolean;
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
