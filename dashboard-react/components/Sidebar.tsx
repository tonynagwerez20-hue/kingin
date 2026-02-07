"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    History,
    Settings,
    ShieldCheck,
    Zap,
    Server,
    Terminal,
    Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Nexus Node", icon: Cpu },
    { href: "/live", label: "Market Flux", icon: Activity },
    { href: "/intelligence", label: "Signal Intel", icon: ShieldCheck },
    { href: "/exec", label: "Execution", icon: Zap },
    { href: "/history", label: "Master Ledger", icon: History },
    { href: "/connections", label: "Infrastructure", icon: Server },
    { href: "/settings", label: "Config", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-card border-r border-border p-4 flex flex-col h-screen">
            <div className="mb-10 px-2 flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-md">
                    <Terminal className="text-primary" size={24} />
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tighter text-foreground leading-tight uppercase">Nexus Terminal</h1>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">Live Infrastructure</p>
                </div>
            </div>

            <nav className="space-y-1 flex-1">
                <div className="px-2 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">Systems</div>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group relative",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {isActive && <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-full" />}
                            <Icon size={18} className={cn(isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-border">
                <div className="bg-accent/50 p-4 rounded-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8" />
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Node</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase relative z-10 font-bold">
                        Global XAU/USD Orderflow Pipeline v5.3.0
                    </p>
                </div>
            </div>
        </aside>
    );
}
