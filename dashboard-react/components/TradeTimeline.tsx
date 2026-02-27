"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Clock, DollarSign } from "lucide-react";

interface Trade {
    id: number;
    status: string;
    action: string;
    symbol: string;
    lots: number;
    entry_price: number;
    exit_price?: number;
    sl: number;
    tp?: number;
    profit_loss?: number;
    entry_time: number;
    exit_time?: number;
}

interface RealtimeTrades {
    open: Trade[];
    closed: Trade[];
    timestamp: number;
}

export default function TradeTimeline() {
    const [trades, setTrades] = useState<RealtimeTrades | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const res = await fetch("http://localhost:8000/trades/realtime");
                const data = await res.json();
                setTrades(data);
            } catch (error) {
                console.error("Failed to fetch trades:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
        const interval = setInterval(fetchTrades, 2000); // 2 second updates
        return () => clearInterval(interval);
    }, []);

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString();
    };

    const getDuration = (start: number, end?: number) => {
        const duration = (end || Date.now() / 1000) - start;
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    if (loading) {
        return (
            <div className="card">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-surface rounded w-1/3"></div>
                    <div className="h-20 bg-surface rounded"></div>
                    <div className="h-20 bg-surface rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h2 className="text-xl font-bold mb-6 text-textPrimary uppercase tracking-tight flex items-center gap-2">
                <Clock className="text-primary" size={20} />
                Trade Timeline
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Open Trades */}
                {trades?.open && trades.open.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-success uppercase mb-3">Open Positions</h3>
                        {trades.open.map((trade) => (
                            <div
                                key={trade.id}
                                className="mb-3 p-4 bg-success/10 border border-success/30 rounded-lg"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {trade.action === "LONG" ? (
                                            <TrendingUp className="text-success" size={18} />
                                        ) : (
                                            <TrendingDown className="text-danger" size={18} />
                                        )}
                                        <span className="font-bold text-sm">
                                            {trade.action} {trade.lots} lots
                                        </span>
                                    </div>
                                    <span className="text-xs text-textMuted">{formatTime(trade.entry_time)}</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="text-textSecondary">Entry</p>
                                        <p className="font-medium">{trade.entry_price.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSecondary">SL</p>
                                        <p className="font-medium">{trade.sl.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSecondary">Duration</p>
                                        <p className="font-medium">{getDuration(trade.entry_time)}</p>
                                    </div>
                                </div>

                                {trade.profit_loss !== undefined && (
                                    <div className="mt-2 pt-2 border-t border-success/20">
                                        <div className="flex items-center gap-1">
                                            <DollarSign size={14} className={trade.profit_loss >= 0 ? "text-success" : "text-danger"} />
                                            <span className={`text-sm font-bold ${trade.profit_loss >= 0 ? "text-success" : "text-danger"}`}>
                                                {trade.profit_loss >= 0 ? "+" : ""}
                                                ${trade.profit_loss.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Closed Trades */}
                {trades?.closed && trades.closed.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-textSecondary uppercase mb-3">Recent Closed</h3>
                        {trades.closed.slice(0, 5).map((trade) => (
                            <div
                                key={trade.id}
                                className={`mb-3 p-4 rounded-lg border ${(trade.profit_loss || 0) >= 0
                                        ? "bg-success/5 border-success/20"
                                        : "bg-danger/5 border-danger/20"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {trade.action === "LONG" ? (
                                            <TrendingUp className="text-textSecondary" size={18} />
                                        ) : (
                                            <TrendingDown className="text-textSecondary" size={18} />
                                        )}
                                        <span className="font-bold text-sm text-textSecondary">
                                            {trade.action} {trade.lots} lots
                                        </span>
                                    </div>
                                    <span className="text-xs text-textMuted">
                                        {trade.exit_time && formatTime(trade.exit_time)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div>
                                        <p className="text-textSecondary">Entry</p>
                                        <p className="font-medium">{trade.entry_price.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSecondary">Exit</p>
                                        <p className="font-medium">{trade.exit_price?.toFixed(2) || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSecondary">Duration</p>
                                        <p className="font-medium">
                                            {getDuration(trade.entry_time, trade.exit_time)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-textSecondary">P&L</p>
                                        <p
                                            className={`font-bold ${(trade.profit_loss || 0) >= 0 ? "text-success" : "text-danger"
                                                }`}
                                        >
                                            {(trade.profit_loss || 0) >= 0 ? "+" : ""}$
                                            {(trade.profit_loss || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(!trades?.open || trades.open.length === 0) &&
                    (!trades?.closed || trades.closed.length === 0) && (
                        <div className="text-center py-12 text-textSecondary">
                            <Clock className="mx-auto mb-3 opacity-50" size={48} />
                            <p>No trades yet</p>
                        </div>
                    )}
            </div>
        </div>
    );
}
