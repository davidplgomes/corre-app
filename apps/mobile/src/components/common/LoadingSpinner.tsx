import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { theme } from '../../constants/theme';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'large',
    color = theme.colors.brand.primary,
    text,
}) => {
    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
            {text && <Text style={styles.text}>{text}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing[5],
        backgroundColor: theme.colors.background.primary,
    },
    text: {
        marginTop: theme.spacing[3],
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.tertiary,
    },
});

