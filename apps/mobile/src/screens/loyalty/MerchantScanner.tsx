import React, { useState } from 'react';
import {
    Alert,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, BackButton } from '../../components/common';
import { TierBadge } from '../../components/profile';
import {
    MerchantUserInfo,
    redeemLoyaltyScan,
    SignedQrPayload,
    validateUserQR,
} from '../../services/supabase/users';
import { TIERS, TierKey } from '../../constants/tiers';
import { theme } from '../../constants/theme';

type MerchantScannerProps = {
    navigation: any;
};

type ScannedState = {
    user: MerchantUserInfo;
    payload: SignedQrPayload;
    discountPercent: number;
    tier: string;
};

type RedemptionState = {
    redemptionId: string;
    discountPercent: number;
    amountBeforeCents: number;
    amountDiscountCents: number;
    amountFinalCents: number;
};

const formatMoney = (cents: number): string => `€ ${(cents / 100).toFixed(2)}`;

export const MerchantScanner: React.FC<MerchantScannerProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scannedState, setScannedState] = useState<ScannedState | null>(null);
    const [purchaseAmount, setPurchaseAmount] = useState('');
    const [redemption, setRedemption] = useState<RedemptionState | null>(null);
    const [redeeming, setRedeeming] = useState(false);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);

        try {
            let qrPayload: SignedQrPayload;

            try {
                const parsed = JSON.parse(data);
                if (!parsed?.id || !parsed?.ts || !parsed?.sig) {
                    throw new Error('Invalid QR format');
                }
                qrPayload = {
                    id: String(parsed.id),
                    ts: Number(parsed.ts),
                    sig: String(parsed.sig),
                };
            } catch {
                throw new Error('Invalid QR format');
            }

            const validation = await validateUserQR(qrPayload.id, qrPayload.ts, qrPayload.sig);
            if (!validation.valid) {
                Alert.alert(t('common.error'), validation.error || t('loyalty.invalidQR', 'Invalid QR code'));
                setScanned(false);
                return;
            }

            const membershipTier = (validation.tier || 'free') as MerchantUserInfo['membership_tier'];
            setScannedState({
                payload: qrPayload,
                tier: membershipTier,
                discountPercent: Number(validation.discount || 0),
                user: {
                    id: qrPayload.id,
                    full_name: validation.userName || 'Runner',
                    membership_tier: membershipTier,
                    email: '',
                },
            });
        } catch (error) {
            console.error('Error scanning QR:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleScanAnother = () => {
        setScanned(false);
        setLoading(false);
        setRedeeming(false);
        setScannedState(null);
        setPurchaseAmount('');
        setRedemption(null);
    };

    const handleApplyDiscount = async () => {
        if (!scannedState || redeeming) return;

        const value = Number(purchaseAmount.replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0) {
            Alert.alert(t('common.error'), t('validation.invalidNumber', 'Enter a valid purchase amount.'));
            return;
        }

        setRedeeming(true);
        try {
            const amountCents = Math.round(value * 100);
            const result = await redeemLoyaltyScan(
                scannedState.user.id,
                scannedState.payload.ts,
                scannedState.payload.sig,
                amountCents,
                { source: 'merchant_scanner' }
            );

            if (!result.success) {
                Alert.alert(t('common.error'), result.error || t('errors.unknownError'));
                return;
            }

            setRedemption({
                redemptionId: result.redemption_id || '',
                discountPercent: result.discount_percent || 0,
                amountBeforeCents: result.amount_before_cents || amountCents,
                amountDiscountCents: result.amount_discount_cents || 0,
                amountFinalCents: result.amount_final_cents || amountCents,
            });
        } catch (error) {
            console.error('Error redeeming loyalty scan:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
        } finally {
            setRedeeming(false);
        }
    };

    if (!permission) {
        return <LoadingSpinner />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.header}>
                        <BackButton style={styles.backButton} />
                        <View>
                            <Text style={styles.headerLabel}>{t('loyalty.scanner', 'SCANNER')}</Text>
                            <Text style={styles.headerTitle}>QR CODE</Text>
                        </View>
                    </View>

                    <View style={styles.permissionContainer}>
                        <Text style={styles.permissionIcon}>📷</Text>
                        <Text style={styles.permissionTitle}>{t('errors.permissionNeeded')}</Text>
                        <Text style={styles.permissionText}>{t('errors.cameraPermissionDenied')}</Text>
                        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                            <Text style={styles.permissionButtonText}>{t('errors.allowCamera')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (scannedState) {
        const tierInfo = TIERS[scannedState.user.membership_tier as TierKey] || TIERS.free;

        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    <View style={styles.header}>
                        <BackButton style={styles.backButton} />
                        <View>
                            <Text style={styles.headerLabel}>{t('loyalty.scanner', 'SCANNER')}</Text>
                            <Text style={styles.headerTitle}>QR CODE</Text>
                        </View>
                    </View>

                    <View style={styles.resultContainer}>
                        <View style={styles.successBadge}>
                            <Text style={styles.successIcon}>✓</Text>
                        </View>
                        <Text style={styles.successTitle}>{t('loyalty.scanSuccess', 'Scan successful')}</Text>

                        <BlurView intensity={20} tint="dark" style={styles.userCard}>
                            <Text style={styles.userName}>{scannedState.user.full_name}</Text>
                            <TierBadge tier={scannedState.user.membership_tier as TierKey} size="large" />

                            <View style={styles.discountContainer}>
                                <Text style={styles.discountLabel}>{t('errors.applicableDiscount', 'APPLICABLE DISCOUNT')}</Text>
                                <Text style={[styles.discountValue, { color: tierInfo.color }]}>
                                    {scannedState.discountPercent}% OFF
                                </Text>
                            </View>

                            {!redemption ? (
                                <View style={styles.checkoutContainer}>
                                    <Text style={styles.inputLabel}>{t('loyalty.purchaseAmount', 'PURCHASE AMOUNT (€)')}</Text>
                                    <TextInput
                                        value={purchaseAmount}
                                        onChangeText={setPurchaseAmount}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        style={styles.amountInput}
                                    />
                                    <TouchableOpacity
                                        style={[styles.primaryButton, redeeming && styles.primaryButtonDisabled]}
                                        onPress={handleApplyDiscount}
                                        disabled={redeeming}
                                    >
                                        <Text style={styles.primaryButtonText}>
                                            {redeeming ? t('common.processing', 'Processing...') : t('loyalty.applyDiscount', 'APPLY DISCOUNT')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.redemptionSummary}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{t('loyalty.originalAmount', 'Original')}</Text>
                                        <Text style={styles.summaryValue}>{formatMoney(redemption.amountBeforeCents)}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{t('loyalty.discount', 'Discount')}</Text>
                                        <Text style={[styles.summaryValue, { color: theme.colors.success }]}>-
                                            {formatMoney(redemption.amountDiscountCents)}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{t('loyalty.finalAmount', 'Final')}</Text>
                                        <Text style={styles.summaryValueStrong}>{formatMoney(redemption.amountFinalCents)}</Text>
                                    </View>
                                </View>
                            )}
                        </BlurView>

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleScanAnother}>
                                <Text style={styles.primaryButtonText}>{t('loyalty.scanAnother')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
                <View style={styles.overlay}>
                    <SafeAreaView edges={['top']}>
                        <View style={styles.cameraHeader}>
                            <BackButton />
                            <View>
                                <Text style={styles.headerLabel}>{t('loyalty.scanner', 'SCANNER')}</Text>
                                <Text style={styles.headerTitle}>QR CODE</Text>
                            </View>
                        </View>
                    </SafeAreaView>

                    <View style={styles.scanAreaContainer}>
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </View>
                        <Text style={styles.scanText}>{t('loyalty.scanQR')}</Text>
                    </View>

                    <SafeAreaView edges={['bottom']}>
                        <View style={{ height: 100 }} />
                    </SafeAreaView>
                </View>
            </CameraView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <LoadingSpinner text={t('common.processing', 'Processing...')} />
                </View>
            )}
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
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    cameraHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    backButton: {
        marginRight: 16,
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
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    permissionIcon: {
        fontSize: 64,
        marginBottom: 24,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: 24,
    },
    permissionButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
    },
    permissionButtonText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 1,
    },
    resultContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    successBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successIcon: {
        color: '#000',
        fontSize: 30,
        fontWeight: '900',
    },
    successTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 20,
        textAlign: 'center',
    },
    userCard: {
        width: '100%',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    userName: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
    },
    discountContainer: {
        marginTop: 12,
        marginBottom: 12,
    },
    discountLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 6,
    },
    discountValue: {
        fontSize: 28,
        fontWeight: '900',
    },
    checkoutContainer: {
        marginTop: 8,
    },
    inputLabel: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 8,
    },
    amountInput: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
    },
    redemptionSummary: {
        marginTop: 8,
        gap: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
    },
    summaryValue: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    summaryValueStrong: {
        color: theme.colors.brand.primary,
        fontSize: 18,
        fontWeight: '900',
    },
    actions: {
        width: '100%',
        gap: 10,
        marginTop: 20,
    },
    primaryButton: {
        backgroundColor: theme.colors.brand.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.65,
    },
    primaryButtonText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    secondaryButton: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'space-between',
    },
    scanAreaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 260,
        height: 260,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderColor: theme.colors.brand.primary,
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    scanText: {
        color: '#FFF',
        marginTop: 26,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
