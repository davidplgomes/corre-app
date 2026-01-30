import React from 'react';
import {
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    StyleProp,
    Pressable,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
    textStyle?: TextStyle;
}

// Spring config for smooth "bouncy" feel (HIG-like)
const SPRING_CONFIG: WithSpringConfig = {
    damping: 15,
    stiffness: 150,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    style,
    textStyle,
}) => {
    const scale = useSharedValue(1);
    const isDisabled = disabled || loading;

    // Derived styles
    const styleVariant = variant === 'outline' ? 'secondary' : variant;
    const textVariant = variant === 'outline' ? 'secondary' : variant;

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        if (!isDisabled) {
            scale.value = withSpring(0.96, SPRING_CONFIG);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePressOut = () => {
        if (!isDisabled) {
            scale.value = withSpring(1, SPRING_CONFIG);
        }
    };

    return (
        <AnimatedPressable
            style={[
                styles.button,
                styles[styleVariant],
                styles[size],
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                animatedStyle,
                style,
            ]}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isDisabled}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'ghost' ? theme.colors.brand.primary : theme.colors.white}
                    size="small"
                />
            ) : (
                <Text style={[styles.text, styles[`${textVariant}Text`], styles[`${size}Text`], textStyle]}>
                    {title}
                </Text>
            )}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: theme.radius.md, // Soft corners (12px) as per spec
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    // Variants
    primary: {
        backgroundColor: theme.colors.brand.primary,
    },
    secondary: {
        backgroundColor: theme.colors.background.card,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    danger: {
        backgroundColor: theme.colors.error,
    },
    // Sizes
    small: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        minHeight: 44, // HIG compliance (min 44pt)
    },
    medium: {
        paddingHorizontal: theme.spacing[6],
        paddingVertical: theme.spacing[4],
        minHeight: 48,
    },
    large: {
        paddingHorizontal: theme.spacing[8],
        paddingVertical: theme.spacing[5],
        minHeight: 56,
    },
    // States
    disabled: {
        opacity: 0.4,
    },
    // Text styles
    text: {
        fontWeight: theme.typography.weight.semibold as any,
    },
    primaryText: {
        color: theme.colors.white,
    },
    secondaryText: {
        color: theme.colors.text.primary,
    },
    ghostText: {
        color: theme.colors.brand.primary,
    },
    dangerText: {
        color: theme.colors.white,
    },
    smallText: {
        fontSize: theme.typography.size.bodySM,
    },
    mediumText: {
        fontSize: theme.typography.size.bodyMD,
    },
    largeText: {
        fontSize: theme.typography.size.bodyLG,
    },
});
