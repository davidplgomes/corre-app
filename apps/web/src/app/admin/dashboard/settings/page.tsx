'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/glass-card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Settings,
    Shield,
    Bell,
    Smartphone,
    Globe,
    Database,
    AlertTriangle,
    Save,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsData {
    general: {
        app_name: string;
        support_email: string;
        banner_message: string;
    };
    features: {
        public_registration: boolean;
        beta_features: boolean;
        debug_logging: boolean;
    };
    maintenance: {
        enabled: boolean;
    };
}

const defaultSettings: SettingsData = {
    general: { app_name: 'Corre App', support_email: 'support@corre.app', banner_message: '' },
    features: { public_registration: true, beta_features: false, debug_logging: true },
    maintenance: { enabled: false }
};

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [runningAction, setRunningAction] = useState<'purge_cache' | 'reset_analytics' | null>(null);
    const [settings, setSettings] = useState<SettingsData>(defaultSettings);
    const [systemInfo, setSystemInfo] = useState({
        version: 'v1.2.4',
        environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
        dbConnected: false,
        lastDeploy: '2h ago'
    });

    const supabase = createClient();

    useEffect(() => {
        checkAuth();
        fetchSettings();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (userData?.role !== 'admin') {
            router.push('/');
        }
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);

            // Check DB connection
            const { error: connError } = await supabase.from('users').select('id', { count: 'exact', head: true });
            setSystemInfo(prev => ({ ...prev, dbConnected: !connError }));

            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value');

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return;
            }

            const loaded: Partial<SettingsData> = {};
            data.forEach((row) => {
                if (row.key === 'general' && row.value && typeof row.value === 'object') {
                    loaded.general = row.value as SettingsData['general'];
                }
                if (row.key === 'features' && row.value && typeof row.value === 'object') {
                    loaded.features = row.value as SettingsData['features'];
                }
                if (row.key === 'maintenance' && row.value && typeof row.value === 'object') {
                    loaded.maintenance = row.value as SettingsData['maintenance'];
                }
            });
            setSettings(prev => ({ ...prev, ...loaded }));
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error('Not authenticated');
            }

            const updates = [
                { key: 'general', value: settings.general },
                { key: 'features', value: settings.features },
                { key: 'maintenance', value: settings.maintenance }
            ];

            for (const update of updates) {
                const { error } = await supabase
                    .from('system_settings')
                    .upsert({
                        key: update.key,
                        value: update.value,
                        updated_at: new Date().toISOString(),
                        updated_by: user.id,
                    }, { onConflict: 'key' });

                if (error) throw error;
            }

            toast.success('System settings updated successfully');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const runAdminAction = async (
        action: 'purge_cache' | 'reset_analytics',
        loadingMessage: string,
        successMessage: string
    ) => {
        setRunningAction(action);
        const task = (async () => {
            const response = await fetch('/api/admin/settings/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || 'Action failed');
            }
        })();

        toast.promise(task, {
            loading: loadingMessage,
            success: successMessage,
            error: (error) => (error instanceof Error ? error.message : 'Action failed'),
        });

        try {
            await task;
        } finally {
            setRunningAction(null);
        }
    };

    const handlePurgeCache = async () => {
        await runAdminAction('purge_cache', 'Running cache purge...', 'Cache purge registered');
    };

    const handleResetAnalytics = async () => {
        if (!confirm('Request analytics reset/rebuild now?')) return;

        await runAdminAction(
            'reset_analytics',
            'Requesting analytics reset...',
            'Analytics reset request registered'
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="w-6 h-6 text-[#FF5722] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight uppercase mb-2">
                        System Configuration
                    </h1>
                    <p className="text-white/60">Manage global application state and feature flags.</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold w-full md:w-auto"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Main Settings Column */}
                <div className="md:col-span-8 space-y-6">

                    {/* General App Settings */}
                    <GlassCard className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Globe className="w-5 h-5 text-[#FF5722]" />
                            <h2 className="text-lg font-bold text-white uppercase">General Settings</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-white/60">Application Name</Label>
                                <Input
                                    className="bg-white/5 border-white/10 text-white"
                                    value={settings.general.app_name}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        general: { ...prev.general, app_name: e.target.value }
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/60">Support Email</Label>
                                <Input
                                    className="bg-white/5 border-white/10 text-white"
                                    value={settings.general.support_email}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        general: { ...prev.general, support_email: e.target.value }
                                    }))}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label className="text-white/60">System Banner Message</Label>
                                <Input
                                    className="bg-white/5 border-white/10 text-white"
                                    placeholder="Broadcast a message to all users..."
                                    value={settings.general.banner_message}
                                    onChange={(e) => setSettings(prev => ({
                                        ...prev,
                                        general: { ...prev.general, banner_message: e.target.value }
                                    }))}
                                />
                            </div>
                        </div>
                    </GlassCard>

                    {/* Feature Flags */}
                    <GlassCard className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Smartphone className="w-5 h-5 text-[#FF5722]" />
                            <h2 className="text-lg font-bold text-white uppercase">Feature Flags</h2>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                <div>
                                    <h3 className="text-white font-bold">Public Registration</h3>
                                    <p className="text-sm text-white/40">Allow new users to sign up without an invite code.</p>
                                </div>
                                <Switch
                                    checked={settings.features.public_registration}
                                    onCheckedChange={(checked) => setSettings(prev => ({
                                        ...prev,
                                        features: { ...prev.features, public_registration: checked }
                                    }))}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                <div>
                                    <h3 className="text-white font-bold">Beta Features</h3>
                                    <p className="text-sm text-white/40">Enable experimental features for Admin users.</p>
                                </div>
                                <Switch
                                    checked={settings.features.beta_features}
                                    onCheckedChange={(checked) => setSettings(prev => ({
                                        ...prev,
                                        features: { ...prev.features, beta_features: checked }
                                    }))}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                <div>
                                    <h3 className="text-white font-bold">Debug Logging</h3>
                                    <p className="text-sm text-white/40">Verbose logging for troubleshooting.</p>
                                </div>
                                <Switch
                                    checked={settings.features.debug_logging}
                                    onCheckedChange={(checked) => setSettings(prev => ({
                                        ...prev,
                                        features: { ...prev.features, debug_logging: checked }
                                    }))}
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Critical Actions Column */}
                <div className="md:col-span-4 space-y-6">

                    {/* Maintenance Mode */}
                    <GlassCard className="p-8 border-red-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <AlertTriangle className="w-24 h-24 text-red-500/20" />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-lg font-bold text-red-500 uppercase mb-2">Danger Zone</h2>
                            <p className="text-sm text-red-400/80 mb-6">Critical system controls.</p>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-white font-bold">Maintenance Mode</h3>
                                        <p className="text-xs text-white/40">Disable app access for users.</p>
                                    </div>
                                    <Switch
                                        checked={settings.maintenance.enabled}
                                        onCheckedChange={(checked) => setSettings(prev => ({
                                            ...prev,
                                            maintenance: { enabled: checked }
                                        }))}
                                    />
                                </div>

                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50"
                                    onClick={handlePurgeCache}
                                    disabled={runningAction !== null}
                                >
                                    {runningAction === 'purge_cache' ? 'Purging...' : 'Purge Cache'}
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50"
                                    onClick={handleResetAnalytics}
                                    disabled={runningAction !== null}
                                >
                                    {runningAction === 'reset_analytics' ? 'Requesting...' : 'Reset Analytics'}
                                </Button>
                            </div>
                        </div>
                    </GlassCard>

                    {/* System Info */}
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="w-4 h-4 text-white/40" />
                            <span className="text-xs font-bold uppercase text-white/40">System Info</span>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/60">Version</span>
                                <span className="text-white font-mono">{systemInfo.version}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Environment</span>
                                <span className="text-[#FF5722] font-mono">{systemInfo.environment}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Database</span>
                                <span className={`font-mono ${systemInfo.dbConnected ? 'text-green-500' : 'text-red-500'}`}>
                                    {systemInfo.dbConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/60">Last Deploy</span>
                                <span className="text-white font-mono">{systemInfo.lastDeploy}</span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
