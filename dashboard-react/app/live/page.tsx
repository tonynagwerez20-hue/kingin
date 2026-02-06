"use client";

import { useEffect, useState, useRef } from "react";
import PriceTicker from "@/components/PriceTicker";
import CandlestickChart from "@/components/CandlestickChart";
import MetricsCard from "@/components/MetricsCard";
import DeltaAnalysis from "@/components/DeltaAnalysis";
import { useLatestPrice } from "@/hooks/useLatestPrice";

export default function LiveMonitorPage() {
    const [timeframe, setTimeframe] = useState<"M5" | "M15" | "H1">("M5");
    const timeframeRef = useRef(timeframe);
    const { price, prevPrice, priceChange, priceChangePct, bid, ask, volume, delta, loading } = useLatestPrice();

    useEffect(() => {
        timeframeRef.current = timeframe;
    }, [timeframe]);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase mb-1">Live Monitor</h1>
                    <p className="text-textSecondary text-xs font-mono uppercase tracking-widest">Real-time Orderflow Flux Analysis</p>
                </div>

                <div className="flex bg-surface border border-border rounded-lg p-1">
                    {(["M5", "M15", "H1"] as const).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all uppercase tracking-widest ${timeframe === tf
                                ? "bg-primary text-background"
                                : "text-textSecondary hover:text-textPrimary"
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <PriceTicker price={price} priceChange={priceChange} priceChangePct={priceChangePct} loading={loading} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricsCard
                    label="Bid"
                    value={bid?.toFixed(2) || "---"}
                    color="danger"
                />
                <MetricsCard
                    label="Ask"
                    value={ask?.toFixed(2) || "---"}
                    color="success"
                />
                <MetricsCard
                    label="Spread"
                    value={bid && ask ? ((ask - bid) * 100).toFixed(1) + " pips" : "---"}
                    color="warning"
                />
                <MetricsCard
                    label="Volume"
                    value={volume?.toLocaleString() || "---"}
                    color="primary"
                />
            </div>

            <div className="card">
                <CandlestickChart timeframe={timeframe} />
            </div>

            <div className="card">
                <DeltaAnalysis timeframe={timeframe} />
            </div>
        </div>
    );
}
