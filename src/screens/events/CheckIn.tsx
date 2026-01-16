import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { Button, Card, LoadingSpinner } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { createCheckIn } from '../../services/supabase/checkins';
import { getCurrentLocation } from '../../services/geolocation';
import { calculateDistance, formatDistance } from '../../utils/distance';
import { isWithinCheckInWindow } from '../../utils/date';
import { Event } from '../../types';
import { EVENT_POINTS } from '../../constants/points';

type CheckInProps = {
    route: { params: { eventId: string; event: Event } };
    navigation: any;
};

export const CheckIn: React.FC<CheckInProps> = ({ route, navigation }) => {
    const { t } = useTranslation();
    const { profile, refreshProfile } = useAuth();
    const { eventId, event } = route.params;

    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [distance, setDistance] = useState<number | null>(null);
    const [canCheckIn, setCanCheckIn] = useState(false);

    useEffect(() => {
        loadLocation();
    }, []);

    const loadLocation = async () => {
        try {
            const location = await getCurrentLocation();
            if (location) {
                setUserLocation(location);
                const dist = calculateDistance(
                    location.latitude,
                    location.longitude,
                    event.location_lat,
                    event.location_lng
                );
                setDistance(dist);

                const isWithinRadius = dist <= (event.check_in_radius_meters || 300);
                const isWithinTime = isWithinCheckInWindow(event.event_datetime);
                setCanCheckIn(isWithinRadius && isWithinTime);
            }
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert(t('common.error'), t('errors.locationPermissionDenied'));
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        if (!profile?.id || !userLocation) return;

        setCheckingIn(true);

        try {
            const result = await createCheckIn(
                eventId,
                profile.id,
                userLocation.latitude,
                userLocation.longitude
            );

            if (result.success) {
                const points = EVENT_POINTS[event.event_type as keyof typeof EVENT_POINTS];
                Alert.alert(
                    t('common.success'),
                    t('events.checkInSuccess', { points }),
                    [
                        {
                            text: t('common.ok'),
                            onPress: () => {
                                refreshProfile();
                                navigation.goBack();
                            },
                        },
                    ]
                );
            } else {
                Alert.alert(t('common.error'), result.error || t('events.checkInError'));
            }
        } catch (error) {
            console.error('Error checking in:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setCheckingIn(false);
        }
    };

    if (loading) {
        return <LoadingSpinner text="Getting your location..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Map */}
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: event.location_lat,
                    longitude: event.location_lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
            >
                {/* Event Location Marker */}
                <Marker
                    coordinate={{
                        latitude: event.location_lat,
                        longitude: event.location_lng,
                    }}
                    title={event.title}
                    description={event.location_name ?? undefined}
                />

                {/* Check-In Radius Circle */}
                <Circle
                    center={{
                        latitude: event.location_lat,
                        longitude: event.location_lng,
                    }}
                    radius={event.check_in_radius_meters || 300}
                    fillColor="rgba(124, 58, 237, 0.1)"
                    strokeColor="rgba(124, 58, 237, 0.5)"
                    strokeWidth={2}
                />

                {/* User Location Marker */}
                {userLocation && (
                    <Marker
                        coordinate={userLocation}
                        title="You"
                        pinColor="#10B981"
                    />
                )}
            </MapView>

            {/* Check-In Card */}
            <View style={styles.bottomCard}>
                <Card variant="elevated" style={styles.card}>
                    <Text style={styles.eventTitle}>{event.title}</Text>

                    {distance !== null && (
                        <View style={styles.distanceRow}>
                            <Text style={styles.distanceLabel}>Distance: </Text>
                            <Text style={[
                                styles.distanceValue,
                                { color: canCheckIn ? '#10B981' : '#EF4444' }
                            ]}>
                                {formatDistance(distance)}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.radiusInfo}>
                        Check-in radius: {event.check_in_radius_meters || 300}m
                    </Text>

                    {!canCheckIn && distance !== null && distance > (event.check_in_radius_meters || 300) && (
                        <Text style={styles.warningText}>
                            {t('events.tooFarFromEvent')}
                        </Text>
                    )}

                    {!isWithinCheckInWindow(event.event_datetime) && (
                        <Text style={styles.warningText}>
                            {t('events.checkInWindowClosed')}
                        </Text>
                    )}

                    <View style={styles.actions}>
                        <Button
                            title={t('events.checkIn')}
                            onPress={handleCheckIn}
                            loading={checkingIn}
                            disabled={!canCheckIn}
                        />
                        <Button
                            title={t('common.cancel')}
                            onPress={() => navigation.goBack()}
                            variant="ghost"
                            style={styles.cancelButton}
                        />
                    </View>
                </Card>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    map: {
        flex: 1,
    },
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    card: {
        padding: 20,
    },
    eventTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
    },
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    distanceLabel: {
        fontSize: 16,
        color: '#6B7280',
    },
    distanceValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    radiusInfo: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 12,
    },
    warningText: {
        fontSize: 14,
        color: '#EF4444',
        marginBottom: 12,
        fontWeight: '500',
    },
    actions: {
        marginTop: 8,
    },
    cancelButton: {
        marginTop: 8,
    },
});
