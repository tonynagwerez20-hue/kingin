"use client";

import { useEffect, useState } from "react";
import { Activity, Zap } from "lucide-react";

interface LatencyData {
    current_latency_ms: number;
    average_latency_ms: number;
    history: number[];
    last_ping: number;
    status: "GOOD" | "WARNING" | "CRITICAL" | "DISCONNECTED" | "ERROR";
    error?: string;
}

export default function LatencyMonitor() {
    const [latency, setLatency] = useState<LatencyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLatency = async () => {
            try {
                const res = await fetch("http://localhost:8000/mt5/latency");
                const data = await res.json();
                setLatency(data);
            } catch (error) {
                console.error("Failed to fetch latency:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLatency();
        const interval = setInterval(fetchLatency, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="card">
                <div className="animate-pulse">
                    <div className="h-6 bg-surface rounded w-1/2 mb-4"></div>
                    <div className="h-12 bg-surface rounded"></div>
                </div>
            </div>
        );
    }

    if (!latency || latency.status === "DISCONNECTED" || latency.status === "ERROR") {
        return (
            <div className="card border-danger/50">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Zap className="text-danger" size={20} />
                    EA Latency
                </h3>
                <div className="text-center py-6">
                    <p className="text-danger font-medium">MT5 EA Not Responding</p>
                    <p className="text-xs text-textMuted mt-2">{latency?.error || "Connection unavailable"}</p>
                </div>
            </div>
        );
    }

    const getStatusColor = () => {
        switch (latency.status) {
            case "GOOD":
                return "text-success";
            case "WARNING":
                return "text-warning";
            case "CRITICAL":
                return "text-danger";
            default:
                return "text-textSecondary";
        }
    };

    const getStatusBg = () => {
        switch (latency.status) {
            case "GOOD":
                return "bg-success/10 border-success/30";
            case "WARNING":
                return "bg-warning/10 border-warning/30";
            case "CRITICAL":
                return "bg-danger/10 border-danger/30";
            default:
                return "bg-surface/30 border-border/50";
        }
    };

    return (
        <div className={`card border ${getStatusBg()}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap className={getStatusColor()} size={20} />
                EA Connection Latency
            </h3>

            <div className="space-y-4">
                {/* Current Latency */}
                <div>
                    <p className="text-xs text-textSecondary uppercase mb-1">Current</p>
                    <div className={`text-3xl font-black ${getStatusColor()}`}>
                        {latency.current_latency_ms.toFixed(1)}
                        <span className="text-lg ml-1">ms</span>
                    </div>
                </div>

                {/* Average Latency */}
                <div>
                    <p className="text-xs text-textSecondary uppercase mb-1">Average (Last 10)</p>
                    <div className="text-xl font-bold text-textPrimary">
                        {latency.average_latency_ms.toFixed(1)}
                        <span className="text-sm ml-1">ms</span>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="pt-2 border-t border-border">
                    <span
                        className={`text-xs font-bold uppercase px-3 py-1.5 rounded ${latency.status === "GOOD"
                            ? "bg-success/20 text-success"
                            : latency.status === "WARNING"
                                ? "bg-warning/20 text-warning"
                                : "bg-danger/20 text-danger"
                            }`}
                    >
                        {latency.status}
                    </span>
                </div>

                {/* Mini Sparkline */}
                {latency.history.length > 0 && (
                    <div className="pt-2">
                        <p className="text-xs text-textSecondary uppercase mb-2">History</p>
                        <div className="flex items-end gap-1 h-12">
                            {latency.history.map((value, idx) => {
                                const height = Math.min((value / 100) * 100, 100);
                                const color =
                                    value < 50
                                        ? "bg-success"
                                        : value < 100
                                            ? "bg-warning"
                                            : "bg-danger";
                                return (
                                    <div
                                        key={idx}
                                        className={`flex-1 ${color} rounded-t transition-all`}
                                        style={{ height: `${height}%` }}
                                        title={`${value.toFixed(1)}ms`}
                                    ></div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
