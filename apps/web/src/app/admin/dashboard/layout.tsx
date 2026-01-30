import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminHeader } from "@/components/admin/header"

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 selection:text-white relative">

            {/* 
        Clean Background 
        Just a subtle, high-quality gradient mesh, extremely dark.
        No loud blobs.
      */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1a1a1a_0%,_#000000_100%)]" />
            </div>

            <div className="hidden lg:block">
                <AdminSidebar />
            </div>

            <main className="lg:pl-[280px] w-full min-h-screen relative z-10 flex flex-col transition-all duration-300">
                <div className="max-w-[1440px] w-full mx-auto px-4 md:px-8 py-8 flex-1 flex flex-col">
                    <AdminHeader />
                    <div className="flex-1 animate-in fade-in duration-700">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
