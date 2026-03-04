import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StatusBar,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, LoadingSpinner, BackButton } from '../../components/common';
import { getCurrentGuestPass, useGuestPass } from '../../services/supabase/wallet';
import { supabase } from '../../services/supabase/client';
import { GuestPass } from '../../types';
import { isClubMembershipTier } from '../../constants/tiers';

interface GuestPassScreenProps {
    navigation: any;
}

export const GuestPassScreen: React.FC<GuestPassScreenProps> = ({ navigation }) => {
    const { t, i18n } = useTranslation();
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [guestPass, setGuestPass] = useState<GuestPass | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isClubMember = isClubMembershipTier(profile?.membershipTier);
    const dateLocale =
        i18n.language === 'pt' ? 'pt-BR'
            : i18n.language === 'es' ? 'es-ES'
                : 'en-GB';

    const loadData = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [passData, eventsData] = await Promise.all([
                getCurrentGuestPass(user.id),
                supabase
                    .from('events')
                    .select('id, title, event_datetime')
                    .gte('event_datetime', new Date().toISOString())
                    .order('event_datetime', { ascending: true })
                    .limit(10),
            ]);

            setGuestPass(passData);
            setEvents(eventsData.data || []);
        } catch (error) {
            console.error('Error loading guest pass:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUseGuestPass = async () => {
        if (!user?.id || !selectedEvent || !guestName.trim()) {
            Alert.alert(
                t('common.error'),
                t('guestPass.fillRequired', 'Please fill in all required fields')
            );
            return;
        }

        setSubmitting(true);
        try {
            const pass = await useGuestPass(user.id, guestName, guestEmail, selectedEvent);
            setGuestPass(pass);
            setShowInviteModal(false);
            Alert.alert(
                t('common.success'),
                t('guestPass.sentSuccess', { name: guestName, defaultValue: `Guest pass sent to ${guestName}!` })
            );
        } catch (error: any) {
            console.error('Error using guest pass:', error);
            Alert.alert(
                t('common.error'),
                error.message || t('guestPass.sendFailed', 'Failed to use guest pass')
            );
        } finally {
            setSubmitting(false);
        }
    };

    const currentMonth = new Date().toLocaleDateString(dateLocale, {
        month: 'long',
        year: 'numeric',
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    if (!isClubMember) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="light-content" />
                <View style={styles.header}>
                    <BackButton style={styles.backButton} />
                    <Text style={styles.headerTitle}>{t('profile.guestPass')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.upgradeContainer}>
                    <View style={styles.lockIcon}>
                        <Ionicons name="lock-closed" size={48} color="#888" />
                    </View>
                    <Text style={styles.upgradeTitle}>{t('guestPass.clubOnlyTitle', 'Club Members Only')}</Text>
                    <Text style={styles.upgradeText}>
                        {t(
                            'guestPass.clubOnlyDescription',
                            'Guest Pass is an exclusive benefit for Corre Club members. Upgrade to invite one friend per month to any exclusive event!'
                        )}
                    </Text>
                    <Button
                        title={t('guestPass.upgradeToClub', 'Upgrade to Club')}
                        onPress={() => navigation.navigate('SubscriptionScreen')}
                        style={styles.upgradeButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.guestPass')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Pass Card */}
                <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.passCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.passHeader}>
                        <View style={styles.passIcon}>
                            <Ionicons name="ticket" size={32} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.passTitle}>{t('guestPass.title', 'Guest Pass')}</Text>
                            <Text style={styles.passMonth}>{currentMonth}</Text>
                        </View>
                    </View>

                    {guestPass?.used_at ? (
                        <View style={styles.passUsedContainer}>
                            <View style={styles.passUsed}>
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                            <View style={styles.passUsedInfo}>
                                    <Text style={styles.passUsedLabel}>{t('guestPass.invited', 'Invited')}</Text>
                                    <Text style={styles.passUsedName}>{guestPass.guest_name}</Text>
                                    {guestPass.event && (
                                        <Text style={styles.passUsedEvent}>{guestPass.event.title}</Text>
                                    )}
                                </View>
                            </View>
                            {guestPass.verification_code && (
                                <View style={styles.verificationCodeContainer}>
                                    <Text style={styles.verificationLabel}>{t('guestPass.checkInCode', 'CHECK-IN CODE')}</Text>
                                    <Text style={styles.verificationCode}>{guestPass.verification_code}</Text>
                                    <Text style={styles.verificationHint}>
                                        {t('guestPass.codeHint', 'Show this code at the event entrance')}
                                    </Text>
                                    {guestPass.checked_in_at && (
                                        <View style={styles.checkedInBadge}>
                                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                            <Text style={styles.checkedInText}>{t('events.checkedIn', 'Checked in')}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.passAvailable}>
                            <Text style={styles.passAvailableText}>{t('guestPass.onePassAvailable', '1 Pass Available')}</Text>
                            <Text style={styles.passAvailableSubtext}>
                                {t('guestPass.availableSubtext', 'Invite a friend to join you at an exclusive event!')}
                            </Text>
                        </View>
                    )}
                </LinearGradient>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>{t('guestPass.howItWorks', 'How It Works')}</Text>
                    <View style={styles.infoItem}>
                        <View style={styles.infoNumber}>
                            <Text style={styles.infoNumberText}>1</Text>
                        </View>
                        <Text style={styles.infoText}>
                            {t('guestPass.step1', 'You get 1 Guest Pass per month as a Club member')}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <View style={styles.infoNumber}>
                            <Text style={styles.infoNumberText}>2</Text>
                        </View>
                        <Text style={styles.infoText}>
                            {t('guestPass.step2', 'Choose an upcoming exclusive event')}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <View style={styles.infoNumber}>
                            <Text style={styles.infoNumberText}>3</Text>
                        </View>
                        <Text style={styles.infoText}>
                            {t('guestPass.step3', "Enter your guest's details to send the invite")}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <View style={styles.infoNumber}>
                            <Text style={styles.infoNumberText}>4</Text>
                        </View>
                        <Text style={styles.infoText}>{t('guestPass.step4', 'Your guest can attend the event with you!')}</Text>
                    </View>
                </View>

                {/* Use Button */}
                {!guestPass?.used_at && (
                    <Button
                        title={t('guestPass.inviteGuest')}
                        onPress={() => setShowInviteModal(true)}
                        style={styles.inviteButton}
                    />
                )}
            </ScrollView>

            {/* Invite Modal */}
            <Modal
                visible={showInviteModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowInviteModal(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('guestPass.inviteGuest')}</Text>
                        <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('guestPass.guestName', 'Guest Name')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={guestName}
                                onChangeText={setGuestName}
                                placeholder={t('guestPass.guestNamePlaceholder', "Enter guest's name")}
                                placeholderTextColor={theme.colors.text.tertiary}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('guestPass.guestEmail', 'Guest Email')} *</Text>
                            <TextInput
                                style={styles.input}
                                value={guestEmail}
                                onChangeText={setGuestEmail}
                                placeholder={t('guestPass.guestEmailPlaceholder', "Enter guest's email")}
                                placeholderTextColor={theme.colors.text.tertiary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <Text style={styles.inputHint}>
                                {t('guestPass.emailHint', 'The check-in code will be sent to this email')}
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t('guestPass.selectEvent', 'Select Event')} *</Text>
                            {events.length === 0 && (
                                <Text style={styles.inputHint}>
                                    {t('guestPass.noUpcomingEvents', 'No upcoming events are available right now.')}
                                </Text>
                            )}
                            {events.map(event => (
                                <TouchableOpacity
                                    key={event.id}
                                    style={[
                                        styles.eventOption,
                                        selectedEvent === event.id && styles.eventOptionSelected
                                    ]}
                                    onPress={() => setSelectedEvent(event.id)}
                                >
                                    <View style={styles.radioOuter}>
                                        {selectedEvent === event.id && <View style={styles.radioInner} />}
                                    </View>
                                    <View style={styles.eventInfo}>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <Text style={styles.eventDate}>
                                            {new Date(event.event_datetime).toLocaleDateString(dateLocale, {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <Button
                            title={
                                submitting
                                    ? t('guestPass.sending', 'Sending...')
                                    : t('guestPass.sendGuestPass', 'Send Guest Pass')
                            }
                            onPress={handleUseGuestPass}
                            disabled={submitting || !guestName.trim() || !guestEmail.trim() || !selectedEvent}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },

    // Pass Card
    passCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
    },
    passHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    passIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    passTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    passMonth: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    passUsed: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        padding: 16,
    },
    passUsedInfo: {
        marginLeft: 12,
    },
    passUsedLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    passUsedName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    passUsedEvent: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    passUsedContainer: {
        gap: 16,
    },
    verificationCodeContainer: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    verificationLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 8,
    },
    verificationCode: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 4,
        fontFamily: 'monospace',
    },
    verificationHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 8,
        textAlign: 'center',
    },
    checkedInBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        gap: 6,
    },
    checkedInText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
    },
    passAvailable: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    passAvailableText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
    },
    passAvailableSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        textAlign: 'center',
    },

    // Info Section
    infoSection: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoNumberText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.gray[300],
        lineHeight: 20,
    },
    inviteButton: {
        marginTop: 8,
    },

    // Upgrade State
    upgradeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    lockIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.background.elevated,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    upgradeTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    upgradeText: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    upgradeButton: {
        width: '100%',
    },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    modalFooter: {
        padding: 16,
        paddingBottom: 34,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inputHint: {
        fontSize: 12,
        color: theme.colors.text.tertiary,
        marginTop: 8,
        fontStyle: 'italic',
    },
    eventOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.elevated,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    eventOptionSelected: {
        borderColor: theme.colors.brand.primary,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.text.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.brand.primary,
    },
    eventInfo: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    eventDate: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 4,
    },
});

export default GuestPassScreen;
