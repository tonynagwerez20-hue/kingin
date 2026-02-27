"use client";

import { useEffect, useState } from "react";
import { Terminal, ShieldCheck, Zap, AlertCircle } from "lucide-react";

interface AuditLog {
    timestamp: string;
    module: string;
    type: string;
    data: any;
    message?: string;
}

interface StrategyAuditFeedProps {
    className?: string;
}

export default function StrategyAuditFeed({ className = "" }: StrategyAuditFeedProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch("http://localhost:8000/audit?limit=20");
                const data = await res.json();
                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch audit logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return "??:??:??";
        }
    };

    const getTypeIcon = (module: string) => {
        switch (module) {
            case "STRATEGY":
                return <Terminal className="text-primary" size={14} />;
            case "CRO":
                return <ShieldCheck className="text-warning" size={14} />;
            case "EXECUTION":
                return <Zap className="text-success" size={14} />;
            default:
                return <AlertCircle className="text-textMuted" size={14} />;
        }
    };

    if (loading) {
        return (
            <div className={`card bg-surface/30 ${className}`}>
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-surface rounded w-1/3 mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-surface rounded"></div>
                        <div className="h-4 bg-surface rounded w-5/6"></div>
                        <div className="h-4 bg-surface rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`card overflow-hidden flex flex-col ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-textPrimary uppercase tracking-tight flex items-center gap-2">
                    <Terminal className="text-primary" size={18} />
                    Strategy Audit Feed
                </h3>
                <span className="text-[10px] font-mono text-textMuted uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                    Live Telemetry
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-80">
                {logs.length > 0 ? (
                    logs.map((log, idx) => (
                        <div key={idx} className="group p-2 bg-black/20 hover:bg-black/40 rounded border border-border/30 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {getTypeIcon(log.module)}
                                    <span className={`text-[10px] font-black uppercase ${log.module === "STRATEGY" ? "text-primary" :
                                            log.module === "CRO" ? "text-warning" :
                                                "text-success"
                                        }`}>
                                        {log.module}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-textMuted group-hover:text-textSecondary">
                                    {formatTime(log.timestamp)}
                                </span>
                            </div>
                            <p className="text-xs text-textSecondary overflow-hidden text-ellipsis whitespace-nowrap">
                                {log.type}: {JSON.stringify(log.data || {})}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 opacity-30 italic text-sm">
                        No activity detected
                    </div>
                )}
            </div>
        </div>
    );
}
