import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TIERS, TierKey } from '../../constants/tiers';

interface TierBadgeProps {
    tier: TierKey;
    size?: 'small' | 'medium' | 'large';
    style?: ViewStyle;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
    tier,
    size = 'medium',
    style,
}) => {
    const tierInfo = TIERS[tier] || TIERS.free;

    return (
        <View
            style={[
                styles.container,
                styles[size],
                { backgroundColor: tierInfo.color + '20', borderColor: tierInfo.color },
                style,
            ]}
        >
            <Text style={[styles.text, styles[`${size}Text`], { color: tierInfo.color }]}>
                {tierInfo.name}
            </Text>
            <Text style={[styles.discount, { color: tierInfo.color }]}>
                {tierInfo.discount}% OFF
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Sizes
    small: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    medium: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    large: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
    },
    // Text sizes
    text: {
        fontWeight: '700',
    },
    smallText: {
        fontSize: 12,
    },
    mediumText: {
        fontSize: 14,
    },
    largeText: {
        fontSize: 18,
    },
    discount: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
});
