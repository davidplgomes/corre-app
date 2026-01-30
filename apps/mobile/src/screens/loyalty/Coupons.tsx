import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Modal,
    Dimensions,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { ChevronRightIcon } from '../../components/common/TabIcons';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { redeemPartnerCoupon } from '../../services/supabase/coupons';

const { width } = Dimensions.get('window');

type CouponsProps = {
    navigation: any;
};

// Mock coupons data
const mockCoupons = [
    {
        id: '1',
        title: '10% OFF',
        description: 'Em qualquer compra na Nike Store',
        partner: 'Nike',
        expiresAt: '31 Jan 2026',
        code: 'CORRE10NIKE',
        pointsRequired: 500,
        isAvailable: true,
        category: 'fashion',
    },
    {
        id: '2',
        title: '15% OFF',
        description: 'Suplementos e vitaminas',
        partner: 'Growth Supplements',
        expiresAt: '28 Feb 2026',
        code: 'CORREGROW15',
        pointsRequired: 750,
        isAvailable: true,
        category: 'health',
    },
    {
        id: '3',
        title: 'Frete Grátis',
        description: 'Em pedidos acima de R$100',
        partner: 'Netshoes',
        expiresAt: '15 Feb 2026',
        code: 'CORREFREE',
        pointsRequired: 300,
        isAvailable: true,
        category: 'fashion',
    },
    {
        id: '4',
        title: '20% OFF',
        description: 'Em tênis de corrida selecionados',
        partner: 'Centauro',
        expiresAt: '10 Feb 2026',
        code: 'CORRERUN20',
        pointsRequired: 1000,
        isAvailable: false, // Not enough points
        category: 'sports',
    },
    {
        id: '5',
        title: 'R$30 OFF',
        description: 'Na primeira assinatura mensal',
        partner: 'Strava Premium',
        expiresAt: '20 Mar 2026',
        code: 'CORRESTRAVA',
        pointsRequired: 800,
        isAvailable: true,
        category: 'apps',
    },
    {
        id: '6',
        title: '2x1',
        description: 'Leve 2 e pague 1 em bebidas isotônicas',
        partner: 'Gatorade',
        expiresAt: '05 Feb 2026',
        code: 'CORRE2X1G',
        pointsRequired: 400,
        isAvailable: true,
        category: 'drinks',
    },
];

const categoryColors: Record<string, string> = {
    fashion: '#FF6B6B',
    health: '#4ECDC4',
    sports: theme.colors.brand.primary,
    apps: '#A78BFA',
    drinks: '#38BDF8',
};

