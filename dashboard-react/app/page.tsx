"use client";

import { useEffect, useState } from "react";
import {
    Zap,
    ShieldCheck,
    TrendingUp,
    Activity,
    Server,
    Cpu,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNexusPrice } from "@/hooks/useNexusPrice";
import { cn } from "@/lib/utils";
import ConnectionStatus from "@/components/ConnectionStatus";
import StrategyAuditFeed from "@/components/StrategyAuditFeed";

export default function HomePage() {
    const { price, priceChange, priceChangePct, symbol } = useNexusPrice();
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("http://localhost:8000/status/detailed");
                const data = await res.json();
                setStatus(data);
            } catch (error) {
                console.error("Failed to fetch status:", error);
            }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        if (!seconds) return "0s";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Nexus Node <span className="text-primary/50 text-xl font-mono">01-PROD</span>
                    </h2>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            status?.engine?.status === "ACTIVE" ? "bg-primary animate-pulse" : "bg-destructive"
                        )} />
                        {status?.engine?.status === "ACTIVE" ? "Primary Orchestration Loop Active" : "Engine Standby / Offline"}
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">{symbol} Market</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black tabular-nums tracking-tight">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <div className={cn(
                                "flex items-center text-xs font-bold",
                                priceChange >= 0 ? "text-primary" : "text-destructive"
                            )}>
                                {priceChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {priceChangePct.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                    <div className="h-10 w-[1px] bg-border mx-2" />
                    <div className="flex flex-col items-center">
                        <Badge variant={status?.dtc?.synced ? "teal" : "secondary"}>
                            {status?.dtc?.synced ? "Synced" : "Disconnected"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono mt-1 uppercase text-center">DTC Bridge</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <Hash size={12} className="text-primary" /> Symbol
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{status?.dtc?.symbol || "N/A"}</div>
                        <p className="text-[10px] text-primary font-bold mt-1 tracking-tight">ACTIVE TICKER</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <ShieldCheck size={12} className="text-primary" /> MT5 Strategy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{status?.engine?.status || "OFFLINE"}</div>
                        <p className="text-[10px] text-primary font-bold mt-1 tracking-tight">SIG_VETTING ACTIVE</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <Clock size={12} className="text-primary" /> Node Uptime
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{formatUptime(status?.server_uptime)}</div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 tracking-tight italic">GLOBAL_UPTIME</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <Activity size={12} className="text-primary" /> Bal. (Credits)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">${status?.balance?.toLocaleString() || "0.00"}</div>
                        <div className="flex gap-1 mt-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <div key={i} className={cn(
                                    "w-1 h-3 rounded-full",
                                    status?.balance > 0 ? "bg-primary" : "bg-muted"
                                )} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ConnectionStatus className="lg:col-span-2" />
                <StrategyAuditFeed />
            </div>
        </div>
    );
}

