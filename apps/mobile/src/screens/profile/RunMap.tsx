import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Image,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { theme } from '../../constants/theme';
import { useTranslation } from 'react-i18next';
import { BackButton } from '../../components/common';
import * as Haptics from 'expo-haptics';

type RunMapProps = {
    navigation: any;
};

const INITIAL_REGION = {
    latitude: -23.5545,
    longitude: -46.6318,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
};

// Polyline Decoder for Strava
const decodePolyline = (t: string, e: number = 5) => {
    let n = 0, a = 0, r = 0, o = [];
    for (let u = 0, l = t.length; u < l;) {
        let h, c = 0, f = 0;
        do {
            h = t.charCodeAt(u++) - 63;
            f |= (h & 31) << c;
            c += 5;
        } while (h >= 32);
        let d = (f & 1) ? ~(f >> 1) : (f >> 1);
        a += d;
        c = 0;
        f = 0;
        do {
            h = t.charCodeAt(u++) - 63;
            f |= (h & 31) << c;
            c += 5;
        } while (h >= 32);
        let g = (f & 1) ? ~(f >> 1) : (f >> 1);
        r += g;
        o.push({ latitude: a / Math.pow(10, e), longitude: r / Math.pow(10, e) });
    }
    return o;
};

// Helper to center the map on the route
const getRegionForCoordinates = (points: { latitude: number, longitude: number }[]) => {
    if (!points || points.length === 0) return INITIAL_REGION;

    let minX = points[0].latitude, maxX = points[0].latitude;
    let minY = points[0].longitude, maxY = points[0].longitude;

    points.forEach((point) => {
        minX = Math.min(minX, point.latitude);
        maxX = Math.max(maxX, point.latitude);
        minY = Math.min(minY, point.longitude);
        maxY = Math.max(maxY, point.longitude);
    });

    return {
        latitude: (minX + maxX) / 2,
        longitude: (minY + maxY) / 2,
        latitudeDelta: Math.max((maxX - minX) * 1.5, 0.015),
        longitudeDelta: Math.max((maxY - minY) * 1.5, 0.015)
    };
};

// Helper to format pace value
const formatPaceDisplay = (pace: any): string => {
    if (!pace) return "0'00\"";
    // If it's already formatted (contains ' or ")
    if (typeof pace === 'string' && (pace.includes("'") || pace.includes('"') || pace.includes(':'))) {
        return pace;
    }
    // If it's a number (seconds per km), format it
    const paceNum = typeof pace === 'number' ? pace : parseFloat(pace);
    if (isNaN(paceNum)) return "0'00\"";
    const minutes = Math.floor(paceNum / 60);
    const seconds = Math.floor(paceNum % 60);
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
};

