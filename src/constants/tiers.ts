export type MembershipTier = 'free' | 'basico' | 'baixa_pace' | 'parceiros';
export type TierKey = MembershipTier; // Alias for backward compatibility

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
