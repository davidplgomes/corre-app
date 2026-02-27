'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle, XCircle, Edit2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllPartners, togglePartnerStatus, updatePartner, type PartnerWithUser } from '@/lib/services/partners';
import { AdminTable } from '@/components/ui/admin-table';
import { PartnerForm } from '@/components/admin/partner-form';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PartnerApplication } from '@/types';
import { toast } from 'sonner';

type CreatePartnerPayload = {
    full_name: string;
    email: string;
    password: string;
    business_name: string;
    business_description: string;
    contact_email: string;
    website_url: string;
};

type PartnerCredentials = {
    email: string;
    temporaryPassword: string;
    existingUser?: boolean;
};

const INITIAL_CREATE_PARTNER_FORM: CreatePartnerPayload = {
    full_name: '',
    email: '',
    password: '',
    business_name: '',
    business_description: '',
    contact_email: '',
    website_url: '',
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return 'Unknown error';
    }
}

function formatDateTime(value: string): string {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

export default function PartnersPage() {
    const router = useRouter();
    const [partners, setPartners] = useState<PartnerWithUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [applications, setApplications] = useState<PartnerApplication[]>([]);
    const [applicationsLoading, setApplicationsLoading] = useState(true);
    const [applicationsActionLoadingId, setApplicationsActionLoadingId] = useState<string | null>(null);
    const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<PartnerWithUser | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState<CreatePartnerPayload>(INITIAL_CREATE_PARTNER_FORM);
    const [createdCredentials, setCreatedCredentials] = useState<PartnerCredentials | null>(null);

    useEffect(() => {
        checkAuth();
        fetchPartners();
        fetchPartnerApplications();
    }, []);

    const checkAuth = async () => {
        const supabase = createClient();
        const {
            data: { session },
        } = await supabase.auth.getSession();

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
            const message = getErrorMessage(error);
            console.error('Error fetching partners:', message);
            toast.error(`Failed to load partners: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchPartnerApplications = async () => {
        try {
            setApplicationsLoading(true);
            const response = await fetch('/api/admin/partner-applications?status=pending');
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || 'Failed to load partner applications.');
            }
            setApplications((result?.applications as PartnerApplication[]) || []);
        } catch (error) {
            const message = getErrorMessage(error);
            console.error('Error fetching partner applications:', message);
            toast.error(`Failed to load applications: ${message}`);
        } finally {
            setApplicationsLoading(false);
        }
    };

    const handleToggleStatus = async (partnerId: string, currentStatus: boolean) => {
        try {
            await togglePartnerStatus(partnerId, !currentStatus);
            setPartners(partners.map((p) =>
                p.id === partnerId ? { ...p, is_active: !currentStatus } : p
            ));
            toast.success(currentStatus ? 'Partner deactivated' : 'Partner activated');
        } catch (error) {
            const message = getErrorMessage(error);
            console.error('Error updating partner status:', message);
            toast.error(`Failed to update partner status: ${message}`);
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

            const updatedPartnerWithUser = {
                ...editingPartner,
                ...updated,
            };

            setPartners(partners.map((p) => (p.id === updated.id ? updatedPartnerWithUser : p)));
            setIsFormOpen(false);
            toast.success('Partner updated successfully');
        } catch (error) {
            const message = getErrorMessage(error);
            console.error('Error saving partner:', message);
            toast.error(`Failed to save partner: ${message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenCreateModal = () => {
        setCreateForm(INITIAL_CREATE_PARTNER_FORM);
        setIsCreateOpen(true);
    };

    const handleCreatePartner = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const response = await fetch('/api/admin/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || 'Failed to create partner account.');
            }

            setIsCreateOpen(false);
            await fetchPartners();

            const temporaryPassword = result?.temporary_password as string | null;
            if (temporaryPassword) {
                setCreatedCredentials({
                    email: result.email as string,
                    temporaryPassword,
                    existingUser: Boolean(result?.existing_user),
                });
            }

            toast.success('Partner account created successfully');
        } catch (error) {
            const message = getErrorMessage(error);
            toast.error(message);
        } finally {
            setCreating(false);
        }
    };

    const handleApplicationDecision = async (
        application: PartnerApplication,
        decision: 'approve' | 'decline'
    ) => {
        let reviewNotes = '';
        if (decision === 'decline') {
            const notesPrompt = window.prompt('Optional decline reason for internal review notes:');
            if (notesPrompt === null) return;
            reviewNotes = notesPrompt;
        }

        setApplicationsActionLoadingId(application.id);
        try {
            const response = await fetch(`/api/admin/partner-applications/${application.id}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision,
                    review_notes: reviewNotes || undefined,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || `Failed to ${decision} application.`);
            }

            if (decision === 'approve') {
                const temporaryPassword = result?.temporary_password as string | null;
                if (temporaryPassword) {
                    setCreatedCredentials({
                        email: result.email as string,
                        temporaryPassword,
                        existingUser: Boolean(result?.existing_user),
                    });
                }
                toast.success('Application approved and partner account activated.');
                await fetchPartners();
            } else {
                toast.success('Application declined.');
            }

            setApplications((prev) => prev.filter((item) => item.id !== application.id));
        } catch (error) {
            const message = getErrorMessage(error);
            toast.error(message);
        } finally {
            setApplicationsActionLoadingId(null);
        }
    };

    const handleApplicationDecisionFromModal = async (decision: 'approve' | 'decline') => {
        if (!selectedApplication) return;
        await handleApplicationDecision(selectedApplication, decision);
        setSelectedApplication(null);
    };

    const filteredPartners = partners.filter((p) => {
        if (filter === 'all') return true;
        if (filter === 'active') return p.is_active;
        if (filter === 'inactive') return !p.is_active;
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Partners</h2>
                    <p className="text-white/40 text-sm">Manage partner applications and business accounts.</p>
                </div>

                <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
                    <div className="flex bg-[#0A0A0A] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto max-w-full">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none ${
                                filter === 'all' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none ${
                                filter === 'active'
                                    ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                    : 'text-white/40 hover:text-white'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilter('inactive')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex-1 md:flex-none ${
                                filter === 'inactive' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                            }`}
                        >
                            Inactive
                        </button>
                    </div>

                    <Button type="button" onClick={handleOpenCreateModal} className="h-[34px] whitespace-nowrap">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Partner
                    </Button>
                </div>
            </div>

            <AdminTable
                title={`Pending Applications (${applications.length})`}
                data={applications}
                isLoading={applicationsLoading}
                onRowClick={(application) => setSelectedApplication(application)}
                columns={[
                    {
                        header: 'Applicant',
                        cell: (application) => (
                            <div className="flex items-start gap-3">
                                {application.logo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={application.logo_url}
                                        alt={application.business_name}
                                        className="w-10 h-10 rounded-lg object-cover border border-white/10"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-white/40" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-white font-semibold">{application.poc_name || application.full_name}</p>
                                    <p className="text-xs text-white/50">{application.email}</p>
                                    {application.phone && (
                                        <p className="text-xs text-white/40 mt-1">
                                            {application.phone_country_code ? `${application.phone_country_code} ` : ''}
                                            {application.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ),
                    },
                    {
                        header: 'Benefits',
                        cell: (application) => (
                            <div>
                                <p className="text-xs text-white/40 uppercase tracking-wider">Club</p>
                                <p className="text-xs text-white/80 line-clamp-2 max-w-[260px]">
                                    {application.club_benefits || '-'}
                                </p>
                                <p className="text-xs text-white/40 uppercase tracking-wider mt-2">Staff</p>
                                <p className="text-xs text-white/80 line-clamp-2 max-w-[260px]">
                                    {application.staff_benefits || '-'}
                                </p>
                            </div>
                        ),
                    },
                    {
                        header: 'Business',
                        cell: (application) => (
                            <div>
                                <p className="text-sm text-white font-semibold">{application.business_name}</p>
                                {(application.category || application.membership) && (
                                    <p className="text-xs text-white/40">
                                        {[
                                            application.category === 'Other' && application.category_other
                                                ? `Other: ${application.category_other}`
                                                : application.category,
                                            application.membership,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                                {application.start_date && (
                                    <p className="text-xs text-white/40">Start: {application.start_date}</p>
                                )}
                                {application.instagram_handle && (
                                    <p className="text-xs text-white/40">
                                        @{application.instagram_handle.replace(/^@/, '')}
                                    </p>
                                )}
                            </div>
                        ),
                    },
                    {
                        header: 'Submitted',
                        cell: (application) => (
                            <div>
                                <p className="text-xs text-white/60">{formatDateTime(application.created_at)}</p>
                                {application.website_url && (
                                    <a
                                        href={application.website_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-[#FF5722] hover:underline"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        Visit website
                                    </a>
                                )}
                            </div>
                        ),
                    },
                    {
                        header: 'Actions',
                        className: 'text-right',
                        cell: (application) => {
                            const rowLoading = applicationsActionLoadingId === application.id;
                            return (
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={rowLoading}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void handleApplicationDecision(application, 'decline');
                                        }}
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={rowLoading}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            void handleApplicationDecision(application, 'approve');
                                        }}
                                    >
                                        Approve
                                    </Button>
                                </div>
                            );
                        },
                    },
                ]}
            />

            <Modal
                isOpen={Boolean(selectedApplication)}
                onClose={() => setSelectedApplication(null)}
                title={selectedApplication?.business_name || 'Partner Application'}
                description="Review all submission details before approving or declining."
                className="max-w-3xl"
            >
                {selectedApplication ? (
                    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">POC</p>
                                <p className="text-sm text-white">{selectedApplication.poc_name || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Login Email</p>
                                <p className="text-sm text-white break-all">{selectedApplication.email || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Phone</p>
                                <p className="text-sm text-white">
                                    {selectedApplication.phone_country_code ? `${selectedApplication.phone_country_code} ` : ''}
                                    {selectedApplication.phone || '-'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Instagram</p>
                                <p className="text-sm text-white">{selectedApplication.instagram_handle || '-'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Category</p>
                                <p className="text-sm text-white">
                                    {selectedApplication.category === 'Other' && selectedApplication.category_other
                                        ? `Other: ${selectedApplication.category_other}`
                                        : selectedApplication.category || '-'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Membership</p>
                                <p className="text-sm text-white">{selectedApplication.membership || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Start Date</p>
                                <p className="text-sm text-white">{selectedApplication.start_date || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Submitted At</p>
                                <p className="text-sm text-white">{formatDateTime(selectedApplication.created_at)}</p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                            <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Club Benefits</p>
                            <p className="text-sm text-white whitespace-pre-wrap">{selectedApplication.club_benefits || '-'}</p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                            <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Staff Benefits</p>
                            <p className="text-sm text-white whitespace-pre-wrap">{selectedApplication.staff_benefits || '-'}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Website</p>
                                {selectedApplication.website_url ? (
                                    <a
                                        href={selectedApplication.website_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-sm text-[#FF5722] hover:underline break-all"
                                    >
                                        {selectedApplication.website_url}
                                    </a>
                                ) : (
                                    <p className="text-sm text-white">-</p>
                                )}
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Business Contact Email</p>
                                <p className="text-sm text-white break-all">{selectedApplication.contact_email || '-'}</p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">City / Country</p>
                                <p className="text-sm text-white">
                                    {[selectedApplication.city, selectedApplication.country].filter(Boolean).join(', ') || '-'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                                <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Address</p>
                                <p className="text-sm text-white">{selectedApplication.business_address || '-'}</p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                            <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Business Description</p>
                            <p className="text-sm text-white whitespace-pre-wrap">{selectedApplication.business_description || '-'}</p>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                            <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">Notes</p>
                            <p className="text-sm text-white whitespace-pre-wrap">{selectedApplication.notes || '-'}</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="ghost" onClick={() => setSelectedApplication(null)}>
                                Close
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={applicationsActionLoadingId === selectedApplication.id}
                                onClick={() => void handleApplicationDecisionFromModal('decline')}
                            >
                                Decline
                            </Button>
                            <Button
                                type="button"
                                disabled={applicationsActionLoadingId === selectedApplication.id}
                                onClick={() => void handleApplicationDecisionFromModal('approve')}
                            >
                                Approve
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Modal>

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
                        ),
                    },
                    {
                        header: 'Representative',
                        cell: (partner) => (
                            <div>
                                <p className="text-white text-sm font-medium">{partner.users?.full_name}</p>
                                <p className="text-xs text-white/40">{partner.users?.email}</p>
                            </div>
                        ),
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
                        ),
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
                                    className={`p-2 rounded-lg transition-colors ${
                                        partner.is_active
                                            ? 'text-white/20 hover:text-red-500 hover:bg-red-500/10'
                                            : 'text-green-500 hover:bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                    }`}
                                    title={partner.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {partner.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                            </div>
                        ),
                    },
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

            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Create Partner Account"
                description="Create the authentication account and business profile in one step."
            >
                <form className="space-y-4" onSubmit={handleCreatePartner}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Full Name</label>
                            <Input
                                required
                                value={createForm.full_name}
                                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                placeholder="Partner representative"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Login Email</label>
                            <Input
                                required
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                placeholder="partner@business.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Initial Password (optional)</label>
                        <Input
                            type="text"
                            value={createForm.password}
                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                            placeholder="Leave empty to auto-generate a temporary password"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Business Name</label>
                        <Input
                            required
                            value={createForm.business_name}
                            onChange={(e) => setCreateForm({ ...createForm, business_name: e.target.value })}
                            placeholder="Business legal name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Business Description</label>
                        <Textarea
                            value={createForm.business_description}
                            onChange={(e) => setCreateForm({ ...createForm, business_description: e.target.value })}
                            placeholder="Short description of the partner business"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Contact Email (optional)</label>
                            <Input
                                type="email"
                                value={createForm.contact_email}
                                onChange={(e) => setCreateForm({ ...createForm, contact_email: e.target.value })}
                                placeholder="contact@business.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Website URL (optional)</label>
                            <Input
                                value={createForm.website_url}
                                onChange={(e) => setCreateForm({ ...createForm, website_url: e.target.value })}
                                placeholder="https://example.com"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={creating}>
                            Create Partner
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(createdCredentials)}
                onClose={() => setCreatedCredentials(null)}
                title="Partner Credentials"
                description="Share these credentials securely. Ask the partner to change password immediately after first login."
            >
                <div className="space-y-4">
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Email</p>
                        <p className="text-sm text-white break-all">{createdCredentials?.email}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                        <p className="text-xs uppercase tracking-wider text-white/40 mb-1">Temporary Password</p>
                        <p className="text-sm text-white break-all">{createdCredentials?.temporaryPassword}</p>
                    </div>
                    {createdCredentials?.existingUser ? (
                        <p className="text-xs text-white/50">
                            Existing user account reused. New credentials may not apply if the user already has a password.
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={async () => {
                                if (!createdCredentials) return;
                                await navigator.clipboard.writeText(
                                    `Email: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.temporaryPassword}`
                                );
                                toast.success('Credentials copied');
                            }}
                        >
                            Copy
                        </Button>
                        <Button type="button" onClick={() => setCreatedCredentials(null)}>
                            Done
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
