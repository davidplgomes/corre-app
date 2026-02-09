import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    StatusBar,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { theme, tierColors } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../../components/common';
import { supabase } from '../../services/supabase/client';

interface PartnerCouponScreenProps {
    navigation: any;
    route: {
        params?: {
            partnerId?: string;
        };
    };
}

interface PartnerCoupon {
    id: string;
    partner_id: string;
    code: string;
    discount_percent: number;
    valid_until: string;
    max_uses: number;
    current_uses: number;
    is_active: boolean;
    partner: {
        id: string;
        name: string;
        logo_url: string | null;
        category: string;
        address: string;
    };
}

const CouponCard = ({
    coupon,
    userTier,
    onShare
}: {
    coupon: PartnerCoupon;
    userTier: string;
    onShare: () => void;
}) => {
    const tierConfig = tierColors[userTier as keyof typeof tierColors] || tierColors.basico;
    const isValid = new Date(coupon.valid_until) > new Date() && coupon.is_active;
    const usesRemaining = coupon.max_uses - coupon.current_uses;

    // Generate QR code data
    const qrData = JSON.stringify({
        type: 'CORRE_COUPON',
        code: coupon.code,
        partnerId: coupon.partner_id,
        discount: coupon.discount_percent,
    });

    return (
        <View style={[styles.couponCard, !isValid && styles.couponCardInvalid]}>
            <LinearGradient
                colors={isValid ? [tierConfig.primary, tierConfig.gradient?.[1] || tierConfig.primary] : ['#333', '#222']}
                style={styles.couponHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.discountBadge}>
                    <Text style={styles.discountValue}>{coupon.discount_percent}%</Text>
                    <Text style={styles.discountLabel}>OFF</Text>
                </View>
                <View style={styles.partnerInfo}>
                    <Text style={styles.partnerName}>{coupon.partner.name}</Text>
                    <Text style={styles.partnerCategory}>{coupon.partner.category}</Text>
                </View>
            </LinearGradient>

            <View style={styles.qrSection}>
                {isValid ? (
                    <View style={styles.qrContainer}>
                        <QRCode
                            value={qrData}
                            size={160}
                            backgroundColor="#FFF"
                            color="#000"
                        />
                    </View>
                ) : (
                    <View style={styles.expiredOverlay}>
                        <Ionicons name="close-circle" size={64} color="#EF4444" />
                        <Text style={styles.expiredText}>Expired</Text>
                    </View>
                )}

                <Text style={styles.couponCode}>{coupon.code}</Text>

                <View style={styles.couponMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color="#888" />
                        <Text style={styles.metaText}>
                            Valid until {new Date(coupon.valid_until).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>
                    {usesRemaining > 0 && (
                        <View style={styles.metaItem}>
                            <Ionicons name="repeat-outline" size={14} color="#888" />
                            <Text style={styles.metaText}>
                                {usesRemaining} {usesRemaining === 1 ? 'use' : 'uses'} remaining
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.couponActions}>
                <TouchableOpacity style={styles.shareButton} onPress={onShare}>
                    <Ionicons name="share-outline" size={18} color={theme.colors.brand.primary} />
                    <Text style={styles.shareText}>Share</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.partnerAddress}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.addressText}>{coupon.partner.address}</Text>
            </View>
        </View>
    );
};

export const PartnerCouponScreen: React.FC<PartnerCouponScreenProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [coupons, setCoupons] = useState<PartnerCoupon[]>([]);

    const userTier = (profile?.membershipTier || 'basico') as string;

    const loadCoupons = useCallback(async () => {
        if (!user?.id) return;

        try {
            let query = supabase
                .from('partner_coupons')
                .select(`
                    id,
                    partner_id,
                    code,
                    discount_percent,
                    valid_until,
                    max_uses,
                    current_uses,
                    is_active,
                    partner:partners (
                        id,
                        name,
                        logo_url,
                        category,
                        address
                    )
                `)
                .gte('valid_until', new Date().toISOString())
                .eq('is_active', true)
                .order('discount_percent', { ascending: false });

            // Filter by partner if specified
            if (route.params?.partnerId) {
                query = query.eq('partner_id', route.params.partnerId);
            }

            const { data, error } = await query;

            if (error) throw error;
            // Handle Supabase relation which may return array - transform to expected shape
            const transformedData = (data || []).map(item => ({
                ...item,
                partner: Array.isArray(item.partner) ? item.partner[0] : item.partner
            })).filter(item => item.partner) as PartnerCoupon[];
            setCoupons(transformedData);
        } catch (error) {
            console.error('Error loading coupons:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, route.params?.partnerId]);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadCoupons();
    }, [loadCoupons]);

    const handleShare = async (coupon: PartnerCoupon) => {
        try {
            await Share.share({
                title: `${coupon.discount_percent}% off at ${coupon.partner.name}`,
                message: `Get ${coupon.discount_percent}% off at ${coupon.partner.name} with code: ${coupon.code}\n\nDownload Corre app to unlock more exclusive discounts!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
            </View>
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
                <Text style={styles.headerTitle}>Partner Coupons</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tier Banner */}
            <View style={styles.tierBanner}>
                <Text style={styles.tierLabel}>Your discount level:</Text>
                <View style={[
                    styles.tierBadge,
                    { backgroundColor: tierColors[userTier as keyof typeof tierColors]?.primary || '#666' }
                ]}>
                    <Text style={styles.tierText}>
                        {tierColors[userTier as keyof typeof tierColors]?.label || userTier.toUpperCase()}
                    </Text>
                </View>
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
                {coupons.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="pricetag-outline" size={64} color="#666" />
                        <Text style={styles.emptyTitle}>No Coupons Available</Text>
                        <Text style={styles.emptySubtitle}>
                            Check back soon for exclusive partner discounts!
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.resultsCount}>
                            {coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'} available
                        </Text>
                        {coupons.map((coupon) => (
                            <CouponCard
                                key={coupon.id}
                                coupon={coupon}
                                userTier={userTier}
                                onShare={() => handleShare(coupon)}
                            />
                        ))}
                    </>
                )}
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
    tierBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: '#1A1A1A',
        marginHorizontal: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    tierLabel: {
        fontSize: 14,
        color: '#888',
    },
    tierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tierText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    resultsCount: {
        fontSize: 12,
        color: '#888',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Coupon Card
    couponCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
    },
    couponCardInvalid: {
        opacity: 0.5,
    },
    couponHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    discountBadge: {
        alignItems: 'center',
    },
    discountValue: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
    },
    discountLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
    },
    partnerInfo: {
        flex: 1,
    },
    partnerName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    partnerCategory: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    qrSection: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFF',
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
    },
    expiredOverlay: {
        alignItems: 'center',
        padding: 40,
    },
    expiredText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#EF4444',
        marginTop: 8,
    },
    couponCode: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 2,
        marginTop: 16,
    },
    couponMeta: {
        marginTop: 12,
        gap: 6,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        color: '#666',
    },
    couponActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.brand.primary,
    },
    shareText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.brand.primary,
    },
    partnerAddress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 12,
        paddingTop: 0,
    },
    addressText: {
        fontSize: 12,
        color: '#666',
        flex: 1,
    },

    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
    },
});

export default PartnerCouponScreen;
