'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthResetPage() {
    const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const initSession = async () => {
            const hash = window.location.hash;

            if (!hash) {
                setErrorMessage('Invalid or expired reset link. Please request a new one.');
                setStatus('error');
                return;
            }

            // Parse tokens from hash
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');

            if (!accessToken || !refreshToken) {
                setErrorMessage('Invalid reset link. Please request a new password reset.');
                setStatus('error');
                return;
            }

            if (type !== 'recovery') {
                setErrorMessage('This link is not for password reset.');
                setStatus('error');
                return;
            }

            // Set the session with the tokens
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                setErrorMessage('This reset link has expired. Please request a new one.');
                setStatus('error');
                return;
            }

            setStatus('form');
        };

        initSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                setErrorMessage(error.message);
                setIsSubmitting(false);
                return;
            }

            // Sign out after password change
            await supabase.auth.signOut();
            setStatus('success');
        } catch (err) {
            setErrorMessage('An unexpected error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.spinner} />
                    <h1 style={styles.title}>Verifying...</h1>
                    <p style={styles.message}>Please wait while we verify your reset link.</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.logo}>
                        <img src="/logo_transparent.png" alt="Corre" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                    </div>
                    <h1 style={styles.title}>Reset Failed</h1>
                    <p style={styles.errorText}>{errorMessage}</p>
                    <a href="/" style={styles.link}>Return to Home</a>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.logo}>
                        <img src="/logo_transparent.png" alt="Corre" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                    </div>
                    <div style={styles.successIcon}>✓</div>
                    <h1 style={styles.title}>Password Updated!</h1>
                    <p style={styles.message}>
                        Your password has been successfully changed. You can now sign in with your new password.
                    </p>
                    <a href="corre://" style={styles.button}>
                        Open Corre App
                    </a>
                    <p style={styles.hint}>
                        Don&apos;t have the app?{' '}
                        <a href="https://apps.apple.com/app/corre" style={styles.link}>App Store</a>
                        {' • '}
                        <a href="https://play.google.com/store/apps/details?id=com.corre" style={styles.link}>Google Play</a>
                    </p>
                </div>
            </div>
        );
    }

    // Form state
    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logo}>
                    <img src="/logo_transparent.png" alt="Corre" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                </div>
                <h1 style={styles.title}>Reset Password</h1>
                <p style={styles.message}>Enter your new password below.</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            style={styles.input}
                            minLength={8}
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            style={styles.input}
                            minLength={8}
                            required
                        />
                    </div>

                    {errorMessage && (
                        <p style={styles.errorText}>{errorMessage}</p>
                    )}

                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
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
        marginTop: 12,
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        textAlign: 'left',
    },
    label: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: 500,
    },
    input: {
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: '14px 16px',
        color: '#fff',
        fontSize: 16,
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    },
    button: {
        display: 'block',
        backgroundColor: '#FF5722',
        color: '#fff',
        padding: '14px 32px',
        borderRadius: 30,
        fontSize: 16,
        fontWeight: 600,
        textDecoration: 'none',
        border: 'none',
        cursor: 'pointer',
        marginTop: 8,
        textAlign: 'center',
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
        margin: '16px auto',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginTop: 8,
    },
    link: {
        color: '#FF5722',
        textDecoration: 'none',
    },
    hint: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginTop: 24,
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

// Add spinner animation
if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('reset-page-styles');
    if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'reset-page-styles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            input::placeholder {
                color: rgba(255,255,255,0.3);
            }
            input:focus {
                border-color: #FF5722;
            }
        `;
        document.head.appendChild(style);
    }
}
