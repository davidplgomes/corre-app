'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Stripe Payment Callback Page
 *
 * Handles the callback from Stripe after payment and redirects to the mobile app.
 *
 * Flow:
 * 1. User completes payment in Stripe checkout
 * 2. Stripe redirects here with session_id or payment_intent params
 * 3. This page redirects to the mobile app with the params
 * 4. Mobile app handles the payment completion
 */
export default function StripeCallbackPage() {
    const [status, setStatus] = useState<'redirecting' | 'success' | 'cancelled' | 'fallback'>('redirecting');
    const searchParams = useSearchParams();

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        const paymentIntent = searchParams.get('payment_intent');
        const paymentStatus = searchParams.get('redirect_status');
        const cancelled = searchParams.get('cancelled');

        // Check if payment was cancelled
        if (cancelled === 'true') {
            setStatus('cancelled');
            return;
        }

        // Build mobile app URL with params
        let mobileUrl = 'corre://stripe-callback';
        const params = new URLSearchParams();

        if (sessionId) params.set('session_id', sessionId);
        if (paymentIntent) params.set('payment_intent', paymentIntent);
        if (paymentStatus) params.set('redirect_status', paymentStatus);

        if (params.toString()) {
            mobileUrl += '?' + params.toString();
        }

        console.log('[Stripe Callback] Redirecting to:', mobileUrl);

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
                // If we're still here, show fallback
                if (paymentStatus === 'succeeded' || sessionId) {
                    setStatus('success');
                } else {
                    setStatus('fallback');
                }
            }, 2000);
        };

        setTimeout(redirectToApp, 100);

    }, [searchParams]);

    if (status === 'cancelled') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.iconContainer}>
                        <span style={styles.cancelIcon}>✕</span>
                    </div>
                    <h1 style={styles.title}>Payment Cancelled</h1>
                    <p style={styles.message}>
                        Your payment was cancelled. Return to the app to try again.
                    </p>
                    <a
                        href="corre://"
                        style={styles.button}
                    >
                        Return to App
                    </a>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.iconContainer}>
                        <span style={styles.successIcon}>✓</span>
                    </div>
                    <h1 style={styles.title}>Payment Successful!</h1>
                    <p style={styles.message}>
                        Your payment has been processed. Click below to return to the app.
                    </p>
                    <a
                        href={`corre://stripe-callback?${new URLSearchParams(window.location.search).toString()}`}
                        style={styles.button}
                    >
                        Open Corre App
                    </a>
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
                        Click the button below to complete your purchase in the app.
                    </p>
                    <a
                        href={`corre://stripe-callback?${params.toString()}`}
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
                <h1 style={styles.title}>Processing Payment...</h1>
                <p style={styles.message}>Opening Corre app to complete your purchase.</p>
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
    iconContainer: {
        marginBottom: 24,
    },
    successIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: '#22c55e',
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
    },
    cancelIcon: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: '#ef4444',
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
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
        backgroundColor: '#22c55e', // Green for success
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
        borderTopColor: '#22c55e',
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
