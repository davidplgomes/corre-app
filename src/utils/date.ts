/**
 * Format date to localized string
 */
export const formatDate = (date: Date | string, locale: string = 'en'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

/**
 * Format date and time to localized string
 */
export const formatDateTime = (
    date: Date | string,
    locale: string = 'en'
): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Format time only
 */
export const formatTime = (date: Date | string, locale: string = 'en'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (date: Date | string, locale: string = 'en'): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (Math.abs(diffMins) < 60) {
        if (diffMins === 0) return locale === 'pt' ? 'agora' : locale === 'es' ? 'ahora' : 'now';
        if (diffMins > 0) {
            return locale === 'pt'
                ? `em ${diffMins} min`
                : locale === 'es'
                    ? `en ${diffMins} min`
                    : `in ${diffMins} min`;
        }
        return locale === 'pt'
            ? `há ${-diffMins} min`
            : locale === 'es'
                ? `hace ${-diffMins} min`
                : `${-diffMins} min ago`;
    }

    if (Math.abs(diffHours) < 24) {
        if (diffHours > 0) {
            const hours = locale === 'pt' || locale === 'es' ? 'h' : 'h';
            return locale === 'pt'
                ? `em ${diffHours}${hours}`
                : locale === 'es'
                    ? `en ${diffHours}${hours}`
                    : `in ${diffHours}${hours}`;
        }
        const hours = locale === 'pt' || locale === 'es' ? 'h' : 'h';
        return locale === 'pt'
            ? `há ${-diffHours}${hours}`
            : locale === 'es'
                ? `hace ${-diffHours}${hours}`
                : `${-diffHours}${hours} ago`;
    }

    if (diffDays > 0) {
        const days = locale === 'pt' ? 'dias' : locale === 'es' ? 'días' : 'days';
        return locale === 'pt'
            ? `em ${diffDays} ${days}`
            : locale === 'es'
                ? `en ${diffDays} ${days}`
                : `in ${diffDays} ${days}`;
    }

    const days = locale === 'pt' ? 'dias' : locale === 'es' ? 'días' : 'days';
    return locale === 'pt'
        ? `há ${-diffDays} ${days}`
        : locale === 'es'
            ? `hace ${-diffDays} ${days}`
            : `${-diffDays} ${days} ago`;
};

/**
 * Check if a time is within the check-in window (±30 minutes from event time)
 */
export const isWithinCheckInWindow = (
    eventTime: Date | string,
    currentTime: Date = new Date(),
    windowMinutes: number = 30
): boolean => {
    const eventDate = typeof eventTime === 'string' ? new Date(eventTime) : eventTime;
    const diffMs = Math.abs(currentTime.getTime() - eventDate.getTime());
    const diffMins = diffMs / 60000;
    return diffMins <= windowMinutes;
};

/**
 * Check if event is upcoming (in the future)
 */
export const isUpcoming = (eventTime: Date | string): boolean => {
    const eventDate = typeof eventTime === 'string' ? new Date(eventTime) : eventTime;
    return eventDate.getTime() > new Date().getTime();
};

/**
 * Check if event is past
 */
export const isPast = (eventTime: Date | string): boolean => {
    const eventDate = typeof eventTime === 'string' ? new Date(eventTime) : eventTime;
    return eventDate.getTime() < new Date().getTime();
};

/**
 * Get first day of current month
 */
export const getFirstDayOfMonth = (date: Date = new Date()): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Get last day of current month
 */
export const getLastDayOfMonth = (date: Date = new Date()): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Format date for calendar marked dates (YYYY-MM-DD)
 */
export const formatDateForCalendar = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
};
