import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Button, Input, Card } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';
import { createEvent, updateEvent } from '../../services/supabase/events';
import { Event } from '../../types';
import { EVENT_POINTS } from '../../constants/points';
import { theme } from '../../constants/theme';

type CreateEventProps = {
    navigation: any;
    route: { params?: { event?: Event } };
};

export const CreateEvent: React.FC<CreateEventProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { profile } = useAuth();

    const [title, setTitle] = useState(route.params?.event?.title || '');
    const [description, setDescription] = useState(route.params?.event?.description || '');
    const [eventType, setEventType] = useState<'routine' | 'special' | 'race'>(route.params?.event?.event_type || 'routine');
    const [date, setDate] = useState(route.params?.event?.event_datetime ? new Date(route.params.event.event_datetime) : new Date());
    const [locationName, setLocationName] = useState(route.params?.event?.location_name || '');
    const [locationLat, setLocationLat] = useState(route.params?.event?.location_lat?.toString() || '41.1579');
    const [locationLng, setLocationLng] = useState(route.params?.event?.location_lng?.toString() || '-8.6291');
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const isEditing = !!route.params?.event;

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert(t('common.error'), t('validation.required'));
            return;
        }

        if (!profile?.id) {
            Alert.alert(t('common.error'), t('errors.unknownError'));
            return;
        }

        setLoading(true);

        try {
            const eventData = {
                title,
                description,
                event_type: eventType,
                points_value: EVENT_POINTS[eventType],
                event_datetime: date.toISOString(),
                location_lat: parseFloat(locationLat),
                location_lng: parseFloat(locationLng),
                location_name: locationName,
                check_in_radius_meters: 300,
                creator_id: profile.id,
            };

            if (isEditing && route.params?.event) {
                await updateEvent(route.params.event.id, eventData);
                Alert.alert(t('common.success'), 'Evento atualizado com sucesso!');
            } else {
                await createEvent(eventData);
                Alert.alert(t('common.success'), t('events.createEventSuccess'));
            }

            navigation.goBack();
        } catch (error) {
            console.error('Error saving event:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <Text style={styles.title}>{isEditing ? t('events.editEvent') : t('events.createEvent')}</Text>

                    {/* Event Title */}
                    <Input
                        label={t('events.eventTitle')}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Morning Run at Ribeira"
                    />

                    {/* Description */}
                    <Input
                        label={t('events.description')}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Join us for a casual morning run..."
                        multiline
                        numberOfLines={3}
                    />

                    {/* Event Type */}
                    <View style={styles.pickerContainer}>
                        <Text style={styles.label}>{t('events.eventType')}</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={eventType}
                                onValueChange={(value) => setEventType(value)}
                                style={styles.picker}
                            >
                                <Picker.Item
                                    label={`${t('events.eventTypes.routine')} (${EVENT_POINTS.routine} pts)`}
                                    value="routine"
                                />
                                <Picker.Item
                                    label={`${t('events.eventTypes.special')} (${EVENT_POINTS.special} pts)`}
                                    value="special"
                                />
                                <Picker.Item
                                    label={`${t('events.eventTypes.race')} (${EVENT_POINTS.race} pts)`}
                                    value="race"
                                />
                            </Picker>
                        </View>
                    </View>

                    {/* Date & Time */}
                    <Card variant="outlined" style={styles.dateTimeCard}>
                        <Text style={styles.label}>{t('events.date')} & {t('events.time')}</Text>
                        <View style={styles.dateTimeRow}>
                            <Button
                                title={date.toLocaleDateString()}
                                onPress={() => setShowDatePicker(true)}
                                variant="secondary"
                                size="small"
                                style={styles.dateButton}
                            />
                            <Button
                                title={date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                onPress={() => setShowTimePicker(true)}
                                variant="secondary"
                                size="small"
                                style={styles.timeButton}
                            />
                        </View>
                    </Card>

                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={date}
                            mode="time"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowTimePicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}

                    {/* Location */}
                    <Input
                        label={t('events.location')}
                        value={locationName}
                        onChangeText={setLocationName}
                        placeholder="Ribeira, Porto"
                    />

                    {/* Location Coordinates (simplified) */}
                    <View style={styles.coordsRow}>
                        <Input
                            label="Latitude"
                            value={locationLat}
                            onChangeText={setLocationLat}
                            keyboardType="numeric"
                            containerStyle={styles.coordInput}
                        />
                        <Input
                            label="Longitude"
                            value={locationLng}
                            onChangeText={setLocationLng}
                            keyboardType="numeric"
                            containerStyle={styles.coordInput}
                        />
                    </View>

                    {/* Create/Update Button */}
                    <Button
                        title={isEditing ? t('events.saveChanges') : t('events.createEvent')}
                        onPress={handleSave}
                        loading={loading}
                        style={styles.createButton}
                    />

                    {/* Cancel Button */}
                    <Button
                        title={t('common.cancel')}
                        onPress={() => navigation.goBack()}
                        variant="ghost"
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    pickerContainer: {
        marginBottom: 16,
    },
    pickerWrapper: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        overflow: 'hidden',
    },
    picker: {
        height: 48,
    },
    dateTimeCard: {
        marginBottom: 16,
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateButton: {
        flex: 1,
    },
    timeButton: {
        flex: 1,
    },
    coordsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    coordInput: {
        flex: 1,
    },
    createButton: {
        marginTop: 16,
        marginBottom: 12,
    },
});
