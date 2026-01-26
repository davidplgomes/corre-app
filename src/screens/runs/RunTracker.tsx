import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Alert,
    AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { createRun, RoutePoint, formatDuration, formatPace, calculateRunPointsPreview } from '../../services/supabase/runs';
import { RUN_POINTS } from '../../constants/points';
import { ChevronRightIcon, RunIcon } from '../../components/common/TabIcons';

type RunTrackerProps = {
    navigation: any;
};

type RunState = 'idle' | 'running' | 'paused' | 'finished';

export const RunTracker: React.FC<RunTrackerProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, refreshProfile } = useAuth();

    const [runState, setRunState] = useState<RunState>('idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [distanceKm, setDistanceKm] = useState(0);
    const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
    const [currentPace, setCurrentPace] = useState<number | null>(null);

    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);
    const startTime = useRef<Date | null>(null);
    const lastLocation = useRef<Location.LocationObject | null>(null);
    const appState = useRef(AppState.currentState);

    const [stepCount, setStepCount] = useState(0);
    const initialStepCount = useRef<number>(0);
    const [pedometerAvailable, setPedometerAvailable] = useState<string>('checking');

    // Check Pedometer availability
    useEffect(() => {
        const checkPedometer = async () => {
            const isAvailable = await Pedometer.isAvailableAsync();
            setPedometerAvailable(isAvailable ? 'true' : 'false');
        };
        checkPedometer();
    }, []);

    // ... handleLocationUpdate ...

    const startTracking = async () => {
        try {
            // ... existing permissions checks ...

            // Start Pedometer
            if (pedometerAvailable === 'true') {
                const end = new Date();
                const start = new Date();
                start.setHours(start.getHours() - 1); // just to get a reading, technically we subscribe

                // Subscribe to live updates
                Pedometer.watchStepCount(result => {
                    if (runState === 'running') {
                        setStepCount(Math.floor(result.steps));
                    }
                });
            }

            // Start timer
            timerInterval.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);

            // Start GPS tracking
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    distanceInterval: 5, // Update every 5 meters
                    timeInterval: 1000, // Or every 1 second
                },
                handleLocationUpdate
            );

            setRunState('running');
        } catch (error) {
            console.error('Error starting tracking:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        }
    };

    const handleLocationUpdate = (location: Location.LocationObject) => {
        const newPoint: RoutePoint = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: location.timestamp,
            altitude: location.coords.altitude ?? undefined,
            speed: location.coords.speed ?? undefined,
        };

        setRoutePoints(prev => [...prev, newPoint]);

        // Calculate distance from last point
        if (lastLocation.current) {
            const distance = calculateDistance(
                lastLocation.current.coords.latitude,
                lastLocation.current.coords.longitude,
                location.coords.latitude,
                location.coords.longitude
            );
            setDistanceKm(prev => prev + distance);

            // Calculate current pace (seconds per km)
            if (location.coords.speed && location.coords.speed > 0.5) {
                // speed is in m/s, convert to seconds per km
                const paceSecondsPerKm = 1000 / location.coords.speed;
                setCurrentPace(Math.round(paceSecondsPerKm));
            }
        }

        lastLocation.current = location;
    };

    const pauseTracking = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }

        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }

        setRunState('paused');
    };

    const resumeTracking = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Resume timer
        timerInterval.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        // Resume GPS
        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                distanceInterval: 5,
                timeInterval: 1000,
            },
            handleLocationUpdate
        );

        setRunState('running');
    };

    const stopTracking = () => {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }

        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
    };

    const finishRun = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        stopTracking();
        setRunState('finished');

        if (!user?.id || !startTime.current) return;

        // Save run to database
        try {
            const endTime = new Date();
            await createRun({
                user_id: user.id,
                distance_km: Math.round(distanceKm * 100) / 100,
                duration_seconds: elapsedSeconds,
                route_data: routePoints.length > 0 ? routePoints : undefined,
                step_count: stepCount,
                started_at: startTime.current,
                ended_at: endTime,
            });

            // Refresh user profile to update points
            if (refreshProfile) {
                await refreshProfile();
            }

            Alert.alert(
                '🎉 ' + t('common.success'),
                `+${calculateRunPointsPreview(distanceKm)} ${t('leaderboard.points')}!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error) {
            console.error('Error saving run:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        }
    };

    const resetRun = () => {
        stopTracking();
        setRunState('idle');
        setElapsedSeconds(0);
        setDistanceKm(0);
        setRoutePoints([]);
        setCurrentPace(null);
        startTime.current = null;
        lastLocation.current = null;
    };

    // Calculate distance between two coordinates in km (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const avgPace = distanceKm > 0 ? Math.round(elapsedSeconds / distanceKm) : null;
    const pointsPreview = calculateRunPointsPreview(distanceKm);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => {
                            if (runState === 'running' || runState === 'paused') {
                                Alert.alert(
                                    t('common.confirm'),
                                    'Deseja cancelar a corrida?',
                                    [
                                        { text: t('common.no'), style: 'cancel' },
                                        { text: t('common.yes'), onPress: () => { resetRun(); navigation.goBack(); } },
                                    ]
                                );
                            } else {
                                navigation.goBack();
                            }
                        }}
                    >
                        <View style={styles.backIcon}>
                            <ChevronRightIcon size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>CORRIDA</Text>
                        <Text style={styles.headerTitle}>RASTREAR</Text>
                    </View>
                </View>

                {/* Main Stats */}
                <View style={styles.mainStats}>
                    {/* Distance */}
                    <BlurView intensity={30} tint="dark" style={styles.statCardLarge}>
                        <View style={styles.statCardContent}>
                            <Text style={styles.statValueLarge}>{distanceKm.toFixed(2)}</Text>
                            <Text style={styles.statLabelLarge}>KM</Text>
                        </View>
                    </BlurView>

                    {/* Time and Pace Row */}
                    <View style={styles.statRow}>
                        <BlurView intensity={20} tint="dark" style={styles.statCard}>
                            <View style={styles.statCardContent}>
                                <Text style={styles.statValue}>{formatDuration(elapsedSeconds)}</Text>
                                <Text style={styles.statLabel}>{t('events.duration').toUpperCase()}</Text>
                            </View>
                        </BlurView>
                        <BlurView intensity={20} tint="dark" style={styles.statCard}>
                            <View style={styles.statCardContent}>
                                <Text style={styles.statValue}>{formatPace(avgPace)}</Text>
                                <Text style={styles.statLabel}>{t('events.pace').toUpperCase()}</Text>
                            </View>
                        </BlurView>
                    </View>

                    {/* Points Preview */}
                    <BlurView intensity={20} tint="dark" style={styles.pointsPreview}>
                        <View style={styles.pointsContent}>
                            <Text style={styles.pointsLabel}>PONTOS</Text>
                            <Text style={styles.pointsValue}>+{pointsPreview}</Text>
                        </View>
                    </BlurView>
                </View>

                {/* Control Buttons */}
                <View style={styles.controls}>
                    {runState === 'idle' && (
                        <TouchableOpacity style={styles.startButton} onPress={startTracking}>
                            <Text style={styles.startButtonText}>INICIAR</Text>
                        </TouchableOpacity>
                    )}

                    {runState === 'running' && (
                        <View style={styles.runningControls}>
                            <TouchableOpacity style={styles.pauseButton} onPress={pauseTracking}>
                                <Text style={styles.controlButtonText}>⏸ PAUSAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.stopButton} onPress={finishRun}>
                                <Text style={styles.controlButtonText}>⏹ FINALIZAR</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {runState === 'paused' && (
                        <View style={styles.runningControls}>
                            <TouchableOpacity style={styles.resumeButton} onPress={resumeTracking}>
                                <Text style={styles.controlButtonText}>▶ CONTINUAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.stopButton} onPress={finishRun}>
                                <Text style={styles.controlButtonText}>⏹ FINALIZAR</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {runState === 'finished' && (
                        <TouchableOpacity style={styles.startButton} onPress={resetRun}>
                            <Text style={styles.startButtonText}>NOVA CORRIDA</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Points Legend */}
                <View style={styles.legend}>
                    <Text style={styles.legendTitle}>PONTOS POR DISTÂNCIA</Text>
                    <View style={styles.legendRow}>
                        <Text style={styles.legendItem}>0-2km: {RUN_POINTS.UNDER_2KM}pt</Text>
                        <Text style={styles.legendItem}>2-5km: {RUN_POINTS.UNDER_5KM}pts</Text>
                        <Text style={styles.legendItem}>5-10km: {RUN_POINTS.UNDER_10KM}pts</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <Text style={styles.legendItem}>10-21km: {RUN_POINTS.UNDER_21KM}pts</Text>
                        <Text style={styles.legendItem}>21km+: {RUN_POINTS.MARATHON_PLUS}pts</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 16,
    },
    backIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        transform: [{ rotate: '180deg' }],
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    // Main Stats
    mainStats: {
        paddingHorizontal: 20,
        flex: 1,
        justifyContent: 'center',
    },
    statCardLarge: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: theme.colors.brand.primary,
    },
    statCardContent: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    statValueLarge: {
        fontSize: 72,
        fontWeight: '900',
        fontStyle: 'italic',
        color: theme.colors.brand.primary,
        letterSpacing: -2,
    },
    statLabelLarge: {
        fontSize: 18,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 4,
    },
    statRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginTop: 4,
    },
    pointsPreview: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.success,
    },
    pointsContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    pointsLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
    },
    pointsValue: {
        fontSize: 32,
        fontWeight: '900',
        color: theme.colors.success,
    },
    // Controls
    controls: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    startButton: {
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
    },
    runningControls: {
        flexDirection: 'row',
        gap: 12,
    },
    pauseButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    resumeButton: {
        flex: 1,
        backgroundColor: theme.colors.success,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    stopButton: {
        flex: 1,
        backgroundColor: '#FF4444',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    controlButtonText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
    },
    // Legend
    legend: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    legendTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
        marginBottom: 8,
        textAlign: 'center',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 4,
    },
    legendItem: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
    },
});
