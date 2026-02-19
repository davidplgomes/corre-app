import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner, BackButton } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { getUserByQRSecret, MerchantUserInfo } from '../../services/supabase/users';
import { parseQRData } from '../../services/qrcode';
import { TIERS, TierKey } from '../../constants/tiers';
import { theme } from '../../constants/theme';

type MerchantScannerProps = {
    navigation: any;
};

export const MerchantScanner: React.FC<MerchantScannerProps> = ({ navigation }) => {
    const { t } = useTranslation();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scannedUser, setScannedUser] = useState<MerchantUserInfo | null>(null);
    const [loading, setLoading] = useState(false);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned || loading) return;

        setScanned(true);
        setLoading(true);

        try {
            // Parse QR Data
            let qrPayload: any;
            try {
                qrPayload = JSON.parse(data);
            } catch (e) {
                // Legacy format support
                const qrData = parseQRData(data);
                if (qrData) {
                    const user = await getUserByQRSecret(qrData.secret);
                    if (user) {
                        setScannedUser(user);
                        return;
                    }
                }
                throw new Error('Invalid QR Format');
            }

            // New Secure QR Logic
            if (qrPayload.id && qrPayload.ts && qrPayload.sig) {
                const { validateUserQR } = require('../../services/supabase/users');
                const result = await validateUserQR(qrPayload.id, qrPayload.ts, qrPayload.sig);

                if (result.valid) {
                    setScannedUser({
                        id: qrPayload.id,
                        full_name: result.userName,
                        membership_tier: result.tier,
                        email: '', // Not needed for display
                        qr_code_secret: '' // Not needed
                    });
                } else {
                    Alert.alert(t('common.error'), result.error || t('loyalty.invalidQR'));
                    setScanned(false);
                }
            } else {
                throw new Error('Invalid QR Format');
            }
        } catch (error) {
            console.error('Error scanning QR:', error);
            Alert.alert(t('common.error'), t('errors.unknownError'));
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleScanAnother = () => {
        setScannedUser(null);
        setScanned(false);
    };

    if (!permission) {
        return <LoadingSpinner />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <BackButton style={styles.backButton} />
                        <View>
                            <Text style={styles.headerLabel}>SCANNER</Text>
                            <Text style={styles.headerTitle}>QR CODE</Text>
                        </View>
                    </View>

                    <View style={styles.permissionContainer}>
                        <Text style={styles.permissionIcon}>📷</Text>
                        <Text style={styles.permissionTitle}>Permissão Necessária</Text>
                        <Text style={styles.permissionText}>
                            {t('errors.cameraPermissionDenied')}
                        </Text>
                        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                            <Text style={styles.permissionButtonText}>PERMITIR CÂMERA</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Show scanned user info
    if (scannedUser) {
        const tierInfo = TIERS[scannedUser.membership_tier as TierKey] || TIERS.free;

        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={styles.header}>
                        <BackButton style={styles.backButton} />
                        <View>
                            <Text style={styles.headerLabel}>SCANNER</Text>
                            <Text style={styles.headerTitle}>QR CODE</Text>
                        </View>
                    </View>

                    <View style={styles.resultContainer}>
                        <View style={styles.successBadge}>
                            <Text style={styles.successIcon}>✓</Text>
                        </View>
                        <Text style={styles.successTitle}>{t('loyalty.scanSuccess')}</Text>

                        <BlurView intensity={20} tint="dark" style={styles.userCard}>
                            <View style={styles.userCardContent}>
                                <Text style={styles.userName}>{scannedUser.full_name}</Text>
                                <TierBadge tier={scannedUser.membership_tier as TierKey} size="large" />

                                <View style={styles.discountContainer}>
                                    <Text style={styles.discountLabel}>DESCONTO APLICÁVEL</Text>
                                    <Text style={[styles.discountValue, { color: tierInfo.color }]}>
                                        {tierInfo.discount}% OFF
                                    </Text>
                                </View>
                            </View>
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

            {/* Camera View */}
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            >
                {/* Overlay */}
                <View style={styles.overlay}>
                    {/* Header */}
                    <SafeAreaView edges={['top']}>
                        <View style={styles.cameraHeader}>
                            <BackButton />
                            <View>
                                <Text style={styles.headerLabel}>SCANNER</Text>
                                <Text style={styles.headerTitle}>QR CODE</Text>
                            </View>
                        </View>
                    </SafeAreaView>

                    {/* Scan Frame */}
                    <View style={styles.scanAreaContainer}>
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </View>
                        <Text style={styles.scanText}>{t('loyalty.scanQR')}</Text>
                    </View>

                    {/* Bottom Spacer for safe area */}
                    <SafeAreaView edges={['bottom']}>
                        <View style={{ height: 100 }} />
                    </SafeAreaView>
                </View>
            </CameraView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <LoadingSpinner text="Processando..." />
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
    // Permission Screen
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
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    permissionButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
    },
    permissionButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 1,
    },
    // Camera
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    scanAreaContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: theme.colors.brand.primary,
        borderWidth: 4,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
    scanText: {
        color: '#FFF',
        fontSize: 16,
        marginTop: 32,
        fontWeight: '600',
        textAlign: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Result Screen
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    successBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successIcon: {
        fontSize: 40,
        color: '#FFF',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 32,
    },
    userCard: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 32,
    },
    userCardContent: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 16,
    },
    discountContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    discountLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1,
        marginBottom: 8,
    },
    discountValue: {
        fontSize: 40,
        fontWeight: '900',
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: theme.colors.brand.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 1,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 1,
    },
});
