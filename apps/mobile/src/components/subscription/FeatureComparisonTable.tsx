import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { VerifiedIcon, CloseIcon } from '../common/TabIcons'; // Assuming CloseIcon exists or I'll use X text

export interface FeatureComparison {
    feature: string;
    free: boolean | string;
    pro: boolean | string;
    club: boolean | string;
}

const FEATURES: FeatureComparison[] = [
    {
        feature: 'Acesso a Eventos',
        free: 'Apenas Abertos',
        pro: 'Todos (Sem Guest)',
        club: 'Todos + VIP'
    },
    {
        feature: 'Descontos',
        free: false,
        pro: '5-10% por XP',
        club: '15% Fixo'
    },
    {
        feature: 'Marketplace',
        free: 'Venda Simples',
        pro: '20% Pontos + 1 Destaque',
        club: '3 Destaques'
    },
    {
        feature: 'Cupons',
        free: 'Parceiros Externos',
        pro: 'Parceiros Externos',
        club: 'Exclusivos'
    },
    {
        feature: 'Welcome Kit',
        free: false,
        pro: false,
        club: true
    },
    {
        feature: 'Guest Pass Mensal',
        free: false,
        pro: false,
        club: true
    },
    {
        feature: 'Fila Prioritária',
        free: false,
        pro: 'Parcial',
        club: 'Máxima'
    },
    {
        feature: 'Perfil Golden',
        free: false,
        pro: false,
        club: true
    }
];

export const FeatureComparisonTable: React.FC = () => {
    const renderCell = (value: boolean | string) => {
        if (typeof value === 'boolean') {
            return value ? (
                <View style={styles.checkContainer}>
                    <VerifiedIcon size={16} color={theme.colors.success} filled />
                </View>
            ) : (
                <View style={[styles.checkContainer, { opacity: 0.3 }]}>
                    <Text style={{ color: '#FFF', fontSize: 16 }}>✕</Text>
                </View>
            );
        }
        return <Text style={styles.valueText}>{value}</Text>;
    };

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.container}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <View style={[styles.cell, styles.featureCell]}>
                        <Text style={styles.headerText}>Recurso</Text>
                    </View>
                    <View style={[styles.cell, styles.planCell]}>
                        <Text style={styles.headerText}>FREE</Text>
                    </View>
                    <View style={[styles.cell, styles.planCell, styles.proPlan]}>
                        <Text style={[styles.headerText, styles.proText]}>PRO</Text>
                    </View>
                    <View style={[styles.cell, styles.planCell, styles.clubPlan]}>
                        <Text style={[styles.headerText, styles.clubText]}>CLUB</Text>
                    </View>
                </View>

                {/* Feature Rows */}
                {FEATURES.map((item, index) => (
                    <View
                        key={item.feature}
                        style={[
                            styles.row,
                            index % 2 === 0 && styles.evenRow
                        ]}
                    >
                        <View style={[styles.cell, styles.featureCell]}>
                            <Text style={styles.featureName}>{item.feature}</Text>
                        </View>
                        <View style={[styles.cell, styles.planCell]}>
                            {renderCell(item.free)}
                        </View>
                        <View style={[styles.cell, styles.planCell]}>
                            {renderCell(item.pro)}
                        </View>

                        {/* Club Cell with Subtle Gradient Background */}
                        <View style={[styles.cell, styles.planCell]}>
                            <LinearGradient
                                colors={['rgba(255, 215, 0, 0.05)', 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                            {renderCell(item.club)}
                        </View>

                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        minWidth: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderBottomWidth: 2,
        borderBottomColor: theme.colors.border.default,
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    evenRow: {
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    cell: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureCell: {
        width: 160,
        alignItems: 'flex-start',
    },
    planCell: {
        width: 110,
    },
    proPlan: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    clubPlan: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#FFD700',
    },
    headerText: {
        fontSize: 12,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
    },
    proText: {
        color: theme.colors.brand.primary,
    },
    clubText: {
        color: '#FFD700',
    },
    featureName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.primary,
    },
    valueText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text.secondary,
        textAlign: 'center',
    },
    unavailableText: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.2)',
    },
    checkContainer: {
        padding: 4,
    },
});
