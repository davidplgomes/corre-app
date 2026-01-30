import { EVENT_POINTS } from '../constants/points';

/**
 * Get points value for an event type
 */
export const getPointsForEventType = (
    eventType: 'routine' | 'special' | 'race'
): number => {
    return EVENT_POINTS[eventType];
};

/**
 * Calculate total points from check-ins
 */
export const calculateTotalPoints = (
    checkIns: Array<{ events: { event_type: string } }>
): number => {
    return checkIns.reduce((total, checkIn) => {
        const eventType = checkIn.events.event_type as 'routine' | 'special' | 'race';
        return total + getPointsForEventType(eventType);
    }, 0);
};

/**
 * Check if user has enough points for tier upgrade
 */
export const canUpgradeToBasico = (currentMonthPoints: number): boolean => {
    return currentMonthPoints >= 12;
};

/**
 * Format points for display
 */
export const formatPoints = (points: number, locale: string = 'en'): string => {
    const pointsText =
        locale === 'pt' ? 'pontos' : locale === 'es' ? 'puntos' : 'points';
    return `${points} ${pointsText}`;
};
