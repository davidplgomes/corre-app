import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    StatusBar,
    Platform,
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

export const RunMap: React.FC<RunMapProps & { route: any }> = ({ navigation, route }) => {
    const { run } = route.params || {};
    const { t } = useTranslation();

    const [selectedRun] = useState({
        id: run?.id || '1',
        date: run?.date ? new Date(run.date).toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase() : 'TODAY, 07:30',
        distance: run?.distance || '5.2',
        time: run?.time || '28:45',
        pace: run?.pace || "5'31\"",
        calories: run?.calories || '320'
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
                <Marker coordinate={RUN_ROUTE[0]} title="Start">
                    <View style={styles.markerContainer}>
                        <View style={styles.startMarker} />
                    </View>
                </Marker>

                {/* End Marker */}
                <Marker coordinate={RUN_ROUTE[RUN_ROUTE.length - 1]} title="End">
                    <View style={styles.markerContainer}>
                        <View style={styles.endMarker} />
                    </View>
                </Marker>
            </MapView>

            {/* Glass Wrapper for entire UIOverlay to ensure readability if map is light, though map is dark */}

            {/* Header Overlay */}
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

            {/* Bottom Card - HUD Style */}
            <View style={styles.bottomCardContainer}>
                <BlurView intensity={40} tint="dark" style={styles.runCard}>
                    <View style={styles.glassContent}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.cardTitle}>{t('events.morningRun').toUpperCase()}</Text>
                                <View style={styles.tagRow}>
                                    <View style={[styles.tag, { backgroundColor: theme.colors.brand.primary }]}>
                                        <Text style={styles.tagText}>{t('profile.completed').toUpperCase()}</Text>
                                    </View>
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
                                <Text style={styles.statLabel}>{t('profile.distance').toUpperCase()} (KM)</Text>
                                <Text style={styles.statValue}>{selectedRun.distance}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>{t('profile.time').toUpperCase()}</Text>
                                <Text style={styles.statValue}>{selectedRun.time}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>PACE</Text>
                                <Text style={styles.statValue}>{selectedRun.pace}</Text>
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
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
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
    },
    headerDate: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '700',
        letterSpacing: 1,
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
    bottomCardContainer: {
        position: 'absolute',
        bottom: 100, // Increased to clear navbar
        left: 20,
        right: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    runCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    glassContent: {
        padding: 24,
        backgroundColor: 'rgba(0,0,0,0.6)', // Deep dark tint
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        includeFontPadding: false,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    brandStamp: {
        // Container for logo
    },
    brandLogo: {
        width: 120, // Increased from 80
        height: 36, // Increased from 24
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    statItem: {
        alignItems: 'flex-start',
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
        includeFontPadding: false,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 10,
        marginBottom: 2,
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
