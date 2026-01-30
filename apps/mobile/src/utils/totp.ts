import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as Random from 'expo-random';

/**
 * TOTP Utility for generating secure QR codes
 */

// Convert string to Uint8Array
const encoder = new TextEncoder();

/**
 * Generate a dynamic QR payload
 * Payload format: JSON { id: string, ts: number, sig: string }
 */
export const generateQRPayload = async (userId: string, secret: string) => {
    const timestamp = Math.floor(Date.now() / 1000); // Current unix timestamp

    // Create message to sign: "userId" + "timestamp"
    const message = `${userId}${timestamp}`;

    // Sign with secret using HMAC-SHA256
    // Note: In a real app, 'secret' should be securely stored or fetched
    // For this demo, we assume the secret is available in the user profile
    const signature = await computeHMAC(message, secret);

    return JSON.stringify({
        id: userId,
        ts: timestamp,
        sig: signature
    });
};

/**
 * Compute HMAC-SHA256 signature
 */
export const computeHMAC = async (message: string, key: string): Promise<string> => {
    try {
        const keyBytes = encoder.encode(key);
        const messageBytes = encoder.encode(message);

        const mac = hmac(sha256, keyBytes, messageBytes);
        return bytesToHex(mac);
    } catch (error) {
        console.error('Error computing HMAC:', error);
        return '';
    }
};

/**
 * Helper to convert byte array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Generate a random secret (for initial user creation if needed client-side)
 */
export const generateRandomSecret = (): string => {
    const bytes = Random.getRandomBytes(32);
    return bytesToHex(bytes);
};
