"use client";

import { useEffect, useState } from "react";
import {
    Server,
    Activity,
    ShieldCheck,
    Terminal,
    Cpu,
    RefreshCcw,
    Wifi,
    WifiOff,
    Database,
    Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ConnectionsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Infrastructure <span className="text-primary/50 text-xl font-mono">Status Node</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 mt-1">
                        <Server size={12} className="text-primary" />
                        Low-Level Socket & Service Monitoring
                    </p>
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-accent/30 border border-border/50 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                    <RefreshCcw size={14} /> Full System Sync
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SocketCard
                    label="DTC Service"
                    desc="Sierra Chart Direct Interface"
                    port="tcp://127.0.0.1:11099"
                    status="connected"
                    latency="4ms"
                />
                <SocketCard
                    label="ZeroMQ Pipeline"
                    desc="Internal Message Bus"
                    port="ipc://trading_bus"
                    status="connected"
                    latency="1ms"
                />
                <SocketCard
                    label="Strategy Engine"
                    desc="Python Core Execution"
                    port="pid: 4421"
                    status="connected"
                    latency="N/A"
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight uppercase">Traffic Topology</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Real-time packet flow & throughput</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-muted-foreground font-mono">BANDWIDTH: 1.2 MB/s</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-accent/10 rounded-lg border border-border/50 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:24px_24px] opacity-10" />
                        <div className="flex flex-col items-center opacity-30 group-hover:opacity-50 transition-opacity">
                            <Database size={48} className="text-muted-foreground mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Topology Visualization Offline</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Globe size={14} className="text-primary" /> MT5 Gateway
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <GatewayItem label="Account" value="Real #844192" status="ok" />
                        <GatewayItem label="Server" value="ICMarkets-SC-Live" status="ok" />
                        <GatewayItem label="Mode" value="Full DMA" status="ok" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={14} className="text-primary" /> Security Context
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <GatewayItem label="Auth" value="Signed Session" status="ok" />
                        <GatewayItem label="Encyption" value="TLS 1.3" status="ok" />
                        <GatewayItem label="IP Lock" value="127.0.0.1" status="ok" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SocketCard({ label, desc, port, status, latency }: any) {
    return (
        <Card className="bg-card border-border hover:border-primary/20 transition-all group">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{label}</span>
                        <h3 className="text-sm font-bold text-foreground mt-1">{desc}</h3>
                    </div>
                    {status === "connected" ? <Wifi size={18} className="text-primary" /> : <WifiOff size={18} className="text-destructive" />}
                </div>
                <div className="p-2 bg-accent/20 rounded font-mono text-[10px] flex justify-between items-center">
                    <span className="text-muted-foreground truncate mr-2">{port}</span>
                    <span className="text-foreground font-bold">{latency}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function GatewayItem({ label, value, status }: { label: string; value: string; status: "ok" | "warn" | "error" }) {
    return (
        <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xs font-black">{value}</span>
                <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    status === "ok" ? "bg-primary" : status === "warn" ? "bg-yellow-500" : "bg-destructive"
                )} />
            </div>
        </div>
    );
}
