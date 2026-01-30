'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllPartners, togglePartnerStatus, updatePartner, type PartnerWithUser } from '@/lib/services/partners';
import { AdminTable } from '@/components/ui/admin-table';
import { Badge } from '@/components/ui/badge';
import { PartnerForm } from '@/components/admin/partner-form';
import { toast } from 'sonner';

export default function PartnersPage() {
    const router = useRouter();
    const [partners, setPartners] = useState<PartnerWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<PartnerWithUser | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
            toast.success(currentStatus ? 'Partner deactivated' : 'Partner activated');
        } catch (error) {
            console.error('Error updating partner status:', error);
            toast.error('Failed to update partner status');
        }
    };

    const handleEdit = (partner: PartnerWithUser) => {
        setEditingPartner(partner);
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (data: Partial<PartnerWithUser>) => {
        if (!editingPartner) return;
        setSubmitting(true);
        try {
            const updated = await updatePartner(editingPartner.id, data);

            // Merge updated data with existing user data for display
            const updatedPartnerWithUser = {
                ...editingPartner,
                ...updated
            };

            setPartners(partners.map(p => p.id === updated.id ? updatedPartnerWithUser : p));
            setIsFormOpen(false);
            toast.success('Partner updated successfully');
        } catch (error) {
            console.error('Error saving partner:', error);
            toast.error('Failed to save partner');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPartners = partners.filter(p => {
        if (filter === 'all') return true;
        if (filter === 'active') return p.is_active;
        if (filter === 'inactive') return !p.is_active;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Partners</h2>
                    <p className="text-white/40 text-sm">Manage business relationships and approvals.</p>
                </div>

                <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto max-w-full">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none ${filter === 'all' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none ${filter === 'active' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('inactive')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none ${filter === 'inactive' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        Pending
                    </button>
                </div>
            </div>

            {/* Partners Table */}
            <AdminTable
                data={filteredPartners}
                isLoading={loading}
                columns={[
                    {
                        header: 'Business Profile',
                        cell: (partner) => (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                    {partner.business_logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={partner.business_logo_url} alt={partner.business_name || ''} className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-5 h-5 text-white/40" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{partner.business_name || 'Unnamed Business'}</p>
                                    <p className="text-xs text-white/40 truncate max-w-[200px]">{partner.business_description || 'No description provided'}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: 'Representative',
                        cell: (partner) => (
                            <div>
                                <p className="text-white text-sm font-medium">{partner.users?.full_name}</p>
                                <p className="text-xs text-white/40">{partner.users?.email}</p>
                            </div>
                        )
                    },
                    {
                        header: 'Status',
                        cell: (partner) => (
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${partner.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-white/20'}`} />
                                <span className={`text-xs font-bold tracking-wider ${partner.is_active ? 'text-green-500' : 'text-white/40'}`}>
                                    {partner.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </div>
                        )
                    },
                    {
                        header: 'Actions',
                        cell: (partner) => (
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={() => handleEdit(partner)}
                                    className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors group"
                                    title="Edit Details"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(partner.id, partner.is_active)}
                                    className={`p-2 rounded-lg transition-colors ${partner.is_active
                                        ? 'text-white/20 hover:text-red-500 hover:bg-red-500/10'
                                        : 'text-green-500 hover:bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
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

            {editingPartner && (
                <PartnerForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={handleFormSubmit}
                    initialData={editingPartner}
                    loading={submitting}
                />
            )}
        </div>
    );
}
