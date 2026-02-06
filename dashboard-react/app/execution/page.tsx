"use client";

import { useEffect, useState } from "react";
import { Zap, Activity, ShieldCheck, Database, Server, Clock } from "lucide-react";
import clsx from "clsx";

interface ExecutionEvent {
    timestamp: string;
    event: string;
    module: string;
    metadata: {
        signal?: {
            action: string;
            symbol: string;
            lots: number | string;
        };
        status?: string;
        reason?: string;
    };
}

export default function ExecutionMonitorPage() {
    const [events, setEvents] = useState<ExecutionEvent[]>([]);
    const [systemStatus, setSystemStatus] = useState<any>(null);
    const [mt5Connected, setMt5Connected] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch audit logs for execution events
                const auditRes = await fetch("http://localhost:8000/audit?limit=20");
                const auditData = await auditRes.json();
                setEvents(auditData.filter((e: any) => ["PASS", "SIGNAL_GENERATED", "EXECUTION"].includes(e.event)));

                // Fetch real-time status
                const statusRes = await fetch("http://localhost:8000/status");
                const statusData = await statusRes.json();
                setSystemStatus(statusData);

                // MT5 connectivity check (via status endpoint logic)
                setMt5Connected(statusData.state === "CONNECTED" || statusData.state === "READY");
            } catch (error) {
                console.error("Execution monitor fetch error:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const PipelineStep = ({ icon: Icon, label, status, subtext }: any) => (
        <div className="flex flex-col items-center">
            <div className={clsx(
                "w-16 h-16 rounded-full flex items-center justify-center border-2 mb-3 shadow-lg transition-all",
                status === "active" ? "bg-success/20 border-success text-success animate-pulse" :
                    status === "warning" ? "bg-warning/20 border-warning text-warning" : "bg-surface border-border text-textMuted"
            )}>
                <Icon size={28} />
            </div>
            <p className="font-bold text-sm uppercase tracking-tighter">{label}</p>
            <p className="text-[10px] text-textMuted uppercase">{subtext}</p>
        </div>
    );

    return (
        <div className="space-y-10 max-w-6xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold mb-2">Execution Monitor</h1>
                <p className="text-textSecondary">Full-stack pipeline tracking & MT5 EA synchronization</p>
            </div>

            {/* Pipeline Visualization */}
            <div className="card bg-gradient-to-br from-surface to-black border-border/50 py-10">
                <div className="flex items-center justify-around relative">
                    {/* Connection Lines */}
                    <div className="absolute top-8 left-1/4 right-1/4 h-[2px] bg-border -z-0"></div>

                    <div className="z-10">
                        <PipelineStep
                            icon={Zap}
                            label="Strategy"
                            status="active"
                            subtext="DTC Stream"
                        />
                    </div>

                    <div className="z-10">
                        <PipelineStep
                            icon={ShieldCheck}
                            label="CRO Audit"
                            status={mt5Connected ? "active" : "warning"}
                            subtext="Risk Engine"
                        />
                    </div>

                    <div className="z-10">
                        <PipelineStep
                            icon={Server}
                            label="MT5 Bridge"
                            status={mt5Connected ? "active" : "idle"}
                            subtext="ZMQ 5557"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-surface/30">
                    <h4 className="text-textMuted text-xs font-bold uppercase mb-2">EA Connection</h4>
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-3 h-3 rounded-full", mt5Connected ? "bg-success shadow-[0_0_10px_rgba(0,255,136,0.5)]" : "bg-danger")}></div>
                        <span className="text-2xl font-bold tracking-tight">{mt5Connected ? "ONLINE" : "OFFLINE"}</span>
                    </div>
                </div>
                <div className="card bg-surface/30">
                    <h4 className="text-textMuted text-xs font-bold uppercase mb-2">Bridge Mode</h4>
                    <div className="flex items-center gap-3">
                        <Activity className="text-primary" size={24} />
                        <span className="text-2xl font-bold tracking-tight">REQ/REP</span>
                    </div>
                </div>
                <div className="card bg-surface/30">
                    <h4 className="text-textMuted text-xs font-bold uppercase mb-2">Avg. Latency</h4>
                    <div className="flex items-center gap-3">
                        <Clock className="text-success" size={24} />
                        <span className="text-2xl font-bold tracking-tight">&lt; 12ms</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-textPrimary">
                    <Database size={20} className="text-primary" />
                    Recent Execution Pipeline Flow
                </h3>

                <div className="space-y-2">
                    {events.map((event, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg group hover:border-textMuted transition-all">
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-2 h-2 rounded-full",
                                    event.event === "PASS" ? "bg-success" : event.event === "SIGNAL_GENERATED" ? "bg-primary" : "bg-warning"
                                )}></div>
                                <div>
                                    <p className="font-bold text-sm">
                                        {event.metadata.signal?.action} {event.metadata.signal?.symbol}
                                    </p>
                                    <p className="text-xs text-textMuted italic">
                                        {event.event} • {event.metadata.reason || "Processed successfully"}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-mono text-textMuted opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                                {event.timestamp.split(" ")[1]}
                            </span>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="py-10 text-center text-textMuted border border-dashed border-border rounded-lg">
                            Waiting for pipeline activity...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
