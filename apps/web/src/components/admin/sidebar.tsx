"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Calendar,
    Store,
    ShoppingBag,
    Building2,
    Activity,
    Plus,
    Sparkles,
    Settings,
    FileText,
    Shield
} from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"

const navItems = [
    {
        title: "Overview",
        items: [
            { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
            { title: "Subscription", href: "/admin/dashboard/subscription", icon: Activity },
            { title: "Settings", href: "/admin/dashboard/settings", icon: Settings },
        ]
    },
    {
        title: "Management",
        items: [
            { title: "Users", href: "/admin/dashboard/users", icon: Users },
            { title: "Events", href: "/admin/dashboard/events", icon: Calendar },
            { title: "Partners", href: "/admin/dashboard/partners", icon: Building2 },
        ]
    },
    {
        title: "Commerce",
        items: [
            { title: "Marketplace", href: "/admin/dashboard/marketplace", icon: Store },
            { title: "Shop", href: "/admin/dashboard/shop", icon: ShoppingBag },
            { title: "Logs", href: "/admin/dashboard/logs", icon: FileText },
        ]
    }
]

interface AdminSidebarProps {
    className?: string
    onNavigate?: () => void
}

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
    const pathname = usePathname()
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
            }
        }
        getUser();
    }, []);

    return (
        <div className={cn(
            "w-[280px] h-screen flex flex-col z-50 border-r border-white/[0.08] bg-[#1c1c1e]/60 backdrop-blur-[50px] saturate-[180%]",
            "fixed left-0 top-0", // Default fixed position
            className // Allow overriding (e.g., relative for mobile drawer if needed, or just let the drawer handle it)
        )}>
            {/* Brand Header */}
            <div className="p-8 pb-6">
                <div className="flex items-center gap-3">
                    <img src="/logo_transparent.png" alt="Corre Inc." className="h-8 w-auto object-contain" />
                </div>


            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-4 space-y-8 no-scrollbar pt-2">
                {navItems.map((group, i) => (
                    <div key={i}>
                        <h3 className="px-4 mb-2 text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                            {group.title}
                        </h3>
                        <div className="space-y-0.5">
                            {group.items.map((item, j) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={j}
                                        href={item.href}
                                        onClick={onNavigate}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 group relative",
                                            isActive
                                                ? "bg-white/10 text-white font-medium"
                                                : "text-white/60 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "w-4 h-4 transition-colors",
                                            isActive ? "text-white" : "text-white/40 group-hover:text-white/60"
                                        )} />
                                        <span className="text-sm">{item.title}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* User Profile - Bottom */}
            <div className="p-4 border-t border-white/[0.05]">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-neutral-700 overflow-hidden">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-white/40">
                                {user?.email?.[0].toUpperCase() || 'A'}
                            </div>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate w-32">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin User'}
                        </p>
                        <p className="text-xs text-white/40 truncate w-32">
                            {user?.email || 'Loading...'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
