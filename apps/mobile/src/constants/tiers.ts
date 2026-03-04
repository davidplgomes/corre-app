export type MembershipTier = 'free' | 'pro' | 'club' | 'basico' | 'baixa_pace' | 'parceiros';
export type TierKey = MembershipTier; // Alias for backward compatibility
export type CanonicalMembershipTier = 'free' | 'pro' | 'club';

export interface TierConfig {
  name: string;
  discount: number; // Percentage as decimal (0.05 = 5%)
  monthlyFee: number; // In euros
  color: string;
  benefits: string[];
}

export const MEMBERSHIP_TIERS: Record<MembershipTier, TierConfig> = {
  free: {
    name: 'Free',
    discount: 0.05,
    monthlyFee: 0,
    color: '#6B7280',
    benefits: [
      '5% discount at partner stores',
      'Access to community events',
      'Points tracking',
    ],
  },
  pro: {
    name: 'Pro',
    discount: 0.10,
    monthlyFee: 9.99,
    color: '#FF5722',
    benefits: [
      '10% discount at partner stores',
      'Access to all events',
      'Priority event registration',
      'Monthly rewards',
    ],
  },
  club: {
    name: 'Club',
    discount: 0.20,
    monthlyFee: 19.99,
    color: '#FFD700',
    benefits: [
      '20% discount at partner stores',
      'All Pro benefits',
      'Welcome gift (shirt + gel + race number)',
      'Exclusive training sessions',
      'VIP event access',
      'Guest passes',
    ],
  },
  // Legacy tiers (for backward compatibility)
  basico: {
    name: 'Básico',
    discount: 0.10,
    monthlyFee: 17.5,
    color: '#3B82F6',
    benefits: [
      '10% discount at partner stores',
      'Access to all events',
      'Priority event registration',
      'Monthly rewards',
    ],
  },
  baixa_pace: {
    name: 'Baixa Pace',
    discount: 0.15,
    monthlyFee: 25,
    color: '#8B5CF6',
    benefits: [
      '15% discount at partner stores',
      'All Básico benefits',
      'Welcome gift (shirt + gel + race number)',
      'Exclusive training sessions',
    ],
  },
  parceiros: {
    name: 'Parceiros',
    discount: 0.20,
    monthlyFee: 35,
    color: '#F59E0B',
    benefits: [
      '20% discount at partner stores',
      'All Baixa Pace benefits',
      'VIP event access',
      'Personal training consultation',
      'Exclusive merchandise',
    ],
  },
} as const;

// Alias for backward compatibility
export const TIERS = MEMBERSHIP_TIERS;

export const getTierConfig = (tier: MembershipTier): TierConfig => {
  return MEMBERSHIP_TIERS[tier];
};

export const getDiscountPercentage = (tier: MembershipTier): number => {
  return MEMBERSHIP_TIERS[tier].discount * 100;
};

export const toCanonicalTier = (tier?: string | null): CanonicalMembershipTier => {
  switch ((tier || '').toLowerCase()) {
    case 'club':
    case 'baixa_pace':
    case 'parceiros':
      return 'club';
    case 'pro':
    case 'basico':
      return 'pro';
    default:
      return 'free';
  }
};

export const isClubMembershipTier = (tier?: string | null): boolean => {
  return toCanonicalTier(tier) === 'club';
};
