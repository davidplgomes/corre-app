import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ErrorMessageProps {
    message: string;
    icon?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message,
    icon = '⚠️',
}) => {
    if (!message) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    icon: {
        fontSize: 24,
        marginRight: 12,
    },
    message: {
        flex: 1,
        fontSize: 14,
        color: '#991B1B',
    },
});
