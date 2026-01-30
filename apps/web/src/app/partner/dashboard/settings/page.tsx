'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function PartnerSettingsPage() {
    const [saving, setSaving] = useState(false);

    // In a real app, load this from DB
    const [settings, setSettings] = useState({
        businessName: 'My Awesome Cafe',
        email: 'partner@example.com',
        notifications: true,
        publicVisibility: true
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success("Settings saved successfully");
        setSaving(false);
    };

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-2">Settings</h1>
                <p className="text-white/40">Manage your partner profile and preferences</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Profile Section */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">Profile Information</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Name</label>
                                <input
                                    type="text"
                                    value={settings.businessName}
                                    onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Contact Email</label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/5 pb-2">Preferences</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <div>
                                    <span className="block text-sm font-bold text-white">Email Notifications</span>
                                    <span className="block text-xs text-white/40 mt-1">Receive updates about new redemptions</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications}
                                    onChange={e => setSettings({ ...settings, notifications: e.target.checked })}
                                    className="w-5 h-5 rounded border-white/20 bg-black/20 text-[#FF5722] focus:ring-[#FF5722] focus:ring-offset-0"
                                />
                            </label>

                            <label className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <div>
                                    <span className="block text-sm font-bold text-white">Public Visibility</span>
                                    <span className="block text-xs text-white/40 mt-1">Show your profile on the community map</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.publicVisibility}
                                    onChange={e => setSettings({ ...settings, publicVisibility: e.target.checked })}
                                    className="w-5 h-5 rounded border-white/20 bg-black/20 text-[#FF5722] focus:ring-[#FF5722] focus:ring-offset-0"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="h-12 px-8 bg-[#FF5722] hover:bg-[#F4511E] rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </GlassCard>
        </div >
    );
}
