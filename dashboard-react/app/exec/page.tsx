"use client";

import { useEffect, useState } from "react";
import {
    Zap,
    Activity,
    ShieldCheck,
    Server,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ExecutionPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Execution <span className="text-primary/50 text-xl font-mono">Bridge v5.3</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 mt-1">
                        <Zap size={12} className="text-primary" />
                        Live Order Routing & Signal Vetting
                    </p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Broker Sync</p>
                        <p className="text-xs font-mono font-bold text-primary italic">OPTIMAL (14ms)</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight uppercase">Order Pipeline</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Active Vetting & Execution Logs</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <ExecutionItem
                                id="ORD-7721"
                                time="22:25:01"
                                symbol="XAU/USD"
                                side="BUY"
                                status="FILLED"
                                price="2650.42"
                                lots="0.50"
                            />
                            <ExecutionItem
                                id="ORD-7720"
                                time="22:24:58"
                                symbol="XAU/USD"
                                side="SELL"
                                status="FILLED"
                                price="2652.12"
                                lots="0.25"
                            />
                            <ExecutionItem
                                id="ORD-7719"
                                time="22:20:12"
                                symbol="XAU/USD"
                                side="BUY"
                                status="REJECTED"
                                price="2648.90"
                                lots="1.00"
                                reason="RISK_THRESHOLD_EXCEEDED"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14} className="text-primary" /> Risk Sentinel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <RiskMetric label="Max Drawdown" value="2.4%" status="ok" />
                            <RiskMetric label="Margin Usage" value="12.5%" status="ok" />
                            <RiskMetric label="Daily Exposure" value="$4,500" status="ok" />
                            <RiskMetric label="Concentration" value="High" status="warn" />
                        </CardContent>
                    </Card>

                    <Card className="bg-accent/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                <Activity size={12} className="text-primary" /> MT5 Pipeline Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <HealthMetric label="Req/Rep Loop" value="Direct" />
                            <HealthMetric label="Socket State" value="ESTABLISHED" />
                            <HealthMetric label="Msg Queue" value="0 Pending" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ExecutionItem({ id, time, symbol, side, status, price, lots, reason }: any) {
    return (
        <div className="p-3 bg-accent/10 rounded border border-border/50 hover:bg-accent/20 transition-all group">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
                    <Badge variant="outline" className="font-mono text-[10px] border-white/10">{id}</Badge>
                    <span className="text-sm font-black tracking-tighter uppercase">{symbol}</span>
                </div>
                <Badge variant={status === "FILLED" ? "teal" : status === "REJECTED" ? "danger" : "secondary"}>
                    {status}
                </Badge>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Type</p>
                        <p className={cn("text-xs font-black", side === "BUY" ? "text-primary" : "text-destructive")}>{side}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Price</p>
                        <p className="text-xs font-mono font-bold">{price}</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Size</p>
                        <p className="text-xs font-mono font-bold">{lots}</p>
                    </div>
                </div>
                {reason && (
                    <div className="flex items-center gap-1 text-[10px] text-destructive font-bold uppercase italic">
                        <AlertCircle size={12} />
                        {reason}
                    </div>
                )}
            </div>
        </div>
    );
}

function RiskMetric({ label, value, status }: { label: string; value: string; status: "ok" | "warn" | "error" }) {
    return (
        <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xs font-black tabular-nums">{value}</span>
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    status === "ok" ? "bg-primary" : status === "warn" ? "bg-yellow-500" : "bg-destructive"
                )} />
            </div>
        </div>
    );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-1 text-[10px]">
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className="font-mono font-bold text-foreground italic">{value}</span>
        </div>
    );
}
