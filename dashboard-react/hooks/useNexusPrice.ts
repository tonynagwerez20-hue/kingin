"use client";

import { useState, useEffect } from "react";

export function useNexusPrice() {
    const [data, setData] = useState<{
        price: number;
        bid: number;
        ask: number;
        symbol: string;
        prevPrice: number;
    }>({
        price: 2650.00,
        bid: 2649.85,
        ask: 2650.15,
        symbol: "XAU/USD",
        prevPrice: 2650.00,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch("http://localhost:8000/market/realtime");
                const marketData = await res.json();

                setData((prev) => ({
                    ...marketData,
                    prevPrice: prev.price
                }));
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch price:", error);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 1000);

        return () => clearInterval(interval);
    }, []);

    const priceChange = data.price - data.prevPrice;
    const priceChangePct = data.prevPrice !== 0 ? (priceChange / data.prevPrice) * 100 : 0;

    return {
        price: data.price,
        prevPrice: data.prevPrice,
        priceChange,
        priceChangePct,
        loading,
        symbol: data.symbol,
        bid: data.bid.toFixed(2),
        ask: data.ask.toFixed(2),
    };
}
