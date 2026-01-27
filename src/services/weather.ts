import * as Location from 'expo-location';
import Constants from 'expo-constants';

const OPENWEATHER_API_KEY = (
    Constants.expoConfig?.extra?.openWeatherApiKey ||
    process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ||
    ''
).trim();

// Debug log to ensure key is loaded (only first 4 chars for security)
if (__DEV__) {
    console.log('Weather API Key loaded:', OPENWEATHER_API_KEY ? `${OPENWEATHER_API_KEY.substring(0, 4)}...` : 'MISSING');
}

interface WeatherData {
    temp: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
}

interface WeatherResponse {
    main: {
        temp: number;
        feels_like: number;
        humidity: number;
    };
    weather: Array<{
        main: string;
        description: string;
        icon: string;
    }>;
    wind: {
        speed: number;
    };
}

const weatherIcons: Record<string, string> = {
    '01d': '☀️',  // Clear sky day
    '01n': '🌙',  // Clear sky night
    '02d': '⛅',  // Few clouds day
    '02n': '☁️',  // Few clouds night
    '03d': '☁️',  // Scattered clouds
    '03n': '☁️',
    '04d': '☁️',  // Broken clouds
    '04n': '☁️',
    '09d': '🌧️', // Shower rain
    '09n': '🌧️',
    '10d': '🌦️', // Rain day
    '10n': '🌧️', // Rain night
    '11d': '⛈️', // Thunderstorm
    '11n': '⛈️',
    '13d': '❄️', // Snow
    '13n': '❄️',
    '50d': '🌫️', // Mist
    '50n': '🌫️',
};

export const getWeatherIcon = (iconCode: string): string => {
    return weatherIcons[iconCode] || '🌡️';
};

export const formatWeather = (weather: WeatherData | null): string => {
    if (!weather) return '';
    const icon = getWeatherIcon(weather.icon);
    const temp = Math.round(weather.temp);
    return `${icon} ${temp}°C`;
};

export const getWeatherByCoords = async (
    lat: number,
    lon: number
): Promise<WeatherData | null> => {
    if (!OPENWEATHER_API_KEY) {
        console.warn('OpenWeather API key not configured');
        return null;
    }

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data: WeatherResponse = await response.json();

        return {
            temp: data.main.temp,
            feelsLike: data.main.feels_like,
            humidity: data.main.humidity,
            description: data.weather[0]?.description || '',
            icon: data.weather[0]?.icon || '01d',
            windSpeed: data.wind.speed,
        };
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
};

export const getCurrentLocationWeather = async (): Promise<WeatherData | null> => {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (status !== 'granted') {
            console.warn('Location permission not granted for weather');
            return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low, // Low accuracy is fine for weather
        });

        return getWeatherByCoords(
            location.coords.latitude,
            location.coords.longitude
        );
    } catch (error) {
        console.error('Error getting current location weather:', error);
        return null;
    }
};

export const getWeatherForEvent = async (
    eventLat: number,
    eventLon: number
): Promise<string> => {
    const weather = await getWeatherByCoords(eventLat, eventLon);

    if (weather) {
        return formatWeather(weather);
    }

    // Fallback to current location weather if event coords fail
    const currentWeather = await getCurrentLocationWeather();
    if (currentWeather) {
        return formatWeather(currentWeather);
    }

    return ''; // Return empty if no weather available
};
