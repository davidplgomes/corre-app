"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, MembershipTier } from "@/types";
import { Trash2, ShieldAlert } from "lucide-react";

interface UserManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onDelete: (userId: string) => Promise<void>;
}

export function UserManagementModal({ isOpen, onClose, user, onDelete }: UserManagementModalProps) {
    const [loading, setLoading] = useState(false);

    // Danger zone state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await onDelete(user.id);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="User Administration"
            description="Manage user account status."
        >
            <div className="space-y-6">
                {/* Read-Only User Details */}
                <div className="bg-white/5 p-4 rounded-lg space-y-3 border border-white/10">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs text-white/40 uppercase">Full Name</Label>
                            <p className="text-sm font-medium text-white">{user.full_name}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-white/40 uppercase">Email</Label>
                            <p className="text-sm font-medium text-white">{user.email}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-white/40 uppercase">User ID</Label>
                            <p className="text-xs font-mono text-white/60 truncate" title={user.id}>{user.id}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-white/40 uppercase">Instagram</Label>
                            <p className="text-sm font-medium text-white">{user.instagram_handle || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <h4 className="font-bold text-red-500 text-sm">Danger Zone</h4>
                        </div>
                        <p className="text-xs text-white/60 mb-4">
                            Deleting a user is permanent and cannot be undone. All their data (runs, events, history) will be removed.
                        </p>

                        {!showDeleteConfirm ? (
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User Account
                            </Button>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-xs text-red-500 font-bold text-center animate-pulse">
                                    Are you absolutely sure?
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="flex-1 bg-red-600 hover:bg-red-700"
                                        onClick={handleDelete}
                                        disabled={loading}
                                    >
                                        {loading ? 'Deleting...' : 'Confirm Delete'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
