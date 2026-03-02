import { createContext, useContext } from 'react';

export interface OnboardingContextType {
    completeOnboarding: () => Promise<void>;
}

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
    const ctx = useContext(OnboardingContext);
    if (!ctx) throw new Error('useOnboarding must be used within RootNavigator');
    return ctx;
};