export const RunMap: React.FC<RunMapProps & { route: any }> = ({ navigation, route }) => {
    const { run } = route.params || {};
    const { t } = useTranslation();

    const [selectedRun] = useState({
        id: run?.id || '1',
        date: run?.date ? new Date(run.date).toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase() : 'TODAY, 07:30',
        distance: run?.distance || '5.2',
        time: run?.time || '28:45',
        pace: formatPaceDisplay(run?.pace),
        calories: run?.calories || '320',
        name: run?.name || t('events.morningRun').toUpperCase(),
        source: run?.source || 'manual',
        points: run?.points || 0
    });

    const [actualRoute, setActualRoute] = useState<any[]>([]);

    // Simplify route to reduce memory usage (keep every Nth point)
    const simplifyRoute = useCallback((points: any[], maxPoints = 200) => {
        if (points.length <= maxPoints) return points;
        const step = Math.ceil(points.length / maxPoints);
        const simplified = points.filter((_, i) => i % step === 0 || i === points.length - 1);
        console.log(`[RunMap] Simplified route from ${points.length} to ${simplified.length} points`);
        return simplified;
    }, []);

    useEffect(() => {
        let mounted = true;

        const processRoute = () => {
            // For Strava activities with polyline data
            if (run?.source === 'strava' && run?.route_data && typeof run.route_data === 'string' && run.route_data.length > 0) {
                try {
                    const decoded = decodePolyline(run.route_data);
                    if (mounted && decoded.length > 0) {
                        setActualRoute(simplifyRoute(decoded));
                    }
                } catch (e) {
                    console.error('[RunMap] Failed to decode polyline:', e);
                }
            }
            // For manual runs with GPS data
            else if (run?.source === 'manual' && Array.isArray(run?.route_data) && run.route_data.length > 0) {
                const mapped = run.route_data.map((pt: any) => ({
                    latitude: pt.lat || pt.latitude,
                    longitude: pt.lng || pt.longitude
                }));
                if (mounted) {
                    setActualRoute(simplifyRoute(mapped));
                }
            }
        };

        processRoute();

        // Cleanup on unmount
        return () => {
            mounted = false;
            setActualRoute([]);
        };
    }, [run, simplifyRoute]);

    // Memoize region to prevent re-renders causing marker blinking
    const mapRegion = useMemo(() => {
        // For activities with route data, center on the route
        if (actualRoute.length > 0) {
            return getRegionForCoordinates(actualRoute);
        }
        // For any activity with start coordinates (Strava, events), center on that location
        if (run?.location_lat && run?.location_lng) {
            return { latitude: run.location_lat, longitude: run.location_lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        }
        return INITIAL_REGION;
    }, [run?.location_lat, run?.location_lng, actualRoute]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <MapView
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={mapRegion}
                customMapStyle={mapStyle}
                rotateEnabled={false}
                pitchEnabled={false}
            >
                {/* Show route with start/end markers if we have route data */}
                {actualRoute.length > 0 && (
                    <>
                        <Polyline
                            key="route-line"
                            coordinates={actualRoute}
                            strokeColor={theme.colors.brand.primary}
                            strokeWidth={4}
                        />
                        <Marker
                            key="start-marker"
                            coordinate={actualRoute[0]}
                            title="Start"
                            tracksViewChanges={false}
                        >
                            <View style={styles.markerContainer}>
                                <View style={styles.startMarker} />
                            </View>
                        </Marker>
                        <Marker
                            key="end-marker"
                            coordinate={actualRoute[actualRoute.length - 1]}
                            title="End"
                            tracksViewChanges={false}
                        >
                            <View style={styles.markerContainer}>
                                <View style={styles.endMarker} />
                            </View>
                        </Marker>
                    </>
                )}

                {/* Show location marker if no route but we have coordinates */}
                {actualRoute.length === 0 && run?.location_lat && run?.location_lng && (
                    <Marker
                        key="location-marker"
                        coordinate={{ latitude: run.location_lat, longitude: run.location_lng }}
                        title={selectedRun.name}
                        tracksViewChanges={false}
                    >
                        <View style={styles.markerContainer}>
                            <View style={selectedRun.source === 'event' ? styles.eventMarker : styles.startMarker} />
                        </View>
                    </Marker>
                )}
            </MapView>

            {/* No GPS Track Message - show when no route data (but may have location point) */}
            {actualRoute.length === 0 && (
                <View style={styles.noTrackOverlay}>
                    <BlurView intensity={30} tint="dark" style={styles.noTrackBadge}>
                        <Text style={styles.noTrackText}>
                            {run?.location_lat
                                ? t('runMap.noRouteTrack', 'Route not recorded')
                                : t('runMap.noGpsTrack', 'No GPS data available')}
                        </Text>
                    </BlurView>
                </View>
            )}

            {/* Header Overlay */}
            <BlurView intensity={40} tint="dark" style={styles.headerBlur}>
                <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                    <View style={styles.headerRow}>
                        <BackButton onPress={() => {
                            Haptics.selectionAsync();
                            navigation.goBack();
                        }} color="#FFF" size={24} />
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>RUN SUMMARY</Text>
                            <Text style={styles.headerDate}>{selectedRun.date}</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </BlurView>

            {/* Bottom Card - Premium Glass Style */}
            <View style={styles.bottomCardContainer}>
                <BlurView intensity={30} tint="dark" style={styles.runCard}>
                    <View style={styles.glassContent}>
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.cardTitle} numberOfLines={1}>{selectedRun.name.toUpperCase()}</Text>
                                <View style={styles.tagRow}>
                                    <View style={[styles.tag, { backgroundColor: theme.colors.brand.primary }]}>
                                        <Text style={styles.tagText}>{t('profile.completed').toUpperCase()}</Text>
                                    </View>
                                    {selectedRun.points > 0 && (
                                        <View style={[styles.tag, { backgroundColor: theme.colors.success }]}>
                                            <Text style={styles.tagText}>+{selectedRun.points}</Text>
                                        </View>
                                    )}
                                    {selectedRun.source === 'strava' && (
                                        <View style={[styles.tag, { backgroundColor: '#FC4C02' }]}>
                                            <Text style={styles.tagText}>STRAVA</Text>
                                        </View>
                                    )}
                                    {selectedRun.source === 'event' && (
                                        <View style={[styles.tag, { backgroundColor: '#7C3AED' }]}>
                                            <Text style={styles.tagText}>EVENT</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {/* Logo stamp or brand element could go here */}
                            <View style={styles.brandStamp}>
                                <Image
                                    source={require('../../../assets/logo_transparent.png')}
                                    style={styles.brandLogo}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel} numberOfLines={1}>KM</Text>
                                <Text style={styles.statValue} numberOfLines={1}>{selectedRun.distance}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel} numberOfLines={1}>TIME</Text>
                                <Text style={styles.statValue} numberOfLines={1}>{selectedRun.time}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel} numberOfLines={1}>PACE</Text>
                                <Text style={styles.statValue} numberOfLines={1}>{selectedRun.pace}</Text>
                            </View>
                        </View>
                    </View>
                </BlurView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        flex: 1,
    },
    headerBlur: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.35)',
        overflow: 'hidden',
    },
    headerOverlay: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitleContainer: {
        marginLeft: 16,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontStyle: 'italic',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '700',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    startMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: '#000',
    },
    endMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.brand.primary,
        borderWidth: 2,
        borderColor: '#000',
    },
    eventMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(124, 58, 237, 1)',
        borderWidth: 2,
        borderColor: '#000',
    },
    bottomCardContainer: {
        position: 'absolute',
        bottom: 120,
        left: 16,
        right: 16,
        // Premium glass shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    runCard: {
        borderRadius: 24,
        overflow: 'hidden',
        // Apple-style glass border
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    glassContent: {
        padding: 20,
        // Translucent glass effect (Apple style)
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '900',
        color: '#FFF',
        includeFontPadding: false,
        letterSpacing: 0.5,
    },
    tagRow: {
        flexDirection: 'row',
        marginTop: 6,
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        // Glass tag effect
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tagText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    brandStamp: {
        marginLeft: 8,
        opacity: 0.9,
    },
    brandLogo: {
        width: 60,
        height: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#FFF',
        includeFontPadding: false,
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 8,
    },
    noTrackOverlay: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    noTrackBadge: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        overflow: 'hidden',
    },
    noTrackText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

// Dark Map Style (Pitch Black Minimal)
const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#121212"
            }
        ]
    },
    {
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#212121"
            }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#181818"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#2c2c2c"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#000000"
            }
        ]
    }
];
