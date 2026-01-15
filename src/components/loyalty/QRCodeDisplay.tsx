import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { generateQRData } from '../../services/qrcode';

interface QRCodeDisplayProps {
    userId: string;
    secret: string;
    size?: number;
    style?: ViewStyle;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
    userId,
    secret,
    size = 200,
    style,
}) => {
    const qrData = generateQRData(userId, secret);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.qrWrapper}>
                <QRCode
                    value={qrData}
                    size={size}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                    logo={undefined}
                    logoSize={50}
                    logoBackgroundColor="transparent"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrWrapper: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
});
