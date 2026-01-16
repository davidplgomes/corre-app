import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TIERS, TierKey } from '../../constants/tiers';
import { LinearGradient } from 'expo-linear-gradient';

interface TierCardProps {
    tier: TierKey;
    userName: string;
    style?: ViewStyle;
}

export const TierCard: React.FC<TierCardProps> = ({ tier, userName, style }) => {
    const { t } = useTranslation();
    const tierInfo = TIERS[tier] || TIERS.free;

    const getGradientColors = (tierKey: TierKey): [string, string] => {
        switch (tierKey) {
            case 'free':
                return ['#6B7280', '#4B5563'];
            case 'basico':
                return ['#10B981', '#059669'];
            case 'baixa_pace':
                return ['#8B5CF6', '#7C3AED'];
            case 'parceiros':
                return ['#F59E0B', '#D97706'];
            default:
                return ['#6B7280', '#4B5563'];
        }
    };

    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={getGradientColors(tier)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.header}>
                    <Text style={styles.logo}>Corre</Text>
                    <Text style={styles.memberLabel}>{t('loyalty.title')}</Text>
                </View>

                <View style={styles.content}>
                    <Text style={styles.tierName}>{tierInfo.name}</Text>
                    <Text style={styles.userName}>{userName}</Text>
                </View>

                <View style={styles.footer}>
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountValue}>{tierInfo.discount}%</Text>
                        <Text style={styles.discountLabel}>OFF</Text>
                    </View>
                    <Text style={styles.benefits}>{t(`loyalty.benefits.${tier}`)}</Text>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    card: {
        borderRadius: 20,
        padding: 24,
        minHeight: 200,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    memberLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    tierName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    discountBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    discountValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    discountLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 4,
    },
    benefits: {
        flex: 1,
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'right',
        marginLeft: 12,
    },
});
