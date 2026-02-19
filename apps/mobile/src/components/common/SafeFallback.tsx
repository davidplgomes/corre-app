/**
 * SafeFallback Component
 * Generic wrapper that shows a safe fallback state if a child component
 * fails to load or if required data is missing.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorBoundary } from './ErrorBoundary';

interface SafeFallbackProps {
    children: React.ReactNode;
    /** Show loading skeleton while data is loading */
    isLoading?: boolean;
    /** Show error state with optional retry */
    error?: string | null;
    /** Called when retry is pressed */
    onRetry?: () => void;
    /** Show fallback if data is null/undefined */
    hasData?: boolean;
    /** Custom empty state text */
    emptyText?: string;
    /** Container style */
    style?: ViewStyle;
    /** Component name for error boundary logging */
    componentName?: string;
    /** Number of skeleton lines to show */
    skeletonLines?: number;
}

export const SafeFallback: React.FC<SafeFallbackProps> = ({
    children,
    isLoading = false,
    error = null,
    onRetry,
    hasData = true,
    emptyText = 'No data available',
    style,
    componentName = 'Unknown',
    skeletonLines = 3,
}) => {
    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.container, style]}>
                <LoadingSkeleton lines={skeletonLines} />
            </View>
        );
    }

    // Error state
    if (error) {
        return (
            <View style={[styles.container, styles.errorContainer, style]}>
                <Text style={styles.errorText}>{error}</Text>
                {onRetry && (
                    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // Empty data state
    if (!hasData) {
        return (
            <View style={[styles.container, styles.emptyContainer, style]}>
                <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
        );
    }

    // Wrap children in ErrorBoundary for runtime protection
    return (
        <ErrorBoundary componentName={componentName}>
            {children}
        </ErrorBoundary>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    errorContainer: {
        alignItems: 'center',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#FF5722',
        borderRadius: 6,
    },
    retryText: {
        color: '#FFF',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
        textAlign: 'center',
    },
});
