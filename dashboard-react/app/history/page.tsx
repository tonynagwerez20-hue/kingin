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
                    <button className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all">
                        <Search size={18} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PerformanceCard label="Net Profit" value="$12,450.22" trend="+12%" />
                <PerformanceCard label="Win Rate" value="64.8%" trend="+2.1%" />
                <PerformanceCard label="Profit Factor" value="1.82" trend="+0.15" />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight uppercase">Trading Journal</CardTitle>
                            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Chronological Order History</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="border-white/10 text-muted-foreground font-mono">TOTAL: 1,422</Badge>
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
                        <div className="space-y-1">
                            <JournalItem
                                time="2026-02-07 20:12:44"
                                symbol="XAU/USD"
                                type="BUY"
                                entry="2645.10"
                                exit="2650.40"
                                size="0.50"
                                pnl="+265.00"
                                win={true}
                            />
                            <JournalItem
                                time="2026-02-07 19:44:12"
                                symbol="XAU/USD"
                                type="SELL"
                                entry="2652.80"
                                exit="2654.10"
                                size="0.25"
                                pnl="-32.50"
                                win={false}
                            />
                            <JournalItem
                                time="2026-02-07 18:05:01"
                                symbol="XAU/USD"
                                type="BUY"
                                entry="2642.00"
                                exit="2648.50"
                                size="0.10"
                                pnl="+65.00"
                                win={true}
                            />
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
                    <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded">
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
            <span className="text-muted-foreground hidden lg:inline">{time}</span>
            <span className="font-black tracking-tight uppercase text-foreground lg:font-mono">{symbol}</span>
            <span className={cn("font-black uppercase", type === "BUY" ? "text-primary" : "text-destructive")}>{type}</span>
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
