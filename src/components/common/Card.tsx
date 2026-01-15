import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'default',
}) => {
    return (
        <View style={[styles.card, styles[variant], style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
    },
    default: {
        backgroundColor: theme.colors.background.card,
    },
    elevated: {
        backgroundColor: theme.colors.background.card,
        ...theme.shadows.md,
    },
    outlined: {
        backgroundColor: theme.colors.background.card,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
});
