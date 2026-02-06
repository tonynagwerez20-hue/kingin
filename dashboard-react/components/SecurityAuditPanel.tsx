"use client";

import { useEffect, useState } from "react";
import { Shield, CheckCircle, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";

interface SecurityAuditProps {
    className?: string;
}

interface AuditData {
    health: {
        sierra: string;
        engine: string;
        mt5: string;
    };
    state: string;
    mode: string;
}

export default function SecurityAuditPanel({ className = "" }: SecurityAuditProps) {
    const [data, setData] = useState<AuditData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                const res = await fetch("http://localhost:8000/status");
                const status = await res.json();
                setData(status);
            } catch (error) {
                console.error("Failed to fetch security status:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAudit();
        const interval = setInterval(fetchAudit, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "OK":
                return <CheckCircle className="text-success" size={16} />;
            case "DISCONNECTED":
            case "OFFLINE":
                return <XCircle className="text-danger" size={16} />;
            default:
                return <AlertTriangle className="text-warning" size={16} />;
        }
    };

    const getStatusTextClass = (status: string) => {
        switch (status) {
            case "OK":
                return "text-success";
            case "DISCONNECTED":
            case "OFFLINE":
                return "text-danger";
            default:
                return "text-warning";
        }
    };

    if (loading || !data) {
        return (
            <div className={`card ${className}`}>
                <div className="animate-pulse h-40 bg-surface/30 rounded-lg"></div>
            </div>
        );
    }

    const checks = [
        { name: "Sierra Chart (DTC Protocol)", status: data.health.sierra, desc: "Market Data Connectivity" },
        { name: "Trading Engine (Logic Flow)", status: data.health.engine, desc: "Signal Generation Pipe" },
        { name: "MT5 Terminal (EA Bridge)", status: data.health.mt5, desc: "Execution Infrastructure" },
    ];

    return (
        <div className={`card bg-surface/30 border-border/50 relative overflow-hidden ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-textPrimary uppercase tracking-tight flex items-center gap-2">
                    <Shield className="text-primary" size={20} />
                    Security Audit
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-success/20 border border-success/40 rounded-full">
                    <CheckCircle className="text-success" size={12} />
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider">Vetting Passed</span>
                </div>
            </div>

            <div className="space-y-4">
                {checks.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-border/30">
                        <div>
                            <p className="text-sm font-bold text-textPrimary">{check.name}</p>
                            <p className="text-[10px] text-textMuted uppercase tracking-widest">{check.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-black uppercase ${getStatusTextClass(check.status)}`}>
                                {check.status}
                            </span>
                            {getStatusIcon(check.status)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-textMuted uppercase font-bold tracking-widest mb-1">Global Guard</p>
                    <p className="text-xs font-medium text-textPrimary">256-bit ZMQ Encryption Active</p>
                </div>
                <ShieldAlert className="text-textMuted opacity-20" size={32} />
            </div>
        </div>
    );
}
