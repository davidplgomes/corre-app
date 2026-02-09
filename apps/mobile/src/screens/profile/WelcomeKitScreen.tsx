import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner, Button } from '../../components/common';
import { supabase } from '../../services/supabase/client';

interface WelcomeKitScreenProps {
    navigation: any;
}

interface WelcomeKitItem {
    id: string;
    name: string;
    description: string;
    image_url: string | null;
    status: 'pending' | 'shipped' | 'delivered';
    tracking_number: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
}

interface WelcomeKit {
    id: string;
    user_id: string;
    status: 'processing' | 'shipped' | 'delivered';
    created_at: string;
    shipped_at: string | null;
    delivered_at: string | null;
    tracking_url: string | null;
    items: WelcomeKitItem[];
}

const KitItemCard = ({ item }: { item: WelcomeKitItem }) => {
    const statusConfig = {
        pending: { color: '#F59E0B', label: 'Processing', icon: 'hourglass-outline' },
        shipped: { color: '#3B82F6', label: 'Shipped', icon: 'airplane-outline' },
        delivered: { color: '#10B981', label: 'Delivered', icon: 'checkmark-circle-outline' },
    };

    const status = statusConfig[item.status];

    return (
        <View style={styles.itemCard}>
            <View style={styles.itemImageContainer}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                ) : (
                    <Ionicons name="gift-outline" size={32} color="#666" />
                )}
            </View>
            <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
                <View style={[styles.itemStatusBadge, { backgroundColor: `${status.color}20` }]}>
                    <Ionicons name={status.icon as any} size={12} color={status.color} />
                    <Text style={[styles.itemStatusText, { color: status.color }]}>{status.label}</Text>
                </View>
            </View>
        </View>
    );
};

