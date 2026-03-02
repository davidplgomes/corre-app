import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Corre Dublin - Run Together, Grow Together",
    description: "Join Dublin's running community. Track runs, earn rewards, discover events, and connect with fellow runners.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
