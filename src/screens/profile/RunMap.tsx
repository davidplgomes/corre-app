import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
// Se der erro de tipo no MapView, ignorar pois a lib pode não ter tipos perfeitos
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';

type RunMapProps = {
    navigation: any;
};

// Mock Data for a Run Route
const RUN_ROUTE = [
    { latitude: -23.5505, longitude: -46.6333 },
    { latitude: -23.5515, longitude: -46.6343 },
    { latitude: -23.5525, longitude: -46.6353 },
    { latitude: -23.5535, longitude: -46.6363 },
    { latitude: -23.5545, longitude: -46.6353 },
    { latitude: -23.5555, longitude: -46.6343 },
    { latitude: -23.5565, longitude: -46.6333 },
    { latitude: -23.5575, longitude: -46.6323 },
    { latitude: -23.5585, longitude: -46.6313 },
    { latitude: -23.5575, longitude: -46.6303 },
    { latitude: -23.5565, longitude: -46.6293 },
    { latitude: -23.5555, longitude: -46.6283 },
    { latitude: -23.5545, longitude: -46.6293 },
    { latitude: -23.5535, longitude: -46.6303 },
    { latitude: -23.5525, longitude: -46.6313 },
    { latitude: -23.5515, longitude: -46.6323 },
    { latitude: -23.5505, longitude: -46.6333 },
];

const INITIAL_REGION = {
    latitude: -23.5545,
    longitude: -46.6318,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
};

export const RunMap: React.FC<RunMapProps> = ({ navigation }) => {
    const [selectedRun, setSelectedRun] = useState({
        id: '1',
        date: 'Hoje, 07:30',
        distance: '5.2 km',
        time: '28m 45s',
        pace: "5'31\"/km",
        calories: '320 kcal'
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <MapView
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={INITIAL_REGION}
                customMapStyle={mapStyle} // Dark map style
            >
                {/* Route Line */}
                <Polyline
                    coordinates={RUN_ROUTE}
                    strokeColor={theme.colors.brand.primary}
                    strokeWidth={4}
                />

                {/* Start Marker */}
                <Marker coordinate={RUN_ROUTE[0]} title="Início">
                    <View style={styles.markerContainer}>
                        <View style={styles.startMarker} />
                    </View>
                </Marker>

                {/* End Marker */}
                <Marker coordinate={RUN_ROUTE[RUN_ROUTE.length - 1]} title="Fim">
                    <View style={styles.markerContainer}>
                        <View style={styles.endMarker} />
                    </View>
                </Marker>
            </MapView>

            {/* Header Overlay */}
            <SafeAreaView style={styles.headerOverlay} edges={['top']}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ChevronRightIcon size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MAPA DE CORRIDAS</Text>
            </SafeAreaView>

            {/* Bottom Card */}
            <View style={styles.bottomCardContainer}>
                <View style={styles.runCard}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardDate}>{selectedRun.date}</Text>
                            <Text style={styles.cardTitle}>Corrida Matinal</Text>
                        </View>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>CONCLUÍDO</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Distância</Text>
                            <Text style={styles.statValue}>{selectedRun.distance}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Tempo</Text>
                            <Text style={styles.statValue}>{selectedRun.time}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Pace</Text>
                            <Text style={styles.statValue}>{selectedRun.pace}</Text>
                        </View>
                    </View>
                </View>
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
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: theme.spacing[4],
        paddingTop: theme.spacing[2],
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        transform: [{ rotate: '180deg' }]
    },
    headerTitle: {
        fontSize: theme.typography.size.h4,
        fontWeight: theme.typography.weight.bold as any,
        color: '#000',
        marginLeft: theme.spacing[4],
        backgroundColor: 'rgba(255,255,255,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    startMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.success,
        borderWidth: 2,
        borderColor: '#fff',
    },
    endMarker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.error,
        borderWidth: 2,
        borderColor: '#fff',
    },
    bottomCardContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
    },
    runCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.xl,
        padding: theme.spacing[5],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing[4],
    },
    cardDate: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: theme.typography.size.h3,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.success,
        marginRight: 6,
    },
    liveText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.success,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: theme.typography.size.caption,
        color: theme.colors.text.tertiary,
        marginBottom: 2,
    },
    statValue: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: theme.colors.border.default,
    },
});

// Dark Map Style (Snazzy Maps standard dark theme style)
const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#212121"
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
        "featureType": "administrative.country",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    },
    {
        "featureType": "administrative.land_parcel",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#bdbdbd"
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
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#616161"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#1b1b1b"
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
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#8a8a8a"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#373737"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#3c3c3c"
            }
        ]
    },
    {
        "featureType": "road.highway.controlled_access",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#4e4e4e"
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#616161"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
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
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#3d3d3d"
            }
        ]
    }
];
