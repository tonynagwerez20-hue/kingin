"use client";

import { useEffect, useState } from "react";
import { History, TrendingUp, TrendingDown, DollarSign, Calendar, Filter } from "lucide-react";
import clsx from "clsx";

interface Trade {
    id: number;
    symbol: string;
    entry_price: number;
    exit_price: number | null;
    lot_size: number;
    profit_loss: number | null;
    status: string;
    entry_time: string;
    exit_time: string | null;
}

export default function HistoryPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const res = await fetch("http://localhost:8000/trades?limit=50");
                const data = await res.json();
                setTrades(data);
            } catch (error) {
                console.error("Failed to fetch trades:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
        const interval = setInterval(fetchTrades, 10000); // 10s refresh for history
        return () => clearInterval(interval);
    }, []);

    const closedTrades = trades.filter(t => t.status === "closed");
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.profit_loss || 0), 0);
    const winRate = closedTrades.length > 0
        ? (closedTrades.filter(t => (t.profit_loss || 0) > 0).length / closedTrades.length) * 100
        : 0;

    const MetricCard = ({ title, value, icon: Icon, colorClass }: any) => (
        <div className="card bg-surface/40 hover:bg-surface/60 transition-colors">
            <div className="flex items-center justify-between mb-2 text-textMuted">
                <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
                <Icon size={16} />
            </div>
            <div className={clsx("text-2xl font-bold tracking-tighter", colorClass)}>
                {value}
            </div>
        </div>
    );

    return (
        <div className="space-y-10 max-w-6xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold mb-2 text-textPrimary uppercase tracking-tighter">Trade History</h1>
                    <p className="text-textSecondary">Verified records from institutional ledger</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-textMuted bg-surface/50 border border-border px-3 py-1.5 rounded-full">
                    <Calendar size={14} />
                    {new Date().toLocaleDateString()}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Realized PnL"
                    value={`$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    icon={DollarSign}
                    colorClass={totalPnL >= 0 ? "text-success" : "text-danger"}
                />
                <MetricCard
                    title="Win Rate"
                    value={`${winRate.toFixed(1)}%`}
                    icon={TrendingUp}
                    colorClass="text-primary"
                />
                <MetricCard
                    title="Closed Positions"
                    value={closedTrades.length}
                    icon={History}
                    colorClass="text-textPrimary"
                />
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-textPrimary uppercase tracking-tight">Recent Ledger Entries</h3>
                    <div className="flex rounded-md overflow-hidden bg-surface border border-border">
                        {["ALL", "OPEN", "CLOSED"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={clsx(
                                    "px-3 py-1.5 text-[10px] font-bold tracking-widest transition-all",
                                    filter === f ? "bg-primary text-background" : "text-textSecondary hover:text-textPrimary"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-surface/20">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 border-b border-border text-[10px] uppercase font-bold tracking-widest text-textMuted">
                                <th className="px-6 py-4">Symbol</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Lots</th>
                                <th className="px-6 py-4">Entry Price</th>
                                <th className="px-6 py-4">Exit Price</th>
                                <th className="px-6 py-4 text-right">PnL</th>
                                <th className="px-6 py-4 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs">
                            {trades.filter(t => filter === "ALL" || t.status.toUpperCase() === filter).map((trade) => (
                                <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 font-bold text-textPrimary">{trade.symbol}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded text-[10px] font-bold tracking-tighter",
                                            trade.status === "open" ? "bg-primary/20 text-primary" : "bg-textMuted/20 text-textMuted"
                                        )}>
                                            {trade.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-textSecondary">{trade.lot_size.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-mono text-textSecondary">{trade.entry_price.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-mono text-textSecondary">{trade.exit_price?.toFixed(2) || "—"}</td>
                                    <td className={clsx(
                                        "px-6 py-4 text-right font-mono font-bold",
                                        (trade.profit_loss || 0) > 0 ? "text-success" : (trade.profit_loss || 0) < 0 ? "text-danger" : "text-textMuted"
                                    )}>
                                        {(trade.profit_loss || 0) > 0 ? "+" : ""}{(trade.profit_loss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-textMuted group-hover:text-textSecondary transition-colors">
                                        {trade.exit_time || trade.entry_time}
                                    </td>
                                </tr>
                            ))}
                            {trades.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-textMuted uppercase tracking-widest text-[10px] italic">
                                        No entries found in master ledger
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
