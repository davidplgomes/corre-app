import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { EventCard } from '../../components/events/EventCard';
import { LoadingSpinner } from '../../components/common';
import { getUpcomingEvents } from '../../services/supabase/events';
import { Event } from '../../types';
import { theme } from '../../constants/theme';

type EventListProps = {
    navigation: any;
};

// Mock events for demo (matching the design)
const MOCK_EVENTS: any[] = [
    {
        id: '1',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: '2026-11-18T19:00:00',
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
    {
        id: '2',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: '2026-11-18T19:00:00',
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
    {
        id: '3',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: '2026-11-20T06:00:00',
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
    {
        id: '4',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: '2026-11-25T07:00:00',
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
    {
        id: '5',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: '2026-11-26T19:00:00',
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
    {
        id: '6',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: '2026-11-27T06:30:00',
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
];

export const EventList: React.FC<EventListProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('Todos');

    // Stats from the design
    const stats = {
        totalRuns: 12,
        totalDistance: '85k',
        totalPoints: 450,
    };

    const filters = ['Todos', '5K', '10K', 'Meia Maratona', 'Treino'];

    const loadEvents = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getUpcomingEvents();
            if (data && data.length > 0) {
                setEvents(data);
            } else {
                setEvents(MOCK_EVENTS);
            }
        } catch (error) {
            console.error('Error loading events:', error);
            setEvents(MOCK_EVENTS);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadEvents();
    }, [loadEvents]);

    if (loading && events.length === 0) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerLabel}>EVENTOS</Text>
                    <Text style={styles.headerTitle}>Próximos</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Corridas</Text>
                        <Text style={styles.statValue}>{stats.totalRuns}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Distância</Text>
                        <Text style={styles.statValue}>{stats.totalDistance}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Pontos</Text>
                        <Text style={[styles.statValue, styles.statValueHighlight]}>{stats.totalPoints}</Text>
                    </View>
                </View>

                {/* Filter Pills */}
                <View style={styles.filtersContainer}>
                    <FlatList
                        horizontal
                        data={filters}
                        keyExtractor={(item) => item}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersList}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.filterPill,
                                    activeFilter === item && styles.filterPillActive
                                ]}
                                onPress={() => setActiveFilter(item)}
                            >
                                <Text style={[
                                    styles.filterText,
                                    activeFilter === item && styles.filterTextActive
                                ]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                {/* Events List */}
                <FlatList
                    data={events}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <EventCard
                            event={item}
                            onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.colors.brand.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>

            {/* Bottom Tab Indicator */}
            <View style={styles.bottomIndicator}>
                <Text style={styles.bottomIndicatorText}>Eventos</Text>
                <View style={styles.indicatorDot} />
            </View>
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
        letterSpacing: theme.typography.letterSpacing.tight,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing[6],
        paddingBottom: theme.spacing[5],
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginBottom: theme.spacing[1],
    },
    statValue: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    statValueHighlight: {
        color: theme.colors.brand.primary,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: theme.colors.border.default,
    },

    // Filters
    filtersContainer: {
        paddingBottom: theme.spacing[4],
    },
    filtersList: {
        paddingHorizontal: theme.spacing[6],
        gap: theme.spacing[2],
    },
    filterPill: {
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        marginRight: theme.spacing[2],
    },
    filterPillActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    filterText: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.secondary,
    },
    filterTextActive: {
        color: theme.colors.white,
        fontWeight: theme.typography.weight.semibold as any,
    },

    // List
    listContent: {
        paddingHorizontal: theme.spacing[6],
        paddingBottom: 120,
    },

    // Bottom Indicator
    bottomIndicator: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    bottomIndicatorText: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.brand.primary,
        fontWeight: theme.typography.weight.semibold as any,
        marginBottom: theme.spacing[1],
    },
    indicatorDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.brand.primary,
    },
});
