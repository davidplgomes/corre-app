import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { Button, Card, LoadingSpinner } from '../../components/common';
import { TierBadge } from '../../components/profile';
import { getUserByQRSecret, MerchantUserInfo } from '../../services/supabase/users';
import { parseQRData } from '../../services/qrcode';
import { TIERS, TierKey } from '../../constants/tiers';

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
            const qrData = parseQRData(data);

            if (!qrData) {
                Alert.alert(t('common.error'), t('loyalty.invalidQR'));
                setScanned(false);
                return;
            }

            const user = await getUserByQRSecret(qrData.secret);

            if (user) {
                setScannedUser(user);
            } else {
                Alert.alert(t('common.error'), t('loyalty.invalidQR'));
                setScanned(false);
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
            <SafeAreaView style={styles.container}>
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                    <Text style={styles.permissionText}>
                        {t('errors.cameraPermissionDenied')}
                    </Text>
                    <Button
                        title="Grant Permission"
                        onPress={requestPermission}
                        style={styles.permissionButton}
                    />
                    <Button
                        title={t('common.back')}
                        onPress={() => navigation.goBack()}
                        variant="outline"
                    />
                </View>
            </SafeAreaView>
        );
    }

    // Show scanned user info
    if (scannedUser) {
        const tierInfo = TIERS[scannedUser.membership_tier as TierKey] || TIERS.free;

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.resultContainer}>
                    <Text style={styles.successIcon}>✅</Text>
                    <Text style={styles.successTitle}>{t('loyalty.scanSuccess')}</Text>

                    <Card variant="elevated" style={styles.userCard}>
                        <Text style={styles.userName}>{scannedUser.full_name}</Text>
                        <TierBadge tier={scannedUser.membership_tier as TierKey} size="large" />

                        <View style={styles.discountContainer}>
                            <Text style={styles.discountLabel}>{t('loyalty.discount')}</Text>
                            <Text style={[styles.discountValue, { color: tierInfo.color }]}>
                                {tierInfo.discount}% OFF
                            </Text>
                        </View>
                    </Card>

                    <View style={styles.actions}>
                        <Button
                            title={t('loyalty.scanAnother')}
                            onPress={handleScanAnother}
                        />
                        <Button
                            title={t('common.back')}
                            onPress={() => navigation.goBack()}
                            variant="outline"
                            style={styles.backButton}
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.scannerContainer}>
                <CameraView
                    style={styles.camera}
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                >
                    <View style={styles.overlay}>
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </View>
                        <Text style={styles.scanText}>{t('loyalty.scanQR')}</Text>
                    </View>
                </CameraView>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <LoadingSpinner text="Processing..." />
                    </View>
                )}
            </View>

            <View style={styles.bottomActions}>
                <Button
                    title={t('common.back')}
                    onPress={() => navigation.goBack()}
                    variant="outline"
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    permissionButton: {
        marginBottom: 12,
        width: '100%',
    },
    scannerContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    scanFrame: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: '#7C3AED',
        borderWidth: 4,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scanText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 24,
        fontWeight: '600',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomActions: {
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
    },
    successIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 24,
    },
    userCard: {
        width: '100%',
        alignItems: 'center',
        padding: 24,
        marginBottom: 24,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 16,
    },
    discountContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    discountLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    discountValue: {
        fontSize: 32,
        fontWeight: '700',
    },
    actions: {
        width: '100%',
    },
    backButton: {
        marginTop: 12,
    },
});