export const Coupons: React.FC<CouponsProps> = ({ navigation }) => {
    const { profile, refreshProfile } = useAuth();
    const { t } = useTranslation();
    const userPoints = profile?.currentMonthPoints || 0;

    const [selectedCoupon, setSelectedCoupon] = useState<typeof mockCoupons[0] | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [isRedeeming, setIsRedeeming] = useState(false);

    const filteredCoupons = (filter === 'all'
        ? mockCoupons
        : mockCoupons.filter(c => c.category === filter)).map(c => ({
            ...c,
            isAvailable: userPoints >= c.pointsRequired
        }));

    const handleCouponPress = (coupon: typeof mockCoupons[0]) => {
        // Allow viewing details even if locked, but disable "Use" button
        setSelectedCoupon({
            ...coupon,
            isAvailable: userPoints >= coupon.pointsRequired
        });
    };

    const handleUseCoupon = async () => {
        if (!selectedCoupon || !profile?.id) return;

        if (userPoints < selectedCoupon.pointsRequired) {
            Alert.alert("Saldo Insuficiente", `Você precisa de ${selectedCoupon.pointsRequired} pontos para este cupom.`);
            return;
        }

        Alert.alert(
            "Resgatar Cupom",
            `Deseja usar ${selectedCoupon.pointsRequired} pontos para resgatar este cupom?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        setIsRedeeming(true);
                        try {
                            const result = await redeemPartnerCoupon(
                                profile.id,
                                selectedCoupon.pointsRequired,
                                selectedCoupon.code
                            );

                            if (result.success) {
                                // Haptic feedback for success
                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                                // Copy code to clipboard
                                await Clipboard.setStringAsync(selectedCoupon.code);

                                // Refresh user profile to update points display
                                await refreshProfile();

                                Alert.alert(
                                    "Sucesso! 🎉",
                                    `Cupom resgatado com sucesso!\n\nCódigo: ${selectedCoupon.code}\n\n(Código copiado para a área de transferência)\n\nNovo saldo: ${result.newPointsBalance} pontos`,
                                    [{ text: "OK", onPress: () => setSelectedCoupon(null) }]
                                );
                            } else {
                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                Alert.alert("Erro", result.error || "Não foi possível resgatar o cupom.");
                            }
                        } catch (error) {
                            console.error('Error redeeming coupon:', error);
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            Alert.alert("Erro", "Ocorreu um erro inesperado. Tente novamente.");
                        } finally {
                            setIsRedeeming(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <View style={styles.backIcon}>
                            <ChevronRightIcon size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>{t('coupons.your').toUpperCase()}</Text>
                        <Text style={styles.headerTitle}>{t('coupons.title').toUpperCase()}</Text>
                    </View>
                    <View style={styles.pointsPill}>
                        <Text style={styles.pointsPillLabel}>{t('leaderboard.points').toUpperCase()}</Text>
                        <Text style={styles.pointsPillValue}>{userPoints.toLocaleString()}</Text>
                    </View>
                </View>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterContent}
                >
                    {['all', 'fashion', 'sports', 'health', 'apps', 'drinks'].map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.filterTab,
                                filter === cat && styles.filterTabActive
                            ]}
                            onPress={() => setFilter(cat)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                filter === cat && styles.filterTabTextActive
                            ]}>
                                {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Coupons List */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {filteredCoupons.map((coupon) => (
                        <TouchableOpacity
                            key={coupon.id}
                            style={[
                                styles.couponCard,
                                !coupon.isAvailable && styles.couponCardDisabled
                            ]}
                            onPress={() => handleCouponPress(coupon)}
                        >
                            <View style={styles.couponLeft}>
                                <View style={[
                                    styles.couponBadge,
                                    { backgroundColor: categoryColors[coupon.category] || theme.colors.brand.primary }
                                ]}>
                                    <Text style={styles.couponBadgeText}>{coupon.title}</Text>
                                </View>
                                <Text style={styles.couponPartner}>{coupon.partner}</Text>
                                <Text style={styles.couponDescription}>{coupon.description}</Text>
                                <Text style={styles.couponExpiry}>{t('coupons.validUntil')} {coupon.expiresAt}</Text>
                            </View>
                            <View style={styles.couponRight}>
                                <View style={styles.couponDivider} />
                                <View style={styles.couponPoints}>
                                    <Text style={styles.couponPointsValue}>{coupon.pointsRequired}</Text>
                                    <Text style={styles.couponPointsLabel}>pts</Text>
                                </View>
                                {!coupon.isAvailable && (
                                    <View style={styles.lockedBadge}>
                                        <Text style={styles.lockedText}>🔒</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Coupon Detail Modal */}
                <Modal
                    visible={selectedCoupon !== null}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setSelectedCoupon(null)}
                >
                    <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            {selectedCoupon && (
                                <>
                                    <View style={[
                                        styles.modalBadge,
                                        { backgroundColor: categoryColors[selectedCoupon.category] || theme.colors.brand.primary }
                                    ]}>
                                        <Text style={styles.modalBadgeText}>{selectedCoupon.title}</Text>
                                    </View>

                                    <Text style={styles.modalPartner}>{selectedCoupon.partner}</Text>
                                    <Text style={styles.modalDescription}>{selectedCoupon.description}</Text>

                                    {/* Only show code if available. For now we show it always but maybe blur it until redeemed? 
                                        Let's keep it hidden unless strictly redeemed? 
                                        The user request didn't specify. I'll mock the 'redeemed' state for this session if needed, 
                                        but for now I'll show the code box but maybe say "Redeem to view code" if I wanted to be strict.
                                        But users might just want to see properties. I'll stick to showing it for now.
                                    */}
                                    <View style={styles.codeContainer}>
                                        <Text style={styles.codeLabel}>CÓDIGO DO CUPOM</Text>
                                        <View style={styles.codeBox}>
                                            <Text style={styles.codeText}>{selectedCoupon.code}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.modalExpiry}>
                                        {t('coupons.validUntil')} {selectedCoupon.expiresAt}
                                    </Text>

                                    <View style={styles.modalPointsRow}>
                                        <Text style={styles.modalPointsLabel}>{t('coupons.cost')}:</Text>
                                        <Text style={styles.modalPointsValue}>{selectedCoupon.pointsRequired} pts</Text>
                                    </View>

                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => setSelectedCoupon(null)}
                                        >
                                            <Text style={styles.cancelButtonText}>FECHAR</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.useButton,
                                                (!selectedCoupon.isAvailable || isRedeeming) && styles.useButtonDisabled
                                            ]}
                                            onPress={handleUseCoupon}
                                            disabled={!selectedCoupon.isAvailable || isRedeeming}
                                        >
                                            {isRedeeming ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <Text style={styles.useButtonText}>
                                                    {selectedCoupon.isAvailable ? 'USAR CUPOM' : 'SALDO INSUFICIENTE'}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </BlurView>
                </Modal>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        marginRight: 16,
    },
    backIcon: {
        transform: [{ rotate: '180deg' }],
    },
    headerLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#FFF',
    },
    couponCount: {
        backgroundColor: theme.colors.brand.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    couponCountText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFF',
    },
    // Points Pill
    pointsPill: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pointsPillLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
    },
    pointsPillValue: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
    },
    filterContainer: {
        maxHeight: 60,
        marginBottom: 16,
    },
    filterContent: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 10,
    },
    filterTab: {
        height: 32,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterTabActive: {
        backgroundColor: theme.colors.brand.primary,
        borderColor: theme.colors.brand.primary,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        includeFontPadding: false,
        textAlign: 'center',
        textAlignVertical: 'center',
        lineHeight: 16, // Explicit line height to prevent cutoff
    },
    filterTabTextActive: {
        color: '#FFF',
        fontWeight: '700', // Slight weight bump for active, ensuring container handles it
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    couponCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30,30,30,0.9)',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    couponCardDisabled: {
        opacity: 0.5,
    },
    couponLeft: {
        flex: 1,
        padding: 16,
    },
    couponBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 10,
    },
    couponBadgeText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
    },
    couponPartner: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 4,
    },
    couponDescription: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
    },
    couponExpiry: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
    },
    couponRight: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    couponDivider: {
        position: 'absolute',
        left: 0,
        top: 16,
        bottom: 16,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        // Dashed effect simulated with dotted pattern
    },
    couponPoints: {
        alignItems: 'center',
    },
    couponPointsValue: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    couponPointsLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
    },
    lockedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    lockedText: {
        fontSize: 16,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: width - 48,
        backgroundColor: 'rgba(20,20,20,0.95)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalBadgeText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
    },
    modalPartner: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 24,
    },
    codeContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 8,
    },
    codeBox: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
    },
    codeText: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.brand.primary,
        letterSpacing: 2,
    },
    modalExpiry: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 24,
    },
    modalPointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    modalPointsLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    modalPointsValue: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.colors.brand.primary,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    useButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.brand.primary,
        alignItems: 'center',
    },
    useButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    useButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});
