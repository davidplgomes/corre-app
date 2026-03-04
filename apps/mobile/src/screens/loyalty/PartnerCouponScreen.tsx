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
import { LoadingSpinner, BackButton } from '../../components/common';
import { getPartnerCoupons } from '../../services/supabase/coupons';

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
            const rawCoupons = await getPartnerCoupons();
            const filteredCoupons = route.params?.partnerId
                ? rawCoupons.filter((coupon) => coupon.id === route.params?.partnerId)
                : rawCoupons;

            const transformedData: PartnerCoupon[] = filteredCoupons.map((coupon) => {
                const normalizedDiscount =
                    coupon.discount_type === 'percentage'
                        ? Math.max(0, Math.round(Number(coupon.discount_value || 0)))
                        : 0;

                return {
                    id: coupon.id,
                    partner_id: coupon.id,
                    code: coupon.code,
                    discount_percent: normalizedDiscount,
                    valid_until: coupon.expires_at,
                    max_uses: coupon.stock_limit ?? 9999,
                    current_uses: coupon.redeemed_count ?? 0,
                    is_active: coupon.is_active,
                    partner: {
                        id: coupon.id,
                        name: coupon.partner || t('coupons.partnerDefault', 'Partner'),
                        logo_url: coupon.image_url,
                        category: coupon.category || 'other',
                        address: '',
                    },
                };
            });

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
                <BackButton style={styles.backButton} />
                <Text style={styles.headerTitle}>Partner Coupons</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tier Banner */}
            <View style={styles.tierBanner}>
                <Text style={styles.tierLabel}>Your discount level:</Text>
                <View style={[
                    styles.tierBadge,
                    { backgroundColor: tierColors[userTier as keyof typeof tierColors]?.primary || theme.colors.text.tertiary }
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
    tierBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        backgroundColor: theme.colors.background.elevated,
        marginHorizontal: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    tierLabel: {
        fontSize: 14,
        color: theme.colors.text.secondary,
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
        paddingBottom: 120,
    },
    resultsCount: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Coupon Card
    couponCard: {
        backgroundColor: theme.colors.background.elevated,
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
        color: theme.colors.text.tertiary,
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
        color: theme.colors.text.tertiary,
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
        color: theme.colors.text.secondary,
        marginTop: 8,
        textAlign: 'center',
    },
});

export default PartnerCouponScreen;
