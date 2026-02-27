"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Activity, Award } from "lucide-react";
import StatusCard from "./StatusCard";

interface TradingMetricsProps {
    className?: string;
}

export default function TradingMetrics({ className = "" }: TradingMetricsProps) {
    const [metrics, setMetrics] = useState({
        balance: 0,
        totalPnL: 0,
        winRate: 0,
        openTrades: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // 1. Fetch system status (for balance)
                const statusRes = await fetch("http://localhost:8000/status");
                const statusData = await statusRes.json();

                // 2. Fetch trades (for calculations)
                const tradesRes = await fetch("http://localhost:8000/trades?limit=1000");
                const tradesData = await tradesRes.json();

                const closed = tradesData.filter((t: any) => t.status === "closed");
                const open = tradesData.filter((t: any) => t.status === "open");
                const totalPnL = closed.reduce((acc: number, t: any) => acc + (t.profit_loss || 0), 0);
                const winning = closed.filter((t: any) => (t.profit_loss || 0) > 0).length;
                const winRate = closed.length > 0 ? (winning / closed.length) * 100 : 0;

                setMetrics({
                    balance: statusData.balance || 0,
                    totalPnL,
                    winRate,
                    openTrades: open.length,
                });
            } catch (error) {
                console.error("Failed to fetch trading metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card animate-pulse h-32 bg-surface/30"></div>
                ))}
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            <StatusCard
                title="Account Balance"
                value={`$${metrics.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
                status="success"
            />
            <StatusCard
                title="Total P&L"
                value={`${metrics.totalPnL >= 0 ? "+" : ""}$${metrics.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                icon={TrendingUp}
                status={metrics.totalPnL >= 0 ? "success" : "danger"}
            />
            <StatusCard
                title="Win Rate"
                value={`${metrics.winRate.toFixed(1)}%`}
                icon={Award}
                status={metrics.winRate > 50 ? "success" : "warning"}
            />
            <StatusCard
                title="Open Positions"
                value={metrics.openTrades.toString()}
                icon={Activity}
                status={metrics.openTrades > 0 ? "success" : "neutral"}
            />
        </div>
    );
}
