import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { EventCard } from '../../components/events/EventCard';
import { LoadingSpinner, AnimatedListItem } from '../../components/common';
import { getUpcomingEvents } from '../../services/supabase/events';
import { Event } from '../../types';
import { theme } from '../../constants/theme';

type EventListProps = {
    navigation: any;
};

// Helper to create future date strings
const futureDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
};

// Mock events for demo (matching the design) - always in the future
const MOCK_EVENTS: any[] = [
    {
        id: '1',
        title: 'Corrida Urbana Noturna',
        description: 'Corrida noturna pelas ruas do centro',
        event_type: 'race',
        event_datetime: futureDate(7), // 1 week from now
        location_name: '10km • Parque Central',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 150,
    },
    {
        id: '2',
        title: 'Maratona de São Paulo',
        description: 'A maior maratona da cidade',
        event_type: 'race',
        event_datetime: futureDate(30), // 1 month from now
        location_name: '42km • Ibirapuera',
        location_lat: -23.5505,
        location_lng: -46.6333,
        check_in_radius_meters: 300,
        creator_id: '1',
        points_value: 300,
    },
];

export const EventList: React.FC<EventListProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [events, setEvents] = useState<Event[]>([]); // Start empty, not with mocks
    const [loading, setLoading] = useState(true); // Start loading
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
            let data = await getUpcomingEvents();

            // Fallback to all events if no upcoming events
            if (!data || data.length === 0) {
                const { getAllEvents } = await import('../../services/supabase/events');
                data = await getAllEvents();
            }

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

    const filteredEvents = useMemo(() => {
        if (activeFilter === 'Todos') return events;
        return events.filter(event => {
            const location = event.location_name || '';
            const description = event.description || '';
            const searchTerms = `${event.title} ${description} ${location}`.toLowerCase();
            if (activeFilter === '5K') return searchTerms.includes('5k') || searchTerms.includes('5 km');
            if (activeFilter === '10K') return searchTerms.includes('10k') || searchTerms.includes('10 km');
            if (activeFilter === 'Meia Maratona') return searchTerms.includes('21k') || searchTerms.includes('21 km') || searchTerms.includes('meia');
            if (activeFilter === 'Treino') return searchTerms.includes('treino');
            return true;
        });
    }, [events, activeFilter]);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        loadEvents();
    }, [loadEvents]);

    if (loading && events.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerLabel}>{t('navigation.events').toUpperCase()}</Text>
                    <Text style={styles.headerTitle}>{t('home.next').toUpperCase()}</Text>
                </View>

                {/* Stats Row with Blur */}
                <BlurView intensity={20} tint="dark" style={styles.statsGlass}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.totalRuns}</Text>
                            <Text style={styles.statLabel}>{t('events.runs').toUpperCase()}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.totalDistance}</Text>
                            <Text style={styles.statLabel}>{t('events.distance').toUpperCase()}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, styles.statValueHighlight]}>{stats.totalPoints}</Text>
                            <Text style={styles.statLabel}>{t('leaderboard.points').toUpperCase()}</Text>
                        </View>
                    </View>
                </BlurView>

                {/* Filter Pills */}
                <View style={styles.filtersContainer}>
                    <FlatList
                        horizontal
                        data={filters}
                        keyExtractor={(item) => item}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersList}
                        renderItem={({ item }) => (
                            <BlurView intensity={10} tint="dark" style={styles.filterPillGlass}>
                                <TouchableOpacity
                                    style={[
                                        styles.filterPill,
                                        activeFilter === item && styles.filterPillActive
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setActiveFilter(item);
                                    }}
                                >
                                    <Text style={[
                                        styles.filterText,
                                        activeFilter === item && styles.filterTextActive
                                    ]}>
                                        {item.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            </BlurView>
                        )}
                    />
                </View>

                {/* Events List */}
                <FlatList
                    data={filteredEvents}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <AnimatedListItem index={index} animationType="fadeUp" staggerDelay={60}>
                            <EventCard
                                event={item}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    navigation.navigate('EventDetail', { eventId: item.id });
                                }}
                            />
                        </AnimatedListItem>
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#FFF"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    safeArea: {
        flex: 1,
    },

    // Header
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },

    // Stats
    statsGlass: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    statValueHighlight: {
        color: theme.colors.brand.primary,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },

    // Filters
    filtersContainer: {
        paddingBottom: 20,
    },
    filtersList: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterPillGlass: {
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    filterPillActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    filterText: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    filterTextActive: {
        color: '#FFF',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
});
