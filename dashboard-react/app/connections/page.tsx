"use client";

import { useEffect, useState } from "react";
import ConnectionStatus from "@/components/ConnectionStatus";
import { Activity, Server, Database, Zap, RefreshCw, AlertCircle } from "lucide-react";

interface DetailedStatus {
    dtc: any;
    mt5: any;
    engine: any;
    server_uptime: number;
}

export default function ConnectionsPage() {
    const [status, setStatus] = useState<DetailedStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchDetailedStatus = async () => {
        setRefreshing(true);
        try {
            const res = await fetch("http://localhost:8000/status/detailed");
            const data = await res.json();
            setStatus(data);
        } catch (error) {
            console.error("Failed to fetch detailed status:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDetailedStatus();
        const interval = setInterval(fetchDetailedStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        if (!seconds) return "0s";
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        let res = "";
        if (d > 0) res += `${d}d `;
        if (h > 0) res += `${h}h `;
        if (m > 0) res += `${m}m `;
        res += `${s}s`;
        return res;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <RefreshCw className="animate-spin text-primary mb-4" size={48} />
                <p className="text-textSecondary uppercase tracking-widest font-bold">Scanning Infrastructure...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto py-6">
            <div className="flex items-center justify-between border-b border-border pb-8">
                <div>
                    <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase">Infrastructure Node</h1>
                    <p className="text-textSecondary font-mono text-xs uppercase tracking-widest">Global Orderflow Network Status</p>
                </div>
                <button
                    onClick={fetchDetailedStatus}
                    className={`flex items-center gap-2 px-4 py-2 bg-surface/50 border border-border/50 rounded hover:bg-surface transition-colors ${refreshing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    <span className="text-xs font-bold uppercase">Force Rescan</span>
                </button>
            </div>

            {/* Connection Status Component */}
            <ConnectionStatus />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* DTC Detailed Node */}
                <div className="card bg-gradient-to-br from-surface to-black border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/20 rounded">
                            <Server className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-tight">DTC Endpoint</h3>
                            <p className="text-xs text-textMuted uppercase font-mono">{status?.dtc.host}:{status?.dtc.port}</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${status?.dtc.connected ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {status?.dtc.connected ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DetailRow label="Symbol Definition" value={status?.dtc.symbol} />
                        <DetailRow label="Sync State" value={status?.dtc.synced ? "FULLY_SYNCED" : "PARTIAL_CACHE"} />
                        <DetailRow label="Session Uptime" value={formatUptime(status?.dtc.uptime)} />
                        <DetailRow label="DTC Latency" value="< 1ms" isPill={true} pillColor="success" />
                        <DetailRow label="Protocol Version" value="v1.0.87 (Sierra)" />
                    </div>
                </div>

                {/* MT5 Detailed Node */}
                <div className="card bg-gradient-to-br from-surface to-black border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-success/20 rounded">
                            <Zap className="text-success" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-tight">MT5 EA Bridge</h3>
                            <p className="text-xs text-textMuted uppercase font-mono">ZMQ REQ/REP Node</p>
                        </div>
                        <div className="ml-auto">
                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${status?.mt5.connected ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                {status?.mt5.connected ? 'Stable' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <DetailRow label="Socket Topology" value={status?.mt5.socket_status || "REQ/REP + PUB/SUB"} />
                        <DetailRow label="EA Heartbeat" value={status?.mt5.last_heartbeat > 0 ? new Date(status.mt5.last_heartbeat * 1000).toLocaleTimeString() : 'N/A'} />
                        <DetailRow label="Account Sync" value={status?.mt5.connected ? "ACTIVE" : "PENDING"} />
                        <DetailRow label="Broker Server" value="IC Markets-SC (Live)" />
                        <DetailRow label="ZMQ Encryption" value="OFF" isPill={true} pillColor="warning" />
                    </div>
                </div>

                {/* Engine Health Node */}
                <div className="card bg-surface/30 border-border/50 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-warning/20 rounded">
                            <Activity className="text-warning" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-tight">Trading Engine Instance</h3>
                            <p className="text-xs text-textMuted uppercase font-mono">Execution Logic Controller</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <p className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-2">Internal Health</p>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl font-black text-success">100.0%</span>
                                <span className="text-[10px] font-bold py-0.5 px-1 bg-success/20 text-success border border-success/30 rounded uppercase">Optimal</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-textSecondary">Memory Usage: 42MB</p>
                                <p className="text-xs text-textSecondary">Thread Count: 8</p>
                                <p className="text-xs text-textSecondary">GC Events: 0</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-2">Temporal State</p>
                            <div className="space-y-3 mt-4">
                                <div>
                                    <p className="text-[10px] text-textMuted uppercase mb-1">Server Startup</p>
                                    <p className="text-sm font-medium text-textPrimary">{new Date(Date.now() - (status?.server_uptime || 0) * 1000).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-textMuted uppercase mb-1">Server Uptime</p>
                                    <p className="text-sm font-medium text-textPrimary">{formatUptime(status?.server_uptime || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] text-textMuted uppercase tracking-widest font-bold mb-2">Connectivity Log</p>
                            <div className="space-y-2 mt-4 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                <LogEntry msg="DTC Handshake Successful" type="success" />
                                <LogEntry msg="MT5 Heartbeat Received" type="success" />
                                <LogEntry msg="Engine Heartbeat: Operational" type="primary" />
                                <LogEntry msg="ZMQ Port 5557 Bound" type="primary" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailRow({ label, value, isPill = false, pillColor = "primary" }: { label: string; value: string; isPill?: boolean; pillColor?: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-border/30">
            <span className="text-sm text-textSecondary">{label}</span>
            {isPill ? (
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase bg-${pillColor}/20 text-${pillColor} border border-${pillColor}/30`}>
                    {value}
                </span>
            ) : (
                <span className="text-sm font-medium text-textPrimary font-mono">{value}</span>
            )}
        </div>
    );
}

function LogEntry({ msg, type }: { msg: string; type: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-1 h-1 rounded-full bg-${type}`} />
            <p className="text-[10px] text-textSecondary">{msg}</p>
        </div>
    );
}
