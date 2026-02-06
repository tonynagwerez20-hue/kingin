"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Activity, History, Settings, ShieldCheck } from "lucide-react";

const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/live", label: "Live Monitor", icon: Activity },
    { href: "/intelligence", label: "Signal Intel", icon: ShieldCheck },
    { href: "/execution", label: "Exec Monitor", icon: Activity },
    { href: "/history", label: "Trade History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-surface border-r border-border p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-primary">Trading System</h1>
                <p className="text-sm text-textSecondary">XAUUSD Orderflow</p>
            </div>

            <nav className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? "bg-primary text-white"
                                : "text-textSecondary hover:bg-surface/80 hover:text-textPrimary"
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-8">
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                        <span className="text-sm font-medium">System Online</span>
                    </div>
                    <p className="text-xs text-textSecondary">All systems operational</p>
                </div>
            </div>
        </aside>
    );
}
