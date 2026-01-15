import * as Location from 'expo-location';

/**
 * Request location permissions
 */
export const requestLocationPermission = async (): Promise<boolean> => {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error requesting location permission:', error);
        return false;
    }
};

/**
 * Check if location permissions are granted
 */
export const hasLocationPermission = async (): Promise<boolean> => {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.error('Error checking location permission:', error);
        return false;
    }
};

/**
 * Get current location
 */
export const getCurrentLocation = async (): Promise<{
    latitude: number;
    longitude: number;
} | null> => {
    try {
        const hasPermission = await hasLocationPermission();
        if (!hasPermission) {
            const granted = await requestLocationPermission();
            if (!granted) {
                throw new Error('Location permission not granted');
            }
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        console.error('Error getting current location:', error);
        return null;
    }
};

/**
 * Watch location changes
 */
export const watchLocation = async (
    callback: (location: { latitude: number; longitude: number }) => void
): Promise<Location.LocationSubscription | null> => {
    try {
        const hasPermission = await hasLocationPermission();
        if (!hasPermission) {
            const granted = await requestLocationPermission();
            if (!granted) {
                throw new Error('Location permission not granted');
            }
        }

        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
            },
            (location) => {
                callback({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            }
        );

        return subscription;
    } catch (error) {
        console.error('Error watching location:', error);
        return null;
    }
};
