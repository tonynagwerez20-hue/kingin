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
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("http://localhost:8000/status/detailed");
                const data = await res.json();
                setStatus(data);
            } catch (error) {
                console.error("Failed to fetch connection status:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

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
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-accent/30 border border-border/50 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all"
                >
                    <RefreshCcw size={14} /> Full System Sync
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SocketCard
                    label="DTC Service"
                    desc="Sierra Chart Direct Interface"
                    port={status?.dtc?.address || "tcp://127.0.0.1:11099"}
                    status={status?.dtc?.synced ? "connected" : "disconnected"}
                    latency={status?.dtc?.latency || "N/A"}
                />
                <SocketCard
                    label="Internal Pipeline"
                    desc="FastAPI Data Bridge"
                    port="http://localhost:8000"
                    status="connected"
                    latency="1ms"
                />
                <SocketCard
                    label="Strategy Engine"
                    desc="Python Core Execution"
                    port={`pid: ${status?.engine?.pid || "N/A"}`}
                    status={status?.engine?.status === "ACTIVE" ? "connected" : "disconnected"}
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
                        <Badge variant="outline" className="border-white/10 text-muted-foreground font-mono">
                            BANDWIDTH: {status?.throughput || "0.0"} KB/s
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-64 bg-accent/10 rounded-lg border border-border/50 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:24px_24px] opacity-10" />
                        <div className="flex flex-col items-center opacity-30 group-hover:opacity-50 transition-opacity">
                            <Database size={48} className="text-muted-foreground mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                                {status?.dtc?.synced ? "Bridge Connection Active" : "Topology Visualization Offline"}
                            </p>
                        </div>
                        {status?.dtc?.synced && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="text-primary/20 animate-pulse" size={120} />
                            </div>
                        )}
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
                        <GatewayItem label="Account" value={status?.mt5?.account || "N/A"} status={status?.mt5?.connected ? "ok" : "error"} />
                        <GatewayItem label="Server" value={status?.mt5?.server || "N/A"} status={status?.mt5?.connected ? "ok" : "error"} />
                        <GatewayItem label="Terminal" value={status?.mt5?.terminal_path ? "Detected" : "Missing"} status={status?.mt5?.terminal_path ? "ok" : "warn"} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <ShieldCheck size={14} className="text-primary" /> Security Context
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <GatewayItem label="Auth" value="DTC_PROT_v8" status="ok" />
                        <GatewayItem label="Engine Lock" value={status?.engine?.lock_file ? "HELD" : "RELEASED"} status={status?.engine?.lock_file ? "ok" : "warn"} />
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
