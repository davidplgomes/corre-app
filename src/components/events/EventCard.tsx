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
    const month = eventDate.toLocaleDateString(i18n.language, { month: 'short' }).toUpperCase();
    const weekday = eventDate.toLocaleDateString(i18n.language, { weekday: 'short' }).toUpperCase();

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
                <Text style={styles.pointsLabel}>Pontos</Text>
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
    },

    // Date Section
    dateSection: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing[2],
    },
    dateDay: {
        fontSize: theme.typography.size.h2,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
        lineHeight: theme.typography.size.h2 * 1.1,
    },
    dateMonth: {
        fontSize: theme.typography.size.caption,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.brand.primary,
        letterSpacing: theme.typography.letterSpacing.wide,
    },
    dateWeekday: {
        fontSize: theme.typography.size.micro,
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
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.semibold as any,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing[1],
    },
    location: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.tertiary,
    },

    // Points
    pointsSection: {
        alignItems: 'flex-end',
        marginLeft: theme.spacing[3],
    },
    pointsValue: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.brand.primary,
    },
    pointsLabel: {
        fontSize: theme.typography.size.micro,
        color: theme.colors.text.tertiary,
        letterSpacing: theme.typography.letterSpacing.wide,
    },
});
