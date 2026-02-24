'use client';

import { useEffect, useState } from 'react';

/**
 * Password Reset Redirect Page
 *
 * This page receives the password reset tokens from Supabase and redirects
 * to the mobile app using the custom URL scheme.
 *
 * Flow:
 * 1. User clicks password reset link in email
 * 2. Supabase verifies the token and redirects here with tokens in URL hash
 * 3. This page extracts the tokens and redirects to corre://auth/reset#tokens
 * 4. Mobile app handles the deep link and shows the reset password screen
 */
export default function AuthResetPage() {
    const [status, setStatus] = useState<'redirecting' | 'error' | 'fallback'>('redirecting');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Get the full URL including hash fragment
        const fullUrl = window.location.href;
        const hash = window.location.hash;

        console.log('[Auth Reset] Processing redirect, hash:', hash ? 'present' : 'none');

        // Build the mobile app URL
        let mobileUrl = 'corre://auth/reset';

        // Append hash if present (contains access_token, refresh_token, type)
        if (hash) {
            mobileUrl += hash;
        }

        // Try to redirect to the mobile app
        const redirectToApp = () => {
            console.log('[Auth Reset] Redirecting to:', mobileUrl);

            // Create a hidden iframe to try the deep link
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = mobileUrl;
            document.body.appendChild(iframe);

            // Also try direct location change after a short delay
            setTimeout(() => {
                window.location.href = mobileUrl;
            }, 100);

            // If still on page after 2 seconds, show fallback
            setTimeout(() => {
                setStatus('fallback');
            }, 2000);
        };

        // Small delay to ensure page is fully loaded
        setTimeout(redirectToApp, 100);

    }, []);

    if (status === 'error') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={styles.title}>Error</h1>
                    <p style={styles.message}>{errorMessage}</p>
                    <a href="/" style={styles.link}>Go to Home</a>
                </div>
            </div>
        );
    }

    if (status === 'fallback') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.logo}>
                        <img src="/logo_transparent.png" alt="Corre" style={{ width: 120, height: 120, objectFit: 'contain' }} />
                    </div>
                    <h1 style={styles.title}>Open in Corre App</h1>
                    <p style={styles.message}>
                        Click the button below to reset your password in the Corre app.
                    </p>
                    <a
                        href={`corre://auth/reset${window.location.hash}`}
                        style={styles.button}
                    >
                        Open Corre App
                    </a>
                    <p style={styles.hint}>
                        Don&apos;t have the app?{' '}
                        <a href="https://apps.apple.com/app/corre" style={styles.link}>Download on App Store</a>
                        {' or '}
                        <a href="https://play.google.com/store/apps/details?id=com.corre" style={styles.link}>Get on Google Play</a>
                    </p>
                </div>
            </div>
        );
    }

    // Redirecting state
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.spinner} />
                <h1 style={styles.title}>Redirecting...</h1>
                <p style={styles.message}>Opening Corre app to reset your password.</p>
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    card: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 40,
        textAlign: 'center',
        maxWidth: 400,
        width: '100%',
        border: '1px solid #222',
    },
    logo: {
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 12,
        margin: 0,
    },
    message: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        lineHeight: 1.5,
        marginBottom: 24,
    },
    button: {
        display: 'inline-block',
        backgroundColor: '#FF5722',
        color: '#fff',
        padding: '14px 32px',
        borderRadius: 30,
        fontSize: 16,
        fontWeight: 600,
        textDecoration: 'none',
        marginBottom: 24,
    },
    link: {
        color: '#FF5722',
        textDecoration: 'none',
    },
    hint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    spinner: {
        width: 40,
        height: 40,
        border: '3px solid #333',
        borderTopColor: '#FF5722',
        borderRadius: '50%',
        margin: '0 auto 24px',
        animation: 'spin 1s linear infinite',
    },
};

// Add spinner animation via global styles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}
