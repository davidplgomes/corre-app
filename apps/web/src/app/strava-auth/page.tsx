'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Strava OAuth Callback Page
 *
 * Handles the OAuth callback from Strava and redirects to the mobile app.
 *
 * Flow:
 * 1. User authorizes in Strava
 * 2. Strava redirects here with code and scope params
 * 3. This page redirects to the mobile app with the params
 * 4. Mobile app exchanges the code for tokens
 */
export default function StravaAuthPage() {
    const [status, setStatus] = useState<'redirecting' | 'error' | 'fallback'>('redirecting');
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        const scope = searchParams.get('scope');
        const error = searchParams.get('error');

        if (error) {
            setStatus('error');
            return;
        }

        // Build mobile app URL with params
        let mobileUrl = 'corre://strava-auth';
        const params = new URLSearchParams();
        if (code) params.set('code', code);
        if (scope) params.set('scope', scope);

        if (params.toString()) {
            mobileUrl += '?' + params.toString();
        }

        console.log('[Strava Auth] Redirecting to:', mobileUrl);

        // Try to open the app
        const redirectToApp = () => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = mobileUrl;
            document.body.appendChild(iframe);

            setTimeout(() => {
                window.location.href = mobileUrl;
            }, 100);

            setTimeout(() => {
                setStatus('fallback');
            }, 2000);
        };

        setTimeout(redirectToApp, 100);

    }, [searchParams]);

    if (status === 'error') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={styles.title}>Connection Failed</h1>
                    <p style={styles.message}>
                        Strava connection was cancelled or failed. Please try again from the app.
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'fallback') {
        const params = new URLSearchParams(window.location.search);
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.logo}>
                        <img src="/logo_transparent.png" alt="Corre" style={{ width: 80, height: 80 }} />
                    </div>
                    <h1 style={styles.title}>Open in Corre App</h1>
                    <p style={styles.message}>
                        Click the button below to complete your Strava connection.
                    </p>
                    <a
                        href={`corre://strava-auth?${params.toString()}`}
                        style={styles.button}
                    >
                        Open Corre App
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.spinner} />
                <h1 style={styles.title}>Connecting Strava...</h1>
                <p style={styles.message}>Opening Corre app to complete the connection.</p>
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
        backgroundColor: '#FC4C02', // Strava orange
        color: '#fff',
        padding: '14px 32px',
        borderRadius: 30,
        fontSize: 16,
        fontWeight: 600,
        textDecoration: 'none',
    },
    spinner: {
        width: 40,
        height: 40,
        border: '3px solid #333',
        borderTopColor: '#FC4C02',
        borderRadius: '50%',
        margin: '0 auto 24px',
        animation: 'spin 1s linear infinite',
    },
};

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}
