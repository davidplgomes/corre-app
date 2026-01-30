'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, User as UserIcon, Shield, Download, Filter, Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllUsers, searchUsers, updateUserRole, getUsersByRole, getUserStats, updateUserProfile, deleteUser } from '@/lib/services/users';
import { AdminTable } from '@/components/ui/admin-table';
import { UserManagementModal } from '@/components/admin/user-management-modal';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from 'sonner';
import type { User, UserRole } from '@/types';

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
    const [stats, setStats] = useState({ totalUsers: 0, totalPartners: 0, totalAdmins: 0 });

    useEffect(() => {
        checkAuth();
        fetchUsers();
        fetchStats();
    }, []);

    useEffect(() => {
        if (roleFilter === 'all') {
            fetchUsers();
        } else {
            filterByRole(roleFilter);
        }
    }, [roleFilter]);

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

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await getUserStats();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const filterByRole = async (role: UserRole) => {
        try {
            setLoading(true);
            const data = await getUsersByRole(role);
            setUsers(data);
        } catch (error) {
            console.error('Error filtering users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 2) {
            try {
                const data = await searchUsers(query);
                setUsers(data);
            } catch (error) {
                console.error('Error searching users:', error);
            }
        } else if (query.length === 0) {
            fetchUsers();
        }
    };

    const handleUpdateUser = async (userId: string, data: Partial<User>) => {
        try {
            await updateUserProfile(userId, data);

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, ...data } : u
            ));

            toast.success("User profile updated successfully");
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user profile");
            throw error;
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            await deleteUser(userId);

            // Update local state
            setUsers(users.filter(u => u.id !== userId));
            fetchStats(); // Update stats since count changed

            toast.success("User deleted successfully");
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Failed to delete user");
            throw error;
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: UserRole, userName: string) => {
        // Confirmation for sensitive role changes
        if (newRole === 'admin') {
            if (!confirm(`Are you sure you want to make ${userName} an Admin? They will have full access to the dashboard.`)) {
                return;
            }
        }

        try {
            setUpdating(userId);
            await updateUserRole(userId, newRole);

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ));

            // Update stats
            fetchStats();

            toast.success(`${userName}'s role updated to ${newRole.toUpperCase()}`);
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error('Failed to update user role. Check RLS policies.');
        } finally {
            setUpdating(null);
        }
    };

    const handleExportCSV = () => {
        const headers = ['Name', 'Email', 'Role', 'Tier', 'Points', 'Joined'];
        const rows = users.map(u => [
            u.full_name,
            u.email,
            u.role,
            u.membership_tier,
            u.total_lifetime_points,
            new Date(u.created_at).toLocaleDateString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `users_${roleFilter}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Users exported successfully");
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'partner': return 'default';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6">
                <GlassCard
                    className={`p-6 cursor-pointer transition-all ${roleFilter === 'all' ? 'border-[#FF5722]/50' : ''}`}
                    onClick={() => setRoleFilter('all')}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-white/40" />
                        <span className="text-xs font-bold uppercase text-white/40">Total Users</span>
                    </div>
                    <span className="text-3xl font-bold text-white">{stats.totalUsers}</span>
                </GlassCard>
                <GlassCard
                    className={`p-6 cursor-pointer transition-all ${roleFilter === 'partner' ? 'border-[#FF5722]/50' : ''}`}
                    onClick={() => setRoleFilter('partner')}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-[#FF5722]" />
                        <span className="text-xs font-bold uppercase text-white/40">Partners</span>
                    </div>
                    <span className="text-3xl font-bold text-[#FF5722]">{stats.totalPartners}</span>
                </GlassCard>
                <GlassCard
                    className={`p-6 cursor-pointer transition-all ${roleFilter === 'admin' ? 'border-[#FF5722]/50' : ''}`}
                    onClick={() => setRoleFilter('admin')}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        <span className="text-xs font-bold uppercase text-white/40">Admins</span>
                    </div>
                    <span className="text-3xl font-bold text-red-500">{stats.totalAdmins}</span>
                </GlassCard>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Users & Roles</h2>
                    <p className="text-white/40 text-sm">
                        Manage platform accounts and assign roles.
                        {roleFilter !== 'all' && <span className="text-[#FF5722]"> Filtering: {roleFilter}</span>}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80 flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <Input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="pl-10 bg-[#0A0A0A]/50 border-white/5 focus:border-[#FF5722]/50"
                        />
                    </div>
                    <Button variant="outline" onClick={handleExportCSV} className="gap-2 flex-1 md:flex-none">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>


            {/* User Management Modal */}
            {selectedUser && (
                <UserManagementModal
                    isOpen={!!selectedUser}
                    onClose={() => setSelectedUser(null)}
                    user={selectedUser}
                    onDelete={handleDeleteUser}
                />
            )}

            {/* Users Table */}
            <AdminTable
                data={users}
                isLoading={loading}
                columns={[
                    {
                        header: 'User Profile',
                        cell: (user) => (
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden relative border border-white/10">
                                    {user.avatar_url ? (
                                        <Image
                                            src={user.avatar_url}
                                            alt={user.full_name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                                            <UserIcon className="w-4 h-4 text-white/40" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{user.full_name}</p>
                                    <p className="text-xs text-white/40">{user.email}</p>
                                </div>
                            </div>
                        )
                    },
                    {
                        header: 'Current Role',
                        cell: (user) => (
                            <div className="flex items-center gap-2">
                                <Badge variant={getRoleBadgeVariant(user.role)} className="uppercase text-[10px] tracking-wider">
                                    {user.role}
                                </Badge>
                            </div>
                        )
                    },
                    {
                        header: 'Tier',
                        cell: (user) => (
                            <span className="text-xs font-mono uppercase text-white/60 bg-white/5 px-2 py-1 rounded">
                                {user.membership_tier}
                            </span>
                        )
                    },
                    {
                        header: 'Points',
                        cell: (user) => (
                            <span className="font-mono text-[#FF5722]">
                                {user.total_lifetime_points?.toLocaleString() || 0}
                            </span>
                        )
                    },
                    {
                        header: 'Actions',
                        cell: (user) => (
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleUpdate(user.id, e.target.value as UserRole, user.full_name)}
                                        disabled={updating === user.id}
                                        className={`appearance-none bg-black/20 border rounded-lg py-1.5 pl-3 pr-8 text-xs text-white/80 focus:outline-none transition-colors cursor-pointer hover:bg-white/5 ${updating === user.id
                                            ? 'border-[#FF5722]/50 animate-pulse'
                                            : 'border-white/10 focus:border-[#FF5722]'
                                            }`}
                                    >
                                        <option value="user" className="bg-neutral-900 text-white">User</option>
                                        <option value="partner" className="bg-neutral-900 text-white">Partner</option>
                                        <option value="admin" className="bg-neutral-900 text-white">Admin</option>
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {updating === user.id ? (
                                            <div className="w-3 h-3 border border-[#FF5722] border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-3 h-3 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedUser(user)}
                                    className="h-8 w-8 p-0"
                                >
                                    <Settings className="w-4 h-4 text-white/60" />
                                </Button>
                            </div>
                        )
                    }
                ]}
            />
        </div>
    );
}
