import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Event } from '../../types';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';

interface EventCardProps {
    event: Event;
    onPress: () => void;
    style?: ViewStyle;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, style }) => {
    const { i18n } = useTranslation();

    // Format date
    const eventDate = new Date(event.event_datetime);
    const day = eventDate.getDate();
    const month = eventDate.toLocaleDateString(i18n.language, { month: 'short' }).toUpperCase().replace('.', '');
    const weekday = eventDate.toLocaleDateString(i18n.language, { weekday: 'short' }).toUpperCase().replace('.', '');

    // Points display
    const points = event.points_value || 150;

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Date Section */}
            <View style={styles.dateSection}>
                <Text style={styles.dateDay}>{day}</Text>
                <Text style={styles.dateMonth}>{month}</Text>
                <Text style={styles.dateWeekday}>{weekday}</Text>
            </View>

            {/* Accent Line */}
            <View style={styles.accentLine} />

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
                {event.location_name && (
                    <Text style={styles.location} numberOfLines={1}>
                        {event.location_name}
                    </Text>
                )}
            </View>

            {/* Points */}
            <View style={styles.pointsSection}>
                <Text style={styles.pointsValue}>+{points}</Text>
                <Text style={styles.pointsLabel}>PTS</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.card,
        borderRadius: theme.radius.lg,
        paddingVertical: theme.spacing[4],
        paddingRight: theme.spacing[4],
        marginBottom: theme.spacing[3],
        borderWidth: 1,
        borderColor: theme.colors.border.default,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },

    // Date Section
    dateSection: {
        width: 70, // Increased from 60 to fit 2-digit days
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing[3], // More padding
    },
    dateDay: {
        fontSize: 28, // Slightly smaller for safety
        fontWeight: '900' as any,
        color: theme.colors.text.primary,
        lineHeight: 34, // Proper line height
        includeFontPadding: false,
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '700' as any,
        color: theme.colors.brand.primary,
        letterSpacing: 1,
        textTransform: 'uppercase' as any,
        marginTop: 4,
    },
    dateWeekday: {
        fontSize: theme.typography.size.micro,
        fontWeight: '600' as any,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.wide,
        marginTop: theme.spacing[1],
    },

    // Accent
    accentLine: {
        width: 3,
        height: 48,
        borderRadius: 1.5,
        backgroundColor: theme.colors.brand.primary,
        marginRight: theme.spacing[4],
    },

    // Content
    content: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '800' as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
        letterSpacing: 0.3,
    },
    location: {
        fontSize: 13,
        fontWeight: '600' as any,
        color: theme.colors.text.tertiary,
    },

    // Points
    pointsSection: {
        alignItems: 'flex-end',
        marginLeft: theme.spacing[3],
    },
    pointsValue: {
        fontSize: 24,
        fontWeight: '900' as any,
        fontStyle: 'italic' as any,
        color: theme.colors.brand.primary,
        lineHeight: 24,
    },
    pointsLabel: {
        fontSize: 10,
        fontWeight: '700' as any,
        color: theme.colors.text.tertiary,
        letterSpacing: 1,
        textTransform: 'uppercase' as any,
    },
});