export const WelcomeKitScreen: React.FC<WelcomeKitScreenProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [kit, setKit] = useState<WelcomeKit | null>(null);

    const isClubMember = profile?.membershipTier === 'baixa_pace';

    const loadWelcomeKit = useCallback(async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('welcome_kits')
                .select(`
                    id,
                    user_id,
                    status,
                    created_at,
                    shipped_at,
                    delivered_at,
                    tracking_url,
                    items:welcome_kit_items (
                        id,
                        name,
                        description,
                        image_url,
                        status,
                        tracking_number,
                        shipped_at,
                        delivered_at
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setKit(data);
        } catch (error) {
            console.error('Error loading welcome kit:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadWelcomeKit();
    }, [loadWelcomeKit]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadWelcomeKit();
    }, [loadWelcomeKit]);

    const getOverallProgress = () => {
        if (!kit) return 0;
        const deliveredCount = kit.items.filter(i => i.status === 'delivered').length;
        return Math.round((deliveredCount / kit.items.length) * 100);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
        );
    }

    // Non-Club member view
    if (!isClubMember) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="light-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Welcome Kit</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.upgradeContainer}>
                    <View style={styles.giftIconLarge}>
                        <Ionicons name="gift" size={64} color={theme.colors.brand.primary} />
                    </View>
                    <Text style={styles.upgradeTitle}>Club Welcome Kit</Text>
                    <Text style={styles.upgradeText}>
                        Upgrade to Corre Club to receive an exclusive welcome kit with premium running gear!
                    </Text>
                    <View style={styles.kitPreview}>
                        <View style={styles.previewItem}>
                            <Ionicons name="shirt-outline" size={24} color="#888" />
                            <Text style={styles.previewText}>Technical T-Shirt</Text>
                        </View>
                        <View style={styles.previewItem}>
                            <Ionicons name="bag-outline" size={24} color="#888" />
                            <Text style={styles.previewText}>Running Bag</Text>
                        </View>
                        <View style={styles.previewItem}>
                            <Ionicons name="water-outline" size={24} color="#888" />
                            <Text style={styles.previewText}>Water Bottle</Text>
                        </View>
                    </View>
                    <Button
                        title="Upgrade to Club"
                        onPress={() => navigation.navigate('SubscriptionScreen')}
                        style={styles.upgradeButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    // No kit found
    if (!kit) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="light-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Welcome Kit</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.pendingContainer}>
                    <View style={styles.pendingIcon}>
                        <Ionicons name="hourglass-outline" size={48} color="#F59E0B" />
                    </View>
                    <Text style={styles.pendingTitle}>Kit Being Prepared</Text>
                    <Text style={styles.pendingText}>
                        Your welcome kit is being prepared! You'll receive a notification when it ships.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    const statusConfig = {
        processing: { color: '#F59E0B', label: 'Processing', icon: 'hourglass-outline' },
        shipped: { color: '#3B82F6', label: 'Shipped', icon: 'airplane-outline' },
        delivered: { color: '#10B981', label: 'Delivered', icon: 'checkmark-circle' },
    };

    const kitStatus = statusConfig[kit.status];
    const progress = getOverallProgress();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Welcome Kit</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.brand.primary}
                    />
                }
            >
                {/* Status Card */}
                <LinearGradient
                    colors={[kitStatus.color, `${kitStatus.color}99`]}
                    style={styles.statusCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.statusHeader}>
                        <Ionicons name={kitStatus.icon as any} size={32} color="#FFF" />
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusLabel}>Kit Status</Text>
                            <Text style={styles.statusValue}>{kitStatus.label}</Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{progress}% delivered</Text>
                    </View>

                    {kit.tracking_url && (
                        <TouchableOpacity style={styles.trackButton}>
                            <Ionicons name="navigate-outline" size={18} color="#FFF" />
                            <Text style={styles.trackButtonText}>Track Shipment</Text>
                        </TouchableOpacity>
                    )}
                </LinearGradient>

                {/* Timeline */}
                <View style={styles.timelineSection}>
                    <Text style={styles.sectionTitle}>Timeline</Text>
                    <View style={styles.timeline}>
                        <View style={styles.timelineItem}>
                            <View style={[styles.timelineDot, styles.timelineDotComplete]} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Order Created</Text>
                                <Text style={styles.timelineDate}>
                                    {new Date(kit.created_at).toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.timelineItem}>
                            <View style={[
                                styles.timelineDot,
                                kit.shipped_at && styles.timelineDotComplete
                            ]} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Shipped</Text>
                                <Text style={styles.timelineDate}>
                                    {kit.shipped_at
                                        ? new Date(kit.shipped_at).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })
                                        : 'Pending'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.timelineItem}>
                            <View style={[
                                styles.timelineDot,
                                kit.delivered_at && styles.timelineDotComplete
                            ]} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineLabel}>Delivered</Text>
                                <Text style={styles.timelineDate}>
                                    {kit.delivered_at
                                        ? new Date(kit.delivered_at).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })
                                        : 'Pending'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.itemsSection}>
                    <Text style={styles.sectionTitle}>Kit Contents</Text>
                    {kit.items.map((item) => (
                        <KitItemCard key={item.id} item={item} />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
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
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },

    // Status Card
    statusCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
    },
    statusValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        textAlign: 'center',
    },
    trackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
    },
    trackButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },

    // Timeline
    timelineSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 16,
    },
    timeline: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#333',
        marginRight: 12,
        marginTop: 4,
    },
    timelineDotComplete: {
        backgroundColor: theme.colors.brand.primary,
    },
    timelineContent: {
        flex: 1,
    },
    timelineLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    timelineDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },

    // Items
    itemsSection: {
        marginBottom: 20,
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    itemImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    itemDescription: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    itemStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 8,
    },
    itemStatusText: {
        fontSize: 10,
        fontWeight: '600',
    },

    // Upgrade State
    upgradeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    giftIconLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,107,53,0.1)',
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
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    kitPreview: {
        width: '100%',
        gap: 12,
        marginBottom: 32,
    },
    previewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1A1A1A',
        padding: 16,
        borderRadius: 12,
    },
    previewText: {
        fontSize: 14,
        color: '#CCC',
    },
    upgradeButton: {
        width: '100%',
    },

    // Pending State
    pendingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    pendingIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    pendingTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },
    pendingText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
    },
});

export default WelcomeKitScreen;
