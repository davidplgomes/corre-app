/**
 * LoadingSkeleton Component
 * Reusable animated loading placeholder for any component.
 * Use this while data is being fetched to prevent layout shift.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';

interface LoadingSkeletonProps {
    /** Width of the skeleton (default: '100%') */
    width?: DimensionValue;
    /** Height of the skeleton (default: 20) */
    height?: number;
    /** Border radius (default: 4) */
    borderRadius?: number;
    /** Additional style */
    style?: ViewStyle;
    /** Number of skeleton lines to show */
    lines?: number;
    /** Space between lines (default: 8) */
    lineSpacing?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 4,
    style,
    lines = 1,
    lineSpacing = 8,
}) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [animatedValue]);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const renderLine = (index: number) => (
        <Animated.View
            key={index}
            style={[
                styles.skeleton,
                {
                    width: index === lines - 1 && lines > 1 ? '60%' : width,
                    height,
                    borderRadius,
                    opacity,
                    marginBottom: index < lines - 1 ? lineSpacing : 0,
                },
                style,
            ]}
        />
    );

    return (
        <View>
            {Array.from({ length: lines }, (_, i) => renderLine(i))}
        </View>
    );
};

/** Card-shaped skeleton for subscription cards, profile cards, etc. */
export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.cardSkeleton, style]}>
        <LoadingSkeleton width="40%" height={24} borderRadius={6} />
        <LoadingSkeleton height={16} lines={3} style={{ marginTop: 16 }} />
        <LoadingSkeleton width="30%" height={40} borderRadius={8} style={{ marginTop: 16 }} />
    </View>
);

/** Avatar-shaped circle skeleton */
export const AvatarSkeleton: React.FC<{ size?: number }> = ({ size = 48 }) => (
    <LoadingSkeleton width={size} height={size} borderRadius={size / 2} />
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E0E0E0',
    },
    cardSkeleton: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
    },
});
