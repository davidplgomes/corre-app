'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Shield, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllUsers, searchUsers, updateUserRole } from '@/lib/services/users';
import { AdminTable } from '@/components/ui/admin-table';
import { Badge } from '@/components/ui/badge';
import type { User, UserRole } from '@/types';

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
        fetchUsers();
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

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length > 2) {
            try {
                // Determine if searching by ID (UUID format) or text
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

                if (isUuid) {
                    // If it's a UUID, we might want to use a specific getById or just filter client side if not many users
                    // But searchUsers service uses ilike on name/email.
                    // Let's rely on searchUsers for name/email
                    const data = await searchUsers(query);
                    setUsers(data);
                } else {
                    const data = await searchUsers(query);
                    setUsers(data);
                }
            } catch (error) {
                console.error('Error searching users:', error);
            }
        } else if (query.length === 0) {
            fetchUsers();
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
        try {
            setUpdating(userId);
            await updateUserRole(userId, newRole);

            // Update local state
            setUsers(users.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ));
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update user role');
        } finally {
            setUpdating(null);
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'partner': return 'info';
            default: return 'secondary';
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
                        <h1 className="text-xl font-bold tracking-tight">User Management</h1>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
                {/* Actions */}
                <div className="flex flex-col md:flex-row gap-6 justify-between mb-8">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5722]/50 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-white/40">
                            Total: <span className="text-white font-mono">{users.length}</span>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <AdminTable
                    data={users}
                    isLoading={loading}
                    columns={[
                        {
                            header: 'User',
                            cell: (user) => (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative">
                                        {user.avatar_url ? (
                                            <Image
                                                src={user.avatar_url}
                                                alt={user.full_name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-white/40" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{user.full_name}</p>
                                        <p className="text-xs text-white/40">{user.email}</p>
                                    </div>
                                </div>
                            )
                        },
                        {
                            header: 'Role',
                            cell: (user) => (
                                <div className="flex items-center gap-2">
                                    <Badge variant={getRoleBadgeVariant(user.role)}>
                                        {user.role.toUpperCase()}
                                    </Badge>
                                </div>
                            )
                        },
                        {
                            header: 'Membership',
                            cell: (user) => (
                                <Badge variant="outline" className="font-mono uppercase">
                                    {user.membership_tier}
                                </Badge>
                            )
                        },
                        {
                            header: 'Points',
                            accessorKey: 'total_lifetime_points',
                            className: 'font-mono'
                        },
                        {
                            header: 'Actions',
                            cell: (user) => (
                                <div className="flex items-center gap-2">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleUpdate(user.id, e.target.value as UserRole)}
                                        disabled={updating === user.id}
                                        className="bg-[#0A0A0A] border border-white/10 rounded-lg py-1 px-2 text-xs text-white/80 focus:outline-none focus:border-white/20"
                                    >
                                        <option value="user">User</option>
                                        <option value="partner">Partner</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            )
                        }
                    ]}
                />
            </main>
        </div>
    );
}
