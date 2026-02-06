import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

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
        <html lang="en">
            <body className={inter.className}>
                <div className="flex h-screen overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto p-8">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
