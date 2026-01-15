import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { theme } from '../../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

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
    const isDisabled = disabled || loading;

    // Map variant to style key (outline uses secondary styles)
    const styleVariant = variant === 'outline' ? 'secondary' : variant;
    const textVariant = variant === 'outline' ? 'secondary' : variant;

    return (
        <TouchableOpacity
            style={[
                styles.button,
                styles[styleVariant],
                styles[size],
                fullWidth && styles.fullWidth,
                isDisabled && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
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
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: theme.radius.full,
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
