"use client";

import { useEffect, useState } from "react";
import StatusCard from "@/components/StatusCard";
import ConnectionStatus from "@/components/ConnectionStatus";
import MarketDataPanel from "@/components/MarketDataPanel";
import LatencyMonitor from "@/components/LatencyMonitor";
import TradeTimeline from "@/components/TradeTimeline";
import TradingMetrics from "@/components/TradingMetrics";
import SecurityAuditPanel from "@/components/SecurityAuditPanel";
import StrategyAuditFeed from "@/components/StrategyAuditFeed";
import { Settings, Activity, Shield, TrendingUp, DollarSign, Award, Bell, Server } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
    const [systemStatus, setSystemStatus] = useState<any>(null);
    const [tradeMetrics, setTradeMetrics] = useState({
        totalPnL: 0,
        winRate: 0,
        openTrades: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // System Status
                const statusRes = await fetch("http://localhost:8000/status");
                const statusData = await statusRes.json();
                setSystemStatus(statusData);

                // Trade Metrics (Parity with Streamlit dashboard.py)
                const tradesRes = await fetch("http://localhost:8000/trades?limit=1000");
                const trades = await tradesRes.json();

                const closed = trades.filter((t: any) => t.status === "closed");
                const open = trades.filter((t: any) => t.status === "open");
                const totalPnL = closed.reduce((acc: number, t: any) => acc + (t.profit_loss || 0), 0);
                const winning = closed.filter((t: any) => (t.profit_loss || 0) > 0).length;
                const winRate = closed.length > 0 ? (winning / closed.length) * 100 : 0;

                setTradeMetrics({
                    totalPnL,
                    winRate,
                    openTrades: open.length
                });

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-end border-b border-border pb-8">
                <div>
                    <h1 className="text-5xl font-black mb-2 tracking-tighter uppercase">NEXUS TERMINAL</h1>
                    <p className="text-textSecondary font-mono text-xs uppercase tracking-widest">Global Orderflow Infrastructure • v5.3</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/connections" className="p-2 bg-surface hover:bg-surface/80 rounded border border-border/50 text-textSecondary hover:text-primary transition-colors flex items-center gap-2">
                        <Server size={20} />
                        <span className="text-xs font-bold uppercase hidden md:inline">Connections</span>
                    </Link>
                    <button className="p-2 bg-surface hover:bg-surface/80 rounded border border-border/50 text-textSecondary hover:text-primary transition-colors">
                        <Bell size={20} />
                    </button>
                    <button className="p-2 bg-surface hover:bg-surface/80 rounded border border-border/50 text-textSecondary hover:text-primary transition-colors">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* 1. Real-Time Trading Metrics */}
            <TradingMetrics />

            {/* 2. Market Data & Connection Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <MarketDataPanel />
                </div>
                <div>
                    <LatencyMonitor />
                </div>
            </div>

            {/* 3. Trade Timeline & Strategy Audit */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <TradeTimeline />
                </div>
                <div>
                    <StrategyAuditFeed />
                </div>
            </div>

            {/* 4. Infrastructure Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ConnectionStatus />
                </div>
                <div>
                    <SecurityAuditPanel />
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-textSecondary">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
