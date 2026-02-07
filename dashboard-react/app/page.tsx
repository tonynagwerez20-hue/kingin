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

export default function HomePage() {
    const { price, priceChange, priceChangePct, symbol } = useNexusPrice();
    const [systemStatus, setSystemStatus] = useState<any>(null);
    const [stats, setStats] = useState({
        trades: 142,
        winRate: 64.8,
        uptime: "99.99%",
        latency: "14ms"
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Nexus Node <span className="text-primary/50 text-xl font-mono">01-PROD</span>
                    </h2>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Primary Orchestration Loop Active
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">XAU/USD Market</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black tabular-nums tracking-tight">{price.toLocaleString()}</span>
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
                        <Badge variant="teal">Synced</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono mt-1 uppercase">DTC Bridge</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <Hash size={12} className="text-primary" /> Total Operations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{stats.trades}</div>
                        <p className="text-[10px] text-primary font-bold mt-1 tracking-tight">SIG_VETTING VALID</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <ShieldCheck size={12} className="text-primary" /> Strategy Efficacy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{stats.winRate}%</div>
                        <p className="text-[10px] text-primary font-bold mt-1 tracking-tight">+2.4% FROM BASELINE</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <Clock size={12} className="text-primary" /> Node Uptime
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{stats.uptime}</div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 tracking-tight italic">01:14:22:45</p>
                    </CardContent>
                </Card>
                <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                            <Activity size={12} className="text-primary" /> MT5 Latency
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black tracking-tight">{stats.latency}</div>
                        <div className="flex gap-1 mt-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <div key={i} className={cn(
                                    "w-1 h-3 rounded-full",
                                    i < 5 ? "bg-primary" : "bg-muted"
                                )} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight uppercase">System Health Matrix</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Infrastructure Load & Sync Status</CardDescription>
                            </div>
                            <Badge variant="outline" className="border-primary/20 text-primary">Live</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <HealthIndicator label="DTC Client" status="online" />
                                <HealthIndicator label="Strategy Engine" status="online" />
                                <HealthIndicator label="MT5 Bridge" status="online" />
                            </div>
                            <div className="h-48 w-full bg-accent/30 rounded-lg flex items-center justify-center border border-border/50 relative overflow-hidden group">
                                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-[radial-gradient(circle_at_center,_var(--primary)_0%,_transparent_70%)]" />
                                <BarChart3 className="text-muted-foreground/20 group-hover:text-primary/20 transition-colors" size={64} />
                                <span className="absolute bottom-4 left-4 text-[8px] font-mono text-muted-foreground">FLUX_DENSITY_STABLE</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-black tracking-tight uppercase">Audit Trail</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Latest Intelligence Events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <AuditItem time="22:15:01" event="SIGNAL_IDENTIFIED" module="IGOF_M5" status="OK" />
                            <AuditItem time="22:14:58" event="RISK_VALIDATION" module="CRO" status="OK" />
                            <AuditItem time="22:14:50" event="ORDER_ACK" module="MT5" status="OK" />
                            <AuditItem time="22:12:33" event="SYNC_PULSE" module="DTC" status="OK" />
                            <AuditItem time="22:08:12" event="BUF_OVERFLOW_W" module="MEM" status="WARN" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function HealthIndicator({ label, status }: { label: string; status: "online" | "offline" | "warn" }) {
    return (
        <div className="p-3 bg-accent/20 rounded-md border border-border/40">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    status === "online" ? "bg-primary shadow-[0_0_8px_rgba(0,255,255,0.5)]" : "bg-destructive"
                )} />
            </div>
            <div className="text-[10px] font-mono text-foreground font-bold italic">{status === "online" ? "STABLE" : "ERROR"}</div>
        </div>
    );
}

function AuditItem({ time, event, module, status }: { time: string; event: string; module: string; status: "OK" | "WARN" | "ERROR" }) {
    return (
        <div className="flex items-center justify-between text-[10px] py-1.5 border-b border-border/30 last:border-0 hover:bg-accent/10 transition-colors px-1 rounded">
            <div className="flex items-center gap-3">
                <span className="text-muted-foreground font-mono">{time}</span>
                <span className="font-black tracking-tight uppercase text-foreground">{event}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono opacity-50">[{module}]</span>
                <span className={cn(
                    "font-black uppercase",
                    status === "OK" ? "text-primary" : status === "WARN" ? "text-yellow-500" : "text-destructive"
                )}>{status}</span>
            </div>
        </div>
    );
}
