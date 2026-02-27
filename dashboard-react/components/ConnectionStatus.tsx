"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff, Clock } from "lucide-react";

interface ConnectionStatusProps {
    className?: string;
}

interface DetailedStatus {
    dtc: {
        connected: boolean;
        synced: boolean;
        uptime: number;
        last_heartbeat: number;
        host: string;
        port: number;
        symbol: string;
    };
    mt5: {
        connected: boolean;
        last_heartbeat: number;
        uptime: number;
        socket_status: string;
    };
    engine: {
        status: string;
        uptime: number;
        last_signal_time: number;
    };
    server_uptime: number;
}

export default function ConnectionStatus({ className = "" }: ConnectionStatusProps) {
    const [status, setStatus] = useState<DetailedStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch("http://localhost:8000/status/detailed");
                const data = await res.json();
                setStatus(data);
            } catch (error) {
                console.error("Failed to fetch detailed status:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const getTimeSince = (timestamp: number) => {
        if (!timestamp) return "Never";
        const seconds = Math.floor(Date.now() / 1000 - timestamp);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    if (loading || !status) {
        return (
            <div className={`card ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-surface rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-surface rounded"></div>
                        <div className="h-4 bg-surface rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`card ${className}`}>
            <h2 className="text-xl font-bold mb-6 text-textPrimary uppercase tracking-tight flex items-center gap-2">
                <Activity className="text-primary" size={20} />
                Connection Status
            </h2>

            <div className="space-y-4">
                {/* DTC Feed */}
                <div className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                        {status.dtc.connected ? (
                            <Wifi className="text-success" size={20} />
                        ) : (
                            <WifiOff className="text-danger" size={20} />
                        )}
                        <div>
                            <p className="font-medium text-sm">DTC Feed</p>
                            <p className="text-xs text-textSecondary">
                                {status.dtc.host}:{status.dtc.port} • {status.dtc.symbol}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span
                            className={`text-xs font-bold uppercase px-2 py-1 rounded ${status.dtc.connected && status.dtc.synced
                                    ? "bg-success/20 text-success"
                                    : status.dtc.connected
                                        ? "bg-warning/20 text-warning"
                                        : "bg-danger/20 text-danger"
                                }`}
                        >
                            {status.dtc.connected && status.dtc.synced
                                ? "SYNCED"
                                : status.dtc.connected
                                    ? "CONNECTING"
                                    : "OFFLINE"}
                        </span>
                        {status.dtc.connected && (
                            <p className="text-xs text-textMuted mt-1 flex items-center gap-1 justify-end">
                                <Clock size={12} />
                                {formatUptime(status.dtc.uptime)}
                            </p>
                        )}
                    </div>
                </div>

                {/* MT5 Bridge */}
                <div className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                        {status.mt5.connected ? (
                            <Wifi className="text-success" size={20} />
                        ) : (
                            <WifiOff className="text-danger" size={20} />
                        )}
                        <div>
                            <p className="font-medium text-sm">MT5 Bridge</p>
                            <p className="text-xs text-textSecondary">
                                Socket: {status.mt5.socket_status}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span
                            className={`text-xs font-bold uppercase px-2 py-1 rounded ${status.mt5.connected
                                    ? "bg-success/20 text-success"
                                    : "bg-danger/20 text-danger"
                                }`}
                        >
                            {status.mt5.connected ? "ACTIVE" : "OFFLINE"}
                        </span>
                        <p className="text-xs text-textMuted mt-1">
                            {getTimeSince(status.mt5.last_heartbeat)}
                        </p>
                    </div>
                </div>

                {/* Trading Engine */}
                <div className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                        <Activity className="text-primary" size={20} />
                        <div>
                            <p className="font-medium text-sm">Trading Engine</p>
                            <p className="text-xs text-textSecondary">
                                Uptime: {formatUptime(status.engine.uptime)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-success/20 text-success">
                            {status.engine.status}
                        </span>
                        {status.engine.last_signal_time > 0 && (
                            <p className="text-xs text-textMuted mt-1">
                                Last signal: {getTimeSince(status.engine.last_signal_time)}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
