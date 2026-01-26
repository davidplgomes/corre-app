import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export interface ConfettiRef {
    /** Fire confetti from bottom center */
    fire: () => void;
    /** Fire confetti from a specific position */
    fireFrom: (x: number, y: number) => void;
    /** Fire confetti for achievements */
    celebrate: () => void;
    /** Fire confetti for new personal record */
    personalRecord: () => void;
}

interface ConfettiProps {
    /** Number of confetti pieces (default: 150) */
    count?: number;
    /** Colors for confetti pieces */
    colors?: string[];
    /** Whether to trigger haptic feedback (default: true) */
    hapticEnabled?: boolean;
    /** Callback when animation completes */
    onComplete?: () => void;
    /** Fade out duration in ms (default: 5000) */
    fadeOut?: number;
}

const DEFAULT_COLORS = [
    theme.colors.brand.primary,
    '#FFD700', // Gold
    '#FF6B6B', // Coral
    '#4ECDC4', // Teal
    '#A78BFA', // Purple
    '#38BDF8', // Sky blue
    '#F472B6', // Pink
];

const ACHIEVEMENT_COLORS = [
    '#FFD700', // Gold
    '#FFA500', // Orange
    '#FFE135', // Banana yellow
    '#FFDF00', // Golden yellow
    '#F0E68C', // Khaki
];

const PR_COLORS = [
    theme.colors.brand.primary,
    '#00FF00', // Green
    '#32CD32', // Lime green
    '#7FFF00', // Chartreuse
    '#ADFF2F', // Green yellow
];

/**
 * Confetti celebration component with imperative API.
 * Use the ref to trigger confetti animations.
 *
 * @example
 * const confettiRef = useRef<ConfettiRef>(null);
 *
 * const handleAchievement = () => {
 *   confettiRef.current?.celebrate();
 * };
 *
 * <Confetti ref={confettiRef} />
 */
export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
    (
        {
            count = 150,
            colors = DEFAULT_COLORS,
            hapticEnabled = true,
            onComplete,
            fadeOut = 5000,
        },
        ref
    ) => {
        const cannonRef = useRef<ConfettiCannon>(null);
        const [origin, setOrigin] = useState({ x: width / 2, y: height });
        const [activeColors, setActiveColors] = useState(colors);
        const [activeCount, setActiveCount] = useState(count);
        const [isVisible, setIsVisible] = useState(false);

        const triggerHaptic = useCallback(() => {
            if (hapticEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }, [hapticEnabled]);

        const fire = useCallback(() => {
            setOrigin({ x: width / 2, y: height });
            setActiveColors(colors);
            setActiveCount(count);
            setIsVisible(true);
            triggerHaptic();
            // The cannon auto-fires when visible with autoStart={true}
        }, [colors, count, triggerHaptic]);

        const fireFrom = useCallback((x: number, y: number) => {
            setOrigin({ x, y });
            setActiveColors(colors);
            setActiveCount(count);
            setIsVisible(true);
            triggerHaptic();
        }, [colors, count, triggerHaptic]);

        const celebrate = useCallback(() => {
            setOrigin({ x: width / 2, y: height });
            setActiveColors(ACHIEVEMENT_COLORS);
            setActiveCount(200);
            setIsVisible(true);
            triggerHaptic();
            // Double haptic for achievement
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }, 200);
        }, [triggerHaptic]);

        const personalRecord = useCallback(() => {
            setOrigin({ x: width / 2, y: height });
            setActiveColors(PR_COLORS);
            setActiveCount(250);
            setIsVisible(true);
            triggerHaptic();
            // Triple haptic for PR
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }, 150);
            setTimeout(() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }, 300);
        }, [triggerHaptic]);

        const handleAnimationEnd = useCallback(() => {
            setIsVisible(false);
            onComplete?.();
        }, [onComplete]);

        useImperativeHandle(ref, () => ({
            fire,
            fireFrom,
            celebrate,
            personalRecord,
        }));

        if (!isVisible) {
            return null;
        }

        return (
            <ConfettiCannon
                ref={cannonRef}
                count={activeCount}
                origin={origin}
                colors={activeColors}
                fadeOut
                autoStart
                explosionSpeed={350}
                fallSpeed={3000}
                onAnimationEnd={handleAnimationEnd}
            />
        );
    }
);

Confetti.displayName = 'Confetti';

/**
 * Pre-configured confetti for achievements
 */
export const AchievementConfetti = forwardRef<ConfettiRef, Omit<ConfettiProps, 'colors' | 'count'>>(
    (props, ref) => (
        <Confetti ref={ref} colors={ACHIEVEMENT_COLORS} count={200} {...props} />
    )
);

AchievementConfetti.displayName = 'AchievementConfetti';

/**
 * Pre-configured confetti for personal records
 */
export const PRConfetti = forwardRef<ConfettiRef, Omit<ConfettiProps, 'colors' | 'count'>>(
    (props, ref) => (
        <Confetti ref={ref} colors={PR_COLORS} count={250} {...props} />
    )
);

PRConfetti.displayName = 'PRConfetti';
