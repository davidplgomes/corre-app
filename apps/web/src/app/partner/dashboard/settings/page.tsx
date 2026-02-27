'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/glass-card';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';

type StripeConnectStatus = {
    status: 'not_created' | 'pending' | 'active';
    message?: string;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
    stripe_account_id?: string;
};

type PartnerFormState = {
    businessName: string;
    contactEmail: string;
    businessDescription: string;
    websiteUrl: string;
};

const DEFAULT_FORM: PartnerFormState = {
    businessName: '',
    contactEmail: '',
    businessDescription: '',
    websiteUrl: '',
};

export default function PartnerSettingsPage() {
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stripeLoading, setStripeLoading] = useState(false);
    const [connectLoading, setConnectLoading] = useState(false);

    const [userId, setUserId] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [form, setForm] = useState<PartnerFormState>(DEFAULT_FORM);
    const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus>({
        status: 'not_created',
    });

    useEffect(() => {
        const stripeParam = searchParams.get('stripe');
        if (stripeParam === 'return') {
            toast.success('Stripe onboarding returned. Status refreshed.');
        } else if (stripeParam === 'refresh') {
            toast.info('Stripe onboarding was refreshed. Continue setup.');
        }
    }, [searchParams]);

    useEffect(() => {
        void loadInitialData();
    }, []);

    const setField = (key: keyof PartnerFormState, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const loadStripeStatus = async () => {
        setStripeLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
                body: { action: 'status' },
            });

            if (error) {
                throw error;
            }

            if (data?.status) {
                setStripeStatus({
                    status: data.status,
                    message: data.message,
                    charges_enabled: data.charges_enabled,
                    payouts_enabled: data.payouts_enabled,
                    details_submitted: data.details_submitted,
                    stripe_account_id: data.stripe_account_id,
                });
            } else {
                setStripeStatus({ status: 'not_created' });
            }
        } catch (error) {
            console.error('Error loading Stripe status:', error);
            setStripeStatus({ status: 'not_created' });
        } finally {
            setStripeLoading(false);
        }
    };

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            const session = sessionData.session;
            if (!session) {
                toast.error('You must be logged in');
                return;
            }

            setUserId(session.user.id);

            const [{ data: userData }, { data: partnerData, error: partnerError }] = await Promise.all([
                supabase
                    .from('users')
                    .select('full_name, email')
                    .eq('id', session.user.id)
                    .maybeSingle(),
                supabase
                    .from('partners')
                    .select('id, business_name, business_description, contact_email, website_url')
                    .eq('user_id', session.user.id)
                    .maybeSingle(),
            ]);

            if (partnerError) {
                throw partnerError;
            }

            if (partnerData) {
                setPartnerId(partnerData.id);
                setForm({
                    businessName: partnerData.business_name || '',
                    contactEmail: partnerData.contact_email || userData?.email || '',
                    businessDescription: partnerData.business_description || '',
                    websiteUrl: partnerData.website_url || '',
                });
            } else {
                setForm({
                    businessName: userData?.full_name || '',
                    contactEmail: userData?.email || '',
                    businessDescription: '',
                    websiteUrl: '',
                });
            }

            await loadStripeStatus();
        } catch (error) {
            console.error('Error loading partner settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            toast.error('You must be logged in');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                user_id: userId,
                business_name: form.businessName.trim() || null,
                contact_email: form.contactEmail.trim() || null,
                business_description: form.businessDescription.trim() || null,
                website_url: form.websiteUrl.trim() || null,
                updated_at: new Date().toISOString(),
            };

            if (partnerId) {
                const { error } = await supabase
                    .from('partners')
                    .update(payload)
                    .eq('id', partnerId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('partners')
                    .insert({ ...payload, is_active: true })
                    .select('id')
                    .single();
                if (error) throw error;
                setPartnerId(data.id);
            }

            toast.success('Settings saved successfully');
        } catch (error) {
            console.error('Error saving partner settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const startStripeOnboarding = async (action: 'create' | 'refresh') => {
        setConnectLoading(true);
        try {
            const base = window.location.origin;
            const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding', {
                body: {
                    action,
                    return_url: `${base}/partner/dashboard/settings?stripe=return`,
                    refresh_url: `${base}/partner/dashboard/settings?stripe=refresh`,
                },
            });

            if (error) {
                throw error;
            }

            if (!data?.url) {
                throw new Error('Stripe onboarding URL not returned');
            }

            window.location.assign(data.url);
        } catch (error) {
            console.error('Error starting Stripe onboarding:', error);
            toast.error('Failed to start Stripe onboarding');
        } finally {
            setConnectLoading(false);
        }
    };

    const statusLabel = (() => {
        if (stripeStatus.status === 'active') return 'Active';
        if (stripeStatus.status === 'pending') return 'Pending';
        return 'Not Connected';
    })();

    const statusClass = (() => {
        if (stripeStatus.status === 'active') return 'text-green-400 border-green-500/30 bg-green-500/10';
        if (stripeStatus.status === 'pending') return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
        return 'text-white/50 border-white/20 bg-white/5';
    })();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5722]" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Settings</h1>
                <p className="text-white/40">Manage your partner profile and Stripe payout setup.</p>
            </div>

            <GlassCard className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Stripe Connect</h2>
                        <p className="text-sm text-white/40 mt-1">Required to receive marketplace payouts.</p>
                    </div>
                    <span className={`text-xs uppercase tracking-wider border rounded-full px-3 py-1 ${statusClass}`}>
                        {statusLabel}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-4">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Charges</p>
                        <p className="text-white">{stripeStatus.charges_enabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Payouts</p>
                        <p className="text-white">{stripeStatus.payouts_enabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Details</p>
                        <p className="text-white">{stripeStatus.details_submitted ? 'Submitted' : 'Incomplete'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => startStripeOnboarding(stripeStatus.status === 'not_created' ? 'create' : 'refresh')}
                        disabled={connectLoading}
                        className="h-10 px-4 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                        {connectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        {stripeStatus.status === 'active' ? 'Update Stripe Account' : 'Connect Stripe Account'}
                    </button>

                    <button
                        type="button"
                        onClick={loadStripeStatus}
                        disabled={stripeLoading}
                        className="h-10 px-4 border border-white/20 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold text-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                        {stripeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Refresh Status
                    </button>
                </div>
            </GlassCard>

            <GlassCard className="p-6 md:p-8">
                <form onSubmit={handleSave} className="space-y-5">
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-1">Business Profile</h2>
                        <p className="text-sm text-white/40">This information appears across partner-facing experiences.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Name</label>
                        <input
                            type="text"
                            required
                            value={form.businessName}
                            onChange={(e) => setField('businessName', e.target.value)}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Contact Email</label>
                        <input
                            type="email"
                            value={form.contactEmail}
                            onChange={(e) => setField('contactEmail', e.target.value)}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Website URL</label>
                        <input
                            type="url"
                            value={form.websiteUrl}
                            onChange={(e) => setField('websiteUrl', e.target.value)}
                            placeholder="https://your-site.com"
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Description</label>
                        <textarea
                            rows={4}
                            value={form.businessDescription}
                            onChange={(e) => setField('businessDescription', e.target.value)}
                            placeholder="Briefly describe your business and what runners can expect."
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors placeholder:text-white/20 resize-none"
                        />
                    </div>

                    <div className="pt-1">
                        <button
                            type="submit"
                            disabled={saving}
                            className="h-11 px-6 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
