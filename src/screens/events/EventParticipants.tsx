import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { getEventParticipants } from '../../services/supabase/events';
import { EventParticipant } from '../../types';
import { LoadingSpinner, Card } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { TierKey } from '../../constants/tiers';

type EventParticipantsProps = {
    route: { params: { eventId: string; eventTitle: string } };
    navigation: any;
};

export const EventParticipants: React.FC<EventParticipantsProps> = ({ route, navigation }) => {
    const { t } = useTranslation();
    const { eventId, eventTitle } = route.params;

    const [participants, setParticipants] = useState<EventParticipant[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadParticipants();
    }, [eventId]);

    const loadParticipants = async () => {
        try {
            const data = await getEventParticipants(eventId);
            setParticipants(data);
        } catch (error) {
            console.error('Error loading participants:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const handlePress = () => {
            if (item.user_id) {
                navigation.navigate('UserProfile', { userId: item.user_id });
            }
        };

        return (
            <View style={styles.participantRow}>
                <TouchableOpacity style={styles.userInfo} onPress={handlePress}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>
                            {item.users?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.users?.full_name || 'User'}</Text>
                        {item.users?.membership_tier && (
                            <TierBadge tier={item.users.membership_tier as TierKey} size="small" />
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backText}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>{t('events.participants')}</Text>
                        <Text style={styles.subtitle} numberOfLines={1}>{eventTitle}</Text>
                    </View>
                    <View style={{ width: 60 }} />
                </View>

                {/* List */}
                <FlatList
                    data={participants}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>{t('events.noParticipantsYet')}</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    backButton: {
        paddingVertical: theme.spacing[2],
        width: 60,
    },
    backText: {
        fontSize: theme.typography.size.bodyMD,
        color: theme.colors.brand.primary,
    },
    headerContent: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontSize: theme.typography.size.h4,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    subtitle: {
        fontSize: theme.typography.size.bodySM,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: theme.spacing[4],
        paddingBottom: 120,
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.background.elevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: theme.typography.size.bodyLG,
        fontWeight: theme.typography.weight.bold as any,
        color: theme.colors.text.primary,
    },
    userName: {
        fontSize: theme.typography.size.bodyMD,
        fontWeight: theme.typography.weight.medium as any,
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    emptyContainer: {
        padding: theme.spacing[8],
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.text.secondary,
        fontSize: theme.typography.size.bodyMD,
    },
});
