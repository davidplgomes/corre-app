import React, { useImperativeHandle, forwardRef, useCallback } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export interface ShakeViewRef {
    shake: () => void;
}

interface ShakeViewProps {
    children: React.ReactNode;
    style?: ViewStyle;
    /** Shake intensity in pixels (default: 6) */
    intensity?: number;
    /** Duration of each oscillation in ms (default: 40) */
    duration?: number;
    /** Number of oscillations (default: 3) */
    oscillations?: number;
    /** Enable haptic feedback on shake (default: true) */
    hapticEnabled?: boolean;
}

/**
 * A wrapper component that provides a shake animation for error feedback.
 * Use the ref to trigger the shake animation imperatively.
 *
 * @example
 * const shakeRef = useRef<ShakeViewRef>(null);
 *
 * const handleError = () => {
 *   shakeRef.current?.shake();
 * };
 *
 * <ShakeView ref={shakeRef}>
 *   <TextInput ... />
 * </ShakeView>
 */
export const ShakeView = forwardRef<ShakeViewRef, ShakeViewProps>(
    (
        {
            children,
            style,
            intensity = 6,
            duration = 40,
            oscillations = 3,
            hapticEnabled = true,
        },
        ref
    ) => {
        const translateX = useSharedValue(0);

        const shake = useCallback(() => {
            // Generate sequence: [right, left, right, left, ..., center]
            const sequence: number[] = [];
            for (let i = 0; i < oscillations; i++) {
                const direction = i % 2 === 0 ? 1 : -1;
                // Decrease intensity over time for natural feel
                const currentIntensity = intensity * (1 - i / (oscillations * 2));
                sequence.push(
                    withTiming(direction * currentIntensity, {
                        duration,
                        easing: Easing.linear,
                    }) as unknown as number
                );
            }
            // Return to center
            sequence.push(
                withTiming(0, {
                    duration,
                    easing: Easing.out(Easing.ease),
                }) as unknown as number
            );

            translateX.value = withSequence(...sequence);

            // Trigger haptic feedback
            if (hapticEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }, [intensity, duration, oscillations, hapticEnabled, translateX]);

        useImperativeHandle(ref, () => ({
            shake,
        }));

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: translateX.value }],
        }));

        return (
            <Animated.View style={[animatedStyle, style]}>
                {children}
            </Animated.View>
        );
    }
);

ShakeView.displayName = 'ShakeView';

/**
 * Hook to create shake animation values and trigger function.
 * Use this when you need more control over the animation.
 *
 * @example
 * const { animatedStyle, shake } = useShakeAnimation();
 *
 * <Animated.View style={animatedStyle}>
 *   <TextInput ... />
 * </Animated.View>
 */
export const useShakeAnimation = (options?: {
    intensity?: number;
    duration?: number;
    oscillations?: number;
    hapticEnabled?: boolean;
}) => {
    const {
        intensity = 6,
        duration = 40,
        oscillations = 3,
        hapticEnabled = true,
    } = options || {};

    const translateX = useSharedValue(0);

    const shake = useCallback(() => {
        const sequence: number[] = [];
        for (let i = 0; i < oscillations; i++) {
            const direction = i % 2 === 0 ? 1 : -1;
            const currentIntensity = intensity * (1 - i / (oscillations * 2));
            sequence.push(
                withTiming(direction * currentIntensity, {
                    duration,
                    easing: Easing.linear,
                }) as unknown as number
            );
        }
        sequence.push(
            withTiming(0, {
                duration,
                easing: Easing.out(Easing.ease),
            }) as unknown as number
        );

        translateX.value = withSequence(...sequence);

        if (hapticEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [intensity, duration, oscillations, hapticEnabled, translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return { animatedStyle, shake };
};
