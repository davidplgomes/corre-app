import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
    /** Set to true to use simple pulse animation instead of shimmer */
    simple?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = theme.radius.sm,
    style,
    simple = false,
}) => {
    const shimmerTranslate = useSharedValue(-1);
    const pulseOpacity = useSharedValue(0.3);

    useEffect(() => {
        if (simple) {
            // Simple pulse animation
            pulseOpacity.value = withRepeat(
                withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            // Shimmer animation - smooth slide from left to right
            shimmerTranslate.value = withRepeat(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
                -1,
                false
            );
        }
    }, [simple]);

    const shimmerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: interpolate(
                        shimmerTranslate.value,
                        [-1, 1],
                        [-200, 200]
                    ),
                },
            ],
        };
    });

    const pulseStyle = useAnimatedStyle(() => {
        return {
            opacity: pulseOpacity.value,
        };
    });

    if (simple) {
        return (
            <Animated.View
                style={[
                    styles.skeleton,
                    {
                        width: width as any,
                        height: height as any,
                        borderRadius,
                    },
                    pulseStyle,
                    style,
                ]}
            />
        );
    }

    return (
        <View
            style={[
                styles.skeleton,
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
                <LinearGradient
                    colors={[
                        'transparent',
                        'rgba(255, 255, 255, 0.08)',
                        'rgba(255, 255, 255, 0.15)',
                        'rgba(255, 255, 255, 0.08)',
                        'transparent',
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.shimmerGradient}
                />
            </Animated.View>
        </View>
    );
};

/** Skeleton variant for text lines */
export const SkeletonText: React.FC<{
    lines?: number;
    lineHeight?: number;
    spacing?: number;
    lastLineWidth?: string;
    style?: ViewStyle;
}> = ({ lines = 3, lineHeight = 14, spacing = 8, lastLineWidth = '60%', style }) => {
    return (
        <View style={style}>
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton
                    key={index}
                    height={lineHeight}
                    width={index === lines - 1 ? lastLineWidth : '100%'}
                    style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
                />
            ))}
        </View>
    );
};

/** Skeleton variant for avatars/circles */
export const SkeletonAvatar: React.FC<{
    size?: number;
    style?: ViewStyle;
}> = ({ size = 48, style }) => {
    return (
        <Skeleton
            width={size}
            height={size}
            borderRadius={size / 2}
            style={style}
        />
    );
};

/** Skeleton variant for cards */
export const SkeletonCard: React.FC<{
    height?: number;
    style?: ViewStyle;
}> = ({ height = 120, style }) => {
    return (
        <View style={[styles.cardContainer, style]}>
            <Skeleton height={height} borderRadius={theme.radius.lg} />
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: theme.colors.gray[800],
    },
    shimmerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '200%',
    },
    shimmerGradient: {
        flex: 1,
        width: '50%',
    },
    cardContainer: {
        marginBottom: theme.spacing[3],
    },
});
