"use client";

import { useEffect, useState } from "react";
import { Search, Filter, ShieldCheck, ShieldAlert, Zap, Activity } from "lucide-react";
import clsx from "clsx";

interface AuditEntry {
    timestamp: string;
    module: string;
    event: string;
    metadata: {
        signal?: {
            action: string;
            symbol: string;
            price: number | string;
            lots: number | string;
            sl: number | string;
            desc?: string;
        };
        reason?: string;
        status?: string;
    };
}

export default function IntelligencePage() {
    const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                const res = await fetch("http://localhost:8000/audit?limit=50");
                const data = await res.json();
                setAuditLogs(data);
            } catch (error) {
                console.error("Failed to fetch audit logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAudit();
        const interval = setInterval(fetchAudit, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredLogs = auditLogs.filter(log => {
        if (filter === "ALL") return true;
        if (filter === "PASS") return log.event === "PASS";
        if (filter === "VETO") return log.event === "RISK_VETO";
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Signal Intelligence</h1>
                    <p className="text-textSecondary">Real-time strategy audit and risk vetting feed</p>
                </div>

                <div className="flex bg-surface border border-border rounded-lg p-1">
                    {["ALL", "PASS", "VETO"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                filter === f ? "bg-primary text-background" : "text-textSecondary hover:text-textPrimary"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredLogs.map((log, idx) => {
                    const isPass = log.event === "PASS";
                    const isVeto = log.event === "RISK_VETO";
                    const Icon = isPass ? ShieldCheck : isVeto ? ShieldAlert : Zap;

                    return (
                        <div
                            key={`${log.timestamp}-${idx}`}
                            className={clsx(
                                "card border-l-4 transition-all hover:bg-surface/80",
                                isPass ? "border-l-success" : isVeto ? "border-l-danger" : "border-l-primary"
                            )}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "p-2 rounded-full",
                                        isPass ? "bg-success/10 text-success" : isVeto ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                                    )}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <span className={clsx(
                                            "text-xs font-bold uppercase tracking-wider mb-1 block",
                                            isPass ? "text-success" : isVeto ? "text-danger" : "text-primary"
                                        )}>
                                            {log.event}
                                        </span>
                                        <h3 className="text-lg font-bold">
                                            {log.metadata.signal?.action || "SIGNAL"} @ {log.metadata.signal?.price || "N/A"}
                                        </h3>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-textMuted">{log.timestamp}</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                <div>
                                    <p className="text-textSecondary text-xs mb-1 uppercase">Symbol</p>
                                    <p className="font-medium">{log.metadata.signal?.symbol || "XAUUSD"}</p>
                                </div>
                                <div>
                                    <p className="text-textSecondary text-xs mb-1 uppercase">Lots</p>
                                    <p className="font-medium">{log.metadata.signal?.lots || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-textSecondary text-xs mb-1 uppercase">Stop Loss</p>
                                    <p className="font-medium">{log.metadata.signal?.sl || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-textSecondary text-xs mb-1 uppercase">Module</p>
                                    <p className="font-medium">{log.module}</p>
                                </div>
                            </div>

                            <blockquote className="border-t border-border pt-3 mt-3 italic text-textSecondary text-sm">
                                {log.metadata.reason || log.metadata.signal?.desc || "No additional details available."}
                            </blockquote>
                        </div>
                    );
                })}

                {filteredLogs.length === 0 && (
                    <div className="text-center py-20 bg-surface/50 border border-dashed border-border rounded-xl">
                        <Activity className="mx-auto mb-4 text-textMuted" size={48} />
                        <p className="text-textSecondary">No signals matching filter found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
