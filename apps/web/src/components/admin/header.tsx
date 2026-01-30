"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Bell, ChevronRight, Home, ChevronDown, LogOut, User, Settings, X, ExternalLink, Menu } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { AdminSidebar } from "@/components/admin/sidebar"

export function AdminHeader() {
    const pathname = usePathname()
    const router = useRouter()
    const pathSegments = pathname.split("/").filter(Boolean).slice(1) // remove 'admin'

    // State
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Refs for click outside
    const profileRef = useRef<HTMLDivElement>(null)
    const notifRef = useRef<HTMLDivElement>(null)

    // Mock Notifications
    const notifications = [
        { id: 1, title: "New Partner Request", message: "Bakery 101 requests approval", time: "2m ago", unread: true },
        { id: 2, title: "Server Alert", message: "High latency detected in EU-West", time: "1h ago", unread: true },
        { id: 3, title: "Subscription", message: "New Pro Plan subscriber", time: "3h ago", unread: false },
    ]

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false)
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/login")
        toast.info("Logged out successfully")
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return
        toast.info(`Searching for: ${searchQuery}`)
        // Implement actual search routing here if needed, e.g. router.push(`/admin/search?q=${searchQuery}`)
    }

    return (
        <header className="sticky top-0 z-40 w-full mb-8">
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Trigger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="lg:hidden p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-white/40 overflow-hidden">
                        <Link href="/admin/dashboard" className="hover:text-white transition-colors shrink-0">
                            <Home className="w-4 h-4" />
                        </Link>
                        {pathSegments.map((segment, i) => (
                            <div key={i} className={`flex items-center gap-2 overflow-hidden ${i < pathSegments.length - 1 ? 'hidden sm:flex' : 'flex'}`}>
                                <ChevronRight className="w-3 h-3 shrink-0" />
                                <Link
                                    href={`/admin/${pathSegments.slice(0, i + 1).join('/')}`}
                                    className={`capitalize hover:text-white transition-colors truncate max-w-[100px] md:max-w-none ${i === pathSegments.length - 1 ? "text-white font-medium" : ""}`}
                                >
                                    {segment}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Section: Search & Profile */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Search Bar - Hidden on mobile, maybe show an icon instead? For now hiding to save space */}
                    <form onSubmit={handleSearch} className="relative group hidden md:block">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-white/40 group-focus-within:text-[#FF5722] transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-64 bg-white/5 border border-white/10 rounded-full pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5722]/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                        />
                    </form>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all relative ${isNotificationsOpen ? 'bg-white/10 border-white/30' : ''}`}
                        >
                            <Bell className="w-4 h-4 text-white/60" />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#FF5722] rounded-full border border-black" />
                        </button>

                        {/* Notifications Dropdown */}
                        {isNotificationsOpen && (
                            <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-80 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl p-0 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50 mr-[-3rem] sm:mr-0">
                                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                                    <button onClick={() => setIsNotificationsOpen(false)} className="text-white/40 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {notifications.map(notif => (
                                        <div key={notif.id} className={`p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors cursor-pointer ${notif.unread ? 'bg-[#FF5722]/5' : ''}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-sm font-bold text-white">{notif.title}</p>
                                                <span className="text-[10px] text-white/40">{notif.time}</span>
                                            </div>
                                            <p className="text-xs text-white/60">{notif.message}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                                    <button className="text-xs font-bold text-[#FF5722] hover:text-[#F4511E] transition-colors">Mark All as Read</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`flex items-center gap-3 pl-2 pr-4 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isProfileOpen ? 'bg-white/10 border-white/30' : ''}`}
                        >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-red-500 relative overflow-hidden">
                                {/* Optional: Add user avatar image if available */}
                            </div>
                            <span className="text-sm font-medium text-white hidden md:block">Admin</span>
                            <ChevronDown className={`w-3 h-3 text-white/40 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 top-12 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl p-1 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                <Link
                                    href="/admin/dashboard/settings"
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setIsProfileOpen(false)}
                                >
                                    <User className="w-4 h-4" />
                                    Profile
                                </Link>
                                <Link
                                    href="/admin/dashboard/settings"
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setIsProfileOpen(false)}
                                >
                                    <Settings className="w-4 h-4" />
                                    Settings
                                </Link>
                                <a
                                    href="/"
                                    target="_blank"
                                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors border-t border-white/5 mt-1 pt-3"
                                    onClick={() => setIsProfileOpen(false)}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Live Site
                                </a>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar */}
            <MobileSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
                <AdminSidebar className="relative h-full w-full border-none" onNavigate={() => setIsMobileMenuOpen(false)} />
            </MobileSidebar>
        </header>
    )
}
