"use client";

import { useEffect, useState } from "react";
import {
    History,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Calendar,
    Search,
    Download,
    Filter,
    ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
    const [trades, setTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const res = await fetch("http://localhost:8000/trades?status=closed&limit=100");
                const data = await res.json();
                setTrades(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch trades:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, []);

    const netProfit = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const winRate = trades.length > 0
        ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100
        : 0;

    const grossProfit = trades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 99.9 : 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Master Ledger <span className="text-primary/50 text-xl font-mono">Archive</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 mt-1">
                        <History size={12} className="text-primary" />
                        Historical Performance & Trade Logs
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-accent/30 border border-border/50 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PerformanceCard
                    label="Net Profit"
                    value={`$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    trend={netProfit >= 0 ? "SURPLUS" : "DEFICIT"}
                />
                <PerformanceCard
                    label="Win Rate"
                    value={`${winRate.toFixed(1)}%`}
                    trend={`${trades.length} TRADES`}
                />
                <PerformanceCard
                    label="Profit Factor"
                    value={profitFactor.toFixed(2)}
                    trend="STRATEGY_HEALTH"
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight uppercase">Trading Journal</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Chronological Order History</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="border-white/10 text-muted-foreground font-mono">
                                TOTAL: {trades.length}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-0 relative">
                        <div className="hidden lg:grid grid-cols-6 gap-4 px-4 py-2 border-b border-border bg-accent/20 rounded-t-md text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                            <span>Timestamp</span>
                            <span>Symbol</span>
                            <span>Type</span>
                            <span>Entry/Exit</span>
                            <span>Size</span>
                            <span className="text-right">Profit/Loss</span>
                        </div>
                        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {trades.length > 0 ? trades.map((trade, i) => (
                                <JournalItem
                                    key={i}
                                    time={trade.exit_time || trade.entry_time}
                                    symbol={trade.symbol}
                                    type={trade.type || trade.action}
                                    entry={trade.entry_price?.toFixed(2) || "0.00"}
                                    exit={trade.exit_price?.toFixed(2) || "0.00"}
                                    size={trade.lots || "0.01"}
                                    pnl={(trade.pnl >= 0 ? "+" : "") + trade.pnl?.toFixed(2)}
                                    win={trade.pnl > 0}
                                />
                            )) : (
                                <div className="text-center py-20 opacity-30 italic text-[10px] uppercase">No Historical Records Found</div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function PerformanceCard({ label, value, trend }: { label: string; value: string; trend: string }) {
    return (
        <Card className="bg-card border-border">
            <CardContent className="pt-6">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</span>
                <div className="flex items-end justify-between mt-2">
                    <div className="text-3xl font-black tracking-tighter">{value}</div>
                    <div className={cn(
                        "text-[10px] font-black px-2 py-1 rounded capitalize tracking-widest",
                        trend === "SURPLUS" || trend.includes("TRADES") || trend === "STRATEGY_HEALTH" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"
                    )}>
                        {trend}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function JournalItem({ time, symbol, type, entry, exit, size, pnl, win }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 px-4 py-3 border border-border/30 rounded hover:bg-accent/10 transition-colors items-center text-[10px] font-mono">
            <span className="text-muted-foreground hidden lg:inline truncate">{time}</span>
            <span className="font-black tracking-tight uppercase text-foreground lg:font-mono">{symbol}</span>
            <span className={cn("font-black uppercase", type === "BUY" || type === "LONG" ? "text-primary" : "text-destructive")}>{type}</span>
            <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-bold text-foreground">{entry}</span>
                <ArrowRight size={10} className="mx-1" />
                <span className="font-bold text-foreground">{exit}</span>
            </div>
            <span className="font-bold">{size} Lots</span>
            <span className={cn("text-right font-black", win ? "text-primary" : "text-destructive")}>{pnl}</span>
        </div>
    );
}
