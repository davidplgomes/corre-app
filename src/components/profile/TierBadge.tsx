import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TIERS, TierKey } from '../../constants/tiers';
import { theme } from '../../constants/theme';

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
                { backgroundColor: theme.colors.brand.primary, borderColor: theme.colors.brand.primary },
                style,
            ]}
        >
            <Text style={[styles.text, styles[`${size}Text`], { color: '#FFF' }]}>
                {tierInfo.name}
            </Text>
            <Text style={[styles.discount, { color: '#FFF' }]}>
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
        fontWeight: '900' as any,
        letterSpacing: 1,
        textTransform: 'uppercase' as any,
    },
    smallText: {
        fontSize: 10,
    },
    mediumText: {
        fontSize: 12,
    },
    largeText: {
        fontSize: 16,
    },
    discount: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
        letterSpacing: 0.5,
    },
});
