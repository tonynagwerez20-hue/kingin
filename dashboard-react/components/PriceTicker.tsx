"use client";

import { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceTickerProps {
    price: number;
    priceChange: number;
    priceChangePct: number;
    loading?: boolean;
}

export default function PriceTicker({ price, priceChange, priceChangePct, loading }: PriceTickerProps) {
    const [flashClass, setFlashClass] = useState("");
    const prevPriceRef = useRef(price);

    useEffect(() => {
        if (price !== prevPriceRef.current && price > 0) {
            const direction = price > prevPriceRef.current ? "up" : "down";
            setFlashClass(direction === "up" ? "price-up" : "price-down");
            setTimeout(() => setFlashClass(""), 500);
            prevPriceRef.current = price;
        }
    }, [price]);

    if (loading) {
        return (
            <div className="card flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const isUp = priceChange >= 0;

    return (
        <div className={`card ${flashClass} border-l-4 ${isUp ? "border-l-success" : "border-l-danger"} py-8`}>
            <div className="flex items-center justify-between px-4">
                <div className="space-y-1">
                    <p className="text-xs font-mono text-textMuted uppercase tracking-widest">XAUUSD Live Terminal</p>
                    <h2 className="text-6xl font-black tracking-tighter tabular-nums">
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                </div>

                <div className={`flex items-center gap-4 ${isUp ? "text-success" : "text-danger"}`}>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 font-black text-3xl tracking-tighter tabular-nums">
                            {isUp ? <TrendingUp size={28} strokeWidth={3} /> : <TrendingDown size={28} strokeWidth={3} />}
                            {isUp ? "+" : ""}{priceChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm font-mono font-bold">
                            {isUp ? "+" : ""}{priceChangePct.toFixed(3)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
