import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
    TouchableOpacity,
} from 'react-native';
import { theme } from '../../constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    helperText?: string;
    containerStyle?: ViewStyle;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    containerStyle,
    leftIcon,
    rightIcon,
    isPassword,
    ...textInputProps
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);

    const hasError = !!error;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused,
                    hasError && styles.inputContainerError,
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                <TextInput
                    {...textInputProps}
                    style={[styles.input, textInputProps.style]}
                    onFocus={(e) => {
                        setIsFocused(true);
                        textInputProps.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        textInputProps.onBlur?.(e);
                    }}
                    placeholderTextColor={theme.colors.text.disabled}
                    secureTextEntry={isPassword && !isSecureTextVisible}
                />
                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setIsSecureTextVisible(!isSecureTextVisible)}
                        style={styles.rightIcon}
                    >
                        <Text style={styles.passwordToggle}>
                            {isSecureTextVisible ? '○' : '●'}
                        </Text>
                    </TouchableOpacity>
                )}
                {!isPassword && rightIcon && (
                    <View style={styles.rightIcon}>{rightIcon}</View>
                )}
            </View>
            {hasError && <Text style={styles.errorText}>{error}</Text>}
            {!hasError && helperText && (
                <Text style={styles.helperText}>{helperText}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: theme.spacing[4],
    },
    label: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing[2],
        letterSpacing: theme.typography.letterSpacing.wide,
        textTransform: 'uppercase',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.input,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        borderRadius: theme.radius.md, // Match buttons (12px)
        paddingHorizontal: theme.spacing[4],
        minHeight: 52,
    },
    inputContainerFocused: {
        borderColor: theme.colors.brand.primary,
    },
    inputContainerError: {
        borderColor: theme.colors.error,
    },
    input: {
        flex: 1,
        fontSize: theme.typography.size.bodyLG,
        color: theme.colors.text.primary,
        paddingVertical: theme.spacing[3],
    },
    leftIcon: {
        marginRight: theme.spacing[3],
    },
    rightIcon: {
        marginLeft: theme.spacing[3],
    },
    passwordToggle: {
        fontSize: theme.typography.size.bodyLG,
        color: theme.colors.text.tertiary,
    },
    errorText: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.error,
        marginTop: theme.spacing[1],
        marginLeft: theme.spacing[1],
    },
    helperText: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
        marginLeft: theme.spacing[1],
    },
});
