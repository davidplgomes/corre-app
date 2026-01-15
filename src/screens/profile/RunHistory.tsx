import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';

type RunHistoryProps = {
    navigation: any;
};

// Mock data for run history
const MOCK_RUNS = [
    { id: '1', date: '2026-01-14', distance: '5.2km', time: '28:45', pace: "5'31\"/km", points: 50 },
    { id: '2', date: '2026-01-12', distance: '10.0km', time: '54:20', pace: "5'26\"/km", points: 100 },
    { id: '3', date: '2026-01-10', distance: '3.5km', time: '18:55', pace: "5'24\"/km", points: 30 },
    { id: '4', date: '2026-01-08', distance: '8.0km', time: '44:00', pace: "5'30\"/km", points: 80 },
    { id: '5', date: '2026-01-05', distance: '12.0km', time: '1:06:00', pace: "5'30\"/km", points: 120 },
    { id: '6', date: '2026-01-03', distance: '5.0km', time: '27:30', pace: "5'30\"/km", points: 50 },
    { id: '7', date: '2026-01-01', distance: '21.1km', time: '1:56:00', pace: "5'29\"/km", points: 200 },
];

export const RunHistory: React.FC<RunHistoryProps> = ({ navigation }) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        return { day, month };
    };

    const totalDistance = MOCK_RUNS.reduce((acc, run) => {
        const km = parseFloat(run.distance.replace('km', ''));
        return acc + km;
    }, 0);

    const totalRuns = MOCK_RUNS.length;

    const renderItem = ({ item }: { item: typeof MOCK_RUNS[0] }) => {
        const { day, month } = formatDate(item.date);

        return (
            <View style={styles.runCard}>
                {/* Date */}
                <View style={styles.dateSection}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMonth}>{month}</Text>
                </View>

                {/* Accent Line */}
                <View style={styles.accentLine} />

                {/* Stats */}
                <View style={styles.statsSection}>
                    <View style={styles.statRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.distance}</Text>
                            <Text style={styles.statLabel}>Distância</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.time}</Text>
                            <Text style={styles.statLabel}>Tempo</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{item.pace}</Text>
                            <Text style={styles.statLabel}>Pace</Text>
                        </View>
                    </View>
                </View>

                {/* Points */}
                <View style={styles.pointsSection}>
                    <Text style={styles.pointsValue}>+{item.points}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>← Voltar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerLabel}>HISTÓRICO</Text>
                    <Text style={styles.headerTitle}>De Corridas</Text>
                </View>

                {/* Summary */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalRuns}</Text>
                        <Text style={styles.summaryLabel}>Corridas</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{totalDistance.toFixed(1)}km</Text>
                        <Text style={styles.summaryLabel}>Total</Text>
                    </View>
                </View>

                {/* List */}
                <FlatList
                    data={MOCK_RUNS}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        paddingHorizontal: theme.spacing[6],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[4],
    },
    backButton: {
        marginBottom: theme.spacing[3],
    },
    backText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
    },
    headerLabel: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.widest,
        marginBottom: theme.spacing[1],
    },
    headerTitle: {
        fontSize: theme.typography.size.displaySM,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },

    // Summary
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[6],
        paddingBottom: theme.spacing[6],
    },
    summaryItem: {
        flex: 1,
    },
    summaryValue: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary,
    },
    summaryLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: theme.colors.border.default,
        marginHorizontal: theme.spacing[4],
    },

    // List
    listContent: {
        paddingHorizontal: theme.spacing[6],
        paddingBottom: 120,
    },

    // Run Card
    runCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        padding: theme.spacing[4],
        marginBottom: theme.spacing[3],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
    },
    dateSection: {
        alignItems: 'center',
        width: 44,
    },
    dateDay: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    dateMonth: {
        fontSize: theme.typography.size.micro,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.brand.primary,
        letterSpacing: theme.typography.letterSpacing.wide,
    },
    accentLine: {
        width: 3,
        height: 40,
        borderRadius: 1.5,
        backgroundColor: theme.colors.success,
        marginHorizontal: theme.spacing[3],
    },
    statsSection: {
        flex: 1,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
    },
    statLabel: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        marginTop: theme.spacing[1],
    },
    pointsSection: {
        marginLeft: theme.spacing[3],
    },
    pointsValue: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary,
    },
});
