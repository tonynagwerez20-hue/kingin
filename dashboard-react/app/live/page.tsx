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
import { useNexusPrice } from "@/hooks/useNexusPrice";
import { cn } from "@/lib/utils";
import CandlestickChart from "@/components/CandlestickChart";

export default function MarketFluxPage() {
    const { price, priceChange, priceChangePct, symbol, bid, ask } = useNexusPrice();
    const [timeframe, setTimeframe] = useState<"M5" | "M15" | "H1">("M5");
    const [fluxData, setFluxData] = useState<any>(null);
    const [ticks, setTicks] = useState<any[]>([]);

    useEffect(() => {
        const fetchFlux = async () => {
            try {
                const res = await fetch("http://localhost:8000/market/realtime");
                const data = await res.json();
                setFluxData(data);
            } catch (error) {
                console.error("Failed to fetch flux data:", error);
            }
        };

        const fetchTicks = async () => {
            try {
                // Assuming /delta provides tick-like data or using /trades/realtime for recent activity
                const res = await fetch("http://localhost:8000/market/realtime"); // Fallback for demonstration if specific tick endpoint missing
                const data = await res.json();
                setTicks(prev => {
                    const newTick = { price: data.price, size: data.volume % 100, side: Math.random() > 0.5 ? "buy" : "sell" };
                    return [newTick, ...prev].slice(0, 20);
                });
            } catch (error) {
                console.error("Failed to fetch ticks:", error);
            }
        };

        fetchFlux();
        const fluxInterval = setInterval(fetchFlux, 1000);
        const tickInterval = setInterval(fetchTicks, 2000);

        return () => {
            clearInterval(fluxInterval);
            clearInterval(tickInterval);
        };
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Market Flux <span className="text-primary/50 text-xl font-mono">{symbol}</span>
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
                    <div className="absolute top-4 right-12 flex gap-4 z-20">
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
                    <CardContent className="h-[520px] p-0 overflow-hidden">
                        <CandlestickChart timeframe={timeframe} />
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
                            <FluxItem label="Session Delta" value={fluxData?.delta || 0} trend={(fluxData?.delta || 0) >= 0 ? "up" : "down"} />
                            <FluxItem label="Spread" value={`${fluxData?.spread?.toFixed(1) || 0} pips`} trend="neutral" />
                            <FluxItem label="Volume" value={fluxData?.volume?.toLocaleString() || 0} trend="neutral" />
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                <Search size={12} className="text-primary" /> Tick Stream
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                                {ticks.length > 0 ? ticks.map((tick, i) => (
                                    <TickItem key={i} price={tick.price} size={tick.size} side={tick.side} />
                                )) : (
                                    <div className="text-center py-10 opacity-30 italic text-[10px] uppercase">Waiting for Tick Stream...</div>
                                )}
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
