import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';
import { getUserRuns } from '../../services/supabase/feed';
import { useAuth } from '../../contexts/AuthContext';

type RunHistoryProps = {
    navigation: any;
};

export const RunHistory: React.FC<RunHistoryProps> = ({ navigation }) => {
    // State for runs
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchRuns = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const data = await getUserRuns(user.id);

                const formattedRuns = data.map(post => ({
                    id: post.id,
                    date: post.created_at,
                    distance: post.meta_data?.distance || '0km',
                    time: post.meta_data?.time || '00:00',
                    pace: post.meta_data?.pace || "0'00\"/km",
                    points: post.meta_data?.points || 0
                }));

                setRuns(formattedRuns);
            } catch (error) {
                console.error('Error fetching runs:', error);
                setRuns([]); // Ensure runs is empty on error
            } finally {
                setLoading(false);
            }
        };

        fetchRuns();
    }, [user]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        return { day, month };
    };

    const totalDistance = runs.reduce((acc, run) => {
        const km = parseFloat((run.distance || '0').toString().replace('km', ''));
        return acc + (isNaN(km) ? 0 : km);
    }, 0);

    const totalRuns = runs.length;

    const renderItem = ({ item }: { item: any }) => {
        const { day, month } = formatDate(item.date);

        return (
            <TouchableOpacity
                style={styles.runCard}
                onPress={() => navigation.navigate('RunMap', { run: item })}
            >
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
            </TouchableOpacity>
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
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={runs}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: theme.colors.text.secondary }}>Nenhuma corrida registrada.</Text>
                            </View>
                        }
                    />
                )}
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
