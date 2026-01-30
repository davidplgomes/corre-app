// Mock Service for Monetization & Gamification
// This service simulates backend logic without requiring database migrations

export type PlanType = 'free' | 'pro' | 'club';
export type LevelType = 'starter' | 'pacer' | 'elite';

export interface Plan {
    id: string;
    name: PlanType;
    displayName: string;
    price: number;
    priceFormatted: string;
    description: string;
    features: string[];
    highlight: boolean;
    color: string;
}

export interface Subscription {
    id: string;
    userId: string;
    planId: string;
    planType: PlanType;
    status: 'active' | 'cancelled' | 'expired';
    startDate: Date;
    endDate: Date | null;
    autoRenew: boolean;
}

export interface GamificationProfile {
    userId: string;
    currentXP: number;
    totalXP: number;
    currentPoints: number;
    level: LevelType;
    subscription?: Subscription;
}

// Mock Plans Data
const MOCK_PLANS: Plan[] = [
    {
        id: 'plan_free',
        name: 'free',
        displayName: 'Free',
        price: 0,
        priceFormatted: 'R$ 0,00',
        description: 'Visitante',
        features: [
            'Acesso a Eventos Abertos',
            'Marketplace (Venda sem destaque)',
            'Cupons Parceiros Externos'
        ],
        highlight: false,
        color: '#9E9E9E'
    },
    {
        id: 'plan_pro',
        name: 'pro',
        displayName: 'Pro',
        price: 29.90,
        priceFormatted: 'R$ 29,90',
        description: 'Intermediário',
        features: [
            'Desconto 5% ou 10% por XP',
            'Marketplace Híbrido (20% Pontos)',
            '1 Destaque de Venda',
            'Eventos Exclusivos (Sem Guest)'
        ],
        highlight: true,
        color: '#FF5722'
    },
    {
        id: 'plan_club',
        name: 'club',
        displayName: 'Club',
        price: 59.90,
        priceFormatted: 'R$ 59,90',
        description: 'Premium Experience',
        features: [
            'Welcome Kit (Camisa + Gel...)',
            'Guest Pass Mensal',
            'Fila Prioritária Máxima',
            '3 Destaques de Venda',
            'Perfil Golden'
        ],
        highlight: true,
        color: '#FFD700'
    }
];

// Mock User Data Storage (in-memory, would be AsyncStorage or Context in real app)
let mockUserData: { [userId: string]: GamificationProfile } = {};

/**
 * Initialize mock user profile with default values
 */
export const initializeMockProfile = (userId: string): GamificationProfile => {
    if (!mockUserData[userId]) {
        mockUserData[userId] = {
            userId,
            currentXP: 2500, // Mock: Some starting XP
            totalXP: 2500,
            currentPoints: 850, // Mock: Some starting Points
            level: 'starter',
            subscription: {
                id: 'sub_mock',
                userId,
                planId: 'plan_free',
                planType: 'free',
                status: 'active',
                startDate: new Date(),
                endDate: null,
                autoRenew: false
            }
        };
    }
    return mockUserData[userId];
};

/**
 * Get all available plans
 */
export const getPlans = async (): Promise<Plan[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PLANS;
};

/**
 * Get user's current gamification profile
 */
export const getUserGamificationProfile = async (userId: string): Promise<GamificationProfile> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return initializeMockProfile(userId);
};

/**
 * Calculate user level based on XP
 */
export const calculateLevel = (xp: number): LevelType => {
    if (xp >= 15000) return 'elite';
    if (xp >= 10000) return 'pacer';
    return 'starter';
};

/**
 * Get XP thresholds for leveling
 */
export const getLevelThresholds = (currentLevel: LevelType): { current: number; next: number; nextLevelName: string } => {
    switch (currentLevel) {
        case 'starter':
            return { current: 0, next: 10000, nextLevelName: 'PACER' };
        case 'pacer':
            return { current: 10000, next: 15000, nextLevelName: 'ELITE' };
        case 'elite':
            return { current: 15000, next: 30000, nextLevelName: 'MAX' };
    }
};

/**
 * Add XP to user (e.g., from completing runs or events)
 */
export const addXP = async (userId: string, amount: number): Promise<GamificationProfile> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    const profile = initializeMockProfile(userId);
    profile.currentXP += amount;
    profile.totalXP += amount;
    profile.level = calculateLevel(profile.currentXP);

    mockUserData[userId] = profile;
    return profile;
};

/**
 * Add Points to user (e.g., from events, with plan multipliers)
 */
export const addPoints = async (userId: string, baseAmount: number): Promise<GamificationProfile> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    const profile = initializeMockProfile(userId);

    // Apply plan multipliers
    let multiplier = 1;
    if (profile.subscription?.planType === 'pro') multiplier = 1.2;
    if (profile.subscription?.planType === 'club') multiplier = 1.5;

    const finalAmount = Math.floor(baseAmount * multiplier);
    profile.currentPoints += finalAmount;

    mockUserData[userId] = profile;
    return profile;
};

/**
 * Spend points (e.g., on coupons or marketplace)
 */
export const spendPoints = async (userId: string, amount: number): Promise<GamificationProfile> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    const profile = initializeMockProfile(userId);

    if (profile.currentPoints < amount) {
        throw new Error('Insufficient points');
    }

    profile.currentPoints -= amount;
    mockUserData[userId] = profile;
    return profile;
};

/**
 * Subscribe user to a plan (mock payment)
 */
export const subscribeToPlan = async (userId: string, planType: PlanType): Promise<Subscription> => {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const profile = initializeMockProfile(userId);
    const plan = MOCK_PLANS.find(p => p.name === planType);

    if (!plan) {
        throw new Error('Plan not found');
    }

    const subscription: Subscription = {
        id: `sub_${Date.now()}`,
        userId,
        planId: plan.id,
        planType: plan.name,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        autoRenew: true
    };

    profile.subscription = subscription;
    mockUserData[userId] = profile;

    return subscription;
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (userId: string): Promise<Subscription> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const profile = initializeMockProfile(userId);

    if (!profile.subscription) {
        throw new Error('No active subscription');
    }

    profile.subscription.status = 'cancelled';
    profile.subscription.autoRenew = false;

    mockUserData[userId] = profile;
    return profile.subscription;
};

/**
 * Get discount percentage based on plan and XP
 */
export const getDiscountPercentage = (planType: PlanType, xp: number): number => {
    if (planType === 'free') return 0;
    if (planType === 'pro') {
        return xp >= 5000 ? 10 : 5;
    }
    if (planType === 'club') {
        return 15; // Flat discount for Club
    }
    return 0;
};

/**
 * Reset monthly points (should run on 1st of each month)
 */
export const resetMonthlyPoints = async (userId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    const profile = initializeMockProfile(userId);
    profile.currentPoints = 0;

    mockUserData[userId] = profile;
};

// Export for testing/debugging
export const _getMockData = () => mockUserData;
export const _clearMockData = () => { mockUserData = {}; };
