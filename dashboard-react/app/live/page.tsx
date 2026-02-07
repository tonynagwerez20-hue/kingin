"use client";

import { useEffect, useState, useRef } from "react";
import {
    Activity,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Zap,
    Layers,
    Search,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNexusPrice } from "@/hooks/useNexusPrice";
import { cn } from "@/lib/utils";

export default function MarketFluxPage() {
    const { price, priceChange, priceChangePct, symbol, bid, ask } = useNexusPrice();
    const [timeframe, setTimeframe] = useState<"M5" | "M15" | "H1">("M5");
    const [delta, setDelta] = useState(1420);
    const [cumDelta, setCumDelta] = useState(8450);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Market Flux <span className="text-primary/50 text-xl font-mono">XAU/USD</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 mt-1">
                        <Activity size={12} className="text-primary animate-pulse" />
                        High-Density Orderflow Stream
                    </p>
                </div>
                <div className="flex bg-accent/30 p-1 rounded-md border border-border/50">
                    {["M5", "M15", "H1"].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf as any)}
                            className={cn(
                                "px-3 py-1 text-[10px] font-black uppercase transition-all",
                                timeframe === tf ? "bg-primary text-primary-foreground rounded shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-3 bg-card border-border relative overflow-hidden">
                    <div className="absolute top-4 right-4 flex gap-4 z-20">
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-muted-foreground block">Bid</span>
                            <span className="text-sm font-mono font-bold tabular-nums text-foreground">{bid}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-muted-foreground block">Ask</span>
                            <span className="text-sm font-mono font-bold tabular-nums text-foreground">{ask}</span>
                        </div>
                    </div>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Layers size={14} className="text-primary" /> Visual Depth Node
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[450px] flex items-center justify-center relative">
                        <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-[size:32px_32px]" />
                        <div className="flex flex-col items-center opacity-40 select-none">
                            <BarChart3 size={80} className="text-muted-foreground mb-4" />
                            <p className="font-mono text-[10px] uppercase tracking-[0.4em] font-black">Waiting for Frame Stream</p>
                        </div>

                        {/* Simulated Candle Stream Overlay */}
                        <div className="absolute bottom-10 left-10 right-10 top-20 flex items-end gap-1 px-4 pointer-events-none opacity-20">
                            {hasMounted && Array.from({ length: 40 }).map((_, i) => (
                                <div key={i} className="flex-1 bg-primary/20 border-t border-primary/50" style={{ height: `${20 + Math.random() * 60}%` }} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                <Zap size={12} className="text-primary" /> Orderflow Flux
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FluxItem label="Session Delta" value={delta} trend="up" />
                            <FluxItem label="Cumulative" value={cumDelta} trend="up" />
                            <FluxItem label="Imbalance R." value="1.42" trend="neutral" />
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                <Search size={12} className="text-primary" /> Tick Stream
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                                <TickItem price={price} size={12} side="buy" />
                                <TickItem price={price - 0.05} size={45} side="buy" />
                                <TickItem price={price + 0.02} size={8} side="sell" />
                                <TickItem price={price - 0.01} size={112} side="buy" />
                                <TickItem price={price} size={15} side="sell" />
                                <TickItem price={price + 0.10} size={5} side="sell" />
                                <TickItem price={price - 0.08} size={22} side="buy" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function FluxItem({ label, value, trend }: { label: string; value: string | number; trend: "up" | "down" | "neutral" }) {
    return (
        <div className="flex justify-between items-end border-b border-border/50 pb-2 last:border-0 last:pb-0">
            <div>
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
                <div className="text-xl font-black tabular-nums tracking-tighter leading-none mt-1">{value.toLocaleString()}</div>
            </div>
            <div className={cn(
                "text-[10px] font-bold p-1 rounded-sm",
                trend === "up" ? "text-primary bg-primary/10" : trend === "down" ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted/20"
            )}>
                {trend === "up" ? <TrendingUp size={10} /> : trend === "down" ? <TrendingDown size={10} /> : <Activity size={10} />}
            </div>
        </div>
    );
}

function TickItem({ price, size, side }: { price: number; size: number; side: "buy" | "sell" }) {
    return (
        <div className="flex items-center justify-between text-[10px] py-1 border-b border-border/20 last:border-0 font-mono">
            <span className={cn("font-bold", side === "buy" ? "text-primary" : "text-destructive")}>{price.toFixed(2)}</span>
            <span className="text-muted-foreground">{size}</span>
            <div className={cn(
                "w-12 h-1 rounded-full relative overflow-hidden bg-accent/50",
            )}>
                <div className={cn(
                    "absolute inset-y-0 left-0",
                    side === "buy" ? "bg-primary" : "bg-destructive"
                )} style={{ width: `${Math.min(size, 100)}%` }} />
            </div>
        </div>
    );
}
