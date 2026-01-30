'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllPartners, togglePartnerStatus, type PartnerWithUser } from '@/lib/services/partners';
import { AdminTable } from '@/components/ui/admin-table';
import { Badge } from '@/components/ui/badge';

export default function PartnersPage() {
    const router = useRouter();
    const [partners, setPartners] = useState<PartnerWithUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
        fetchPartners();
    }, []);

    const checkAuth = async () => {
        const supabase = createClient();
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

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const data = await getAllPartners();
            setPartners(data);
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (partnerId: string, currentStatus: boolean) => {
        try {
            await togglePartnerStatus(partnerId, !currentStatus);
            setPartners(partners.map(p =>
                p.id === partnerId ? { ...p, is_active: !currentStatus } : p
            ));
        } catch (error) {
            console.error('Error updating partner status:', error);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#FF5722] selection:text-white pb-20">
            {/* Background Grid */}
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />

            {/* Header */}
            <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/dashboard"
                            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight">Partner Management</h1>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
                {/* Stats/Actions */}
                <div className="flex flex-col md:flex-row gap-6 justify-between mb-8">
                    <p className="text-white/60">
                        Manage registered businesses and partner accounts.
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-white/40">
                            Total Partners: <span className="text-white font-mono">{partners.length}</span>
                        </div>
                    </div>
                </div>

                {/* Partners Table */}
                <AdminTable
                    data={partners}
                    isLoading={loading}
                    columns={[
                        {
                            header: 'Business',
                            cell: (partner) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        {partner.business_logo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={partner.business_logo_url} alt={partner.business_name || ''} className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <Building2 className="w-5 h-5 text-white/40" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{partner.business_name || 'Unnamed Business'}</p>
                                        <p className="text-xs text-white/40 truncate max-w-[200px]">{partner.business_description}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            header: 'Contact',
                            cell: (partner) => (
                                <div>
                                    <p className="text-white text-sm">{partner.users?.full_name}</p>
                                    <p className="text-xs text-white/40">{partner.users?.email}</p>
                                </div>
                            )
                        },
                        {
                            header: 'Status',
                            cell: (partner) => (
                                <Badge variant={partner.is_active ? 'success' : 'secondary'}>
                                    {partner.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
                            )
                        },
                        {
                            header: 'Actions',
                            cell: (partner) => (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(partner.id, partner.is_active)}
                                        className={`p-2 rounded-lg transition-colors ${partner.is_active
                                                ? 'text-red-500 hover:bg-red-500/10'
                                                : 'text-green-500 hover:bg-green-500/10'
                                            }`}
                                        title={partner.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        {partner.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                </div>
                            )
                        }
                    ]}
                />
            </main>
        </div>
    );
}
