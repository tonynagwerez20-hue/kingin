import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Trading Dashboard | XAUUSD Orderflow System",
    description: "Professional real-time trading dashboard",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={cn("font-sans antialiased", "bg-background text-foreground")}>
                <div className="flex h-screen overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 relative overflow-y-auto bg-[#0a0f14]">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none opacity-20" />
                        <div className="relative z-10 p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </body>
        </html>
    );
}
