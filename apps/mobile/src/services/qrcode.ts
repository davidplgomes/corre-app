/**
 * QR code data format
 */
export interface QRCodeData {
    userId: string;
    secret: string;
    version: string;
}

/**
 * Generate QR code data string
 */
export const generateQRData = (userId: string, secret: string): string => {
    const data: QRCodeData = {
        userId,
        secret,
        version: 'v1',
    };
    return JSON.stringify(data);
};

/**
 * Parse QR code data string
 */
export const parseQRData = (qrString: string): QRCodeData | null => {
    try {
        const data = JSON.parse(qrString) as QRCodeData;

        // Validate required fields
        if (!data.userId || !data.secret || !data.version) {
            return null;
        }

        // Validate version
        if (data.version !== 'v1') {
            console.warn('Unsupported QR code version:', data.version);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error parsing QR data:', error);
        return null;
    }
};

/**
 * Validate QR code data format
 */
export const isValidQRData = (qrString: string): boolean => {
    return parseQRData(qrString) !== null;
};
