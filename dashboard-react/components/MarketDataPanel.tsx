"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Zap } from "lucide-react";

interface MarketData {
    price: number;
    bid: number;
    ask: number;
    spread: number;
    volume: number;
    timestamp: number;
    symbol: string;
}

export default function MarketDataPanel() {
    const [data, setData] = useState<MarketData | null>(null);
    const [prevPrice, setPrevPrice] = useState(0);
    const [priceChange, setPriceChange] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("http://localhost:8000/market/realtime");
                const marketData = await res.json();

                if (data) {
                    setPrevPrice(data.price);
                    setPriceChange(marketData.price - data.price);
                }

                setData(marketData);
            } catch (error) {
                console.error("Failed to fetch market data:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 1000); // 1 second updates
        return () => clearInterval(interval);
    }, [data]);

    if (!data) {
        return (
            <div className="card">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-surface rounded w-1/2"></div>
                    <div className="h-16 bg-surface rounded"></div>
                </div>
            </div>
        );
    }

    const priceColor = priceChange > 0 ? "text-success" : priceChange < 0 ? "text-danger" : "text-textPrimary";

    return (
        <div className="card bg-gradient-to-br from-surface to-black border-border/50">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-textPrimary">
                        {data.symbol}
                    </h2>
                    <p className="text-xs text-textSecondary uppercase tracking-widest">Live Market Data</p>
                </div>
                <TrendingUp className="text-primary" size={24} />
            </div>

            {/* Main Price Display */}
            <div className="mb-6">
                <div className={`text-5xl font-black ${priceColor} transition-colors duration-300`}>
                    ${data.price.toFixed(2)}
                </div>
                {priceChange !== 0 && (
                    <div className={`text-sm font-medium mt-1 ${priceColor}`}>
                        {priceChange > 0 ? "+" : ""}
                        {priceChange.toFixed(2)} ({((priceChange / prevPrice) * 100).toFixed(2)}%)
                    </div>
                )}
            </div>

            {/* Bid/Ask/Spread Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
                    <p className="text-xs text-danger uppercase font-bold mb-1">Bid</p>
                    <p className="text-lg font-bold text-danger">{data.bid.toFixed(2)}</p>
                </div>

                <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                    <p className="text-xs text-success uppercase font-bold mb-1">Ask</p>
                    <p className="text-lg font-bold text-success">{data.ask.toFixed(2)}</p>
                </div>

                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <p className="text-xs text-warning uppercase font-bold mb-1">Spread</p>
                    <p className="text-lg font-bold text-warning">{data.spread.toFixed(1)} pips</p>
                </div>
            </div>

            {/* Volume */}
            <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="text-primary" size={16} />
                        <span className="text-xs text-primary uppercase font-bold">Volume</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{data.volume.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
