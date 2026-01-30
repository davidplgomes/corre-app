import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

interface PointsDisplayProps {
    currentMonthPoints: number;
    totalLifetimePoints: number;
    style?: ViewStyle;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
    currentMonthPoints,
    totalLifetimePoints,
    style,
}) => {
    const { t } = useTranslation();

    return (
        <View style={[styles.container, style]}>
            <View style={styles.pointsBox}>
                <Text style={styles.pointsValue}>{currentMonthPoints}</Text>
                <Text style={styles.pointsLabel}>{t('profile.currentPoints')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.pointsBox}>
                <Text style={styles.pointsValue}>{totalLifetimePoints}</Text>
                <Text style={styles.pointsLabel}>{t('profile.totalPoints')}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F3E8FF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    pointsBox: {
        alignItems: 'center',
        flex: 1,
    },
    pointsValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#7C3AED',
    },
    pointsLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 16,
    },
});
