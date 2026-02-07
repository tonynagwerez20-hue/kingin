"use client";

import { useState, useEffect } from "react";

export function useNexusPrice() {
    const [price, setPrice] = useState(2650.00);
    const [prevPrice, setPrevPrice] = useState(2650.00);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate real-time price movement for XAU/USD
        const interval = setInterval(() => {
            setPrice((prev) => {
                setPrevPrice(prev);
                const change = (Math.random() - 0.5) * 0.15;
                return Number((prev + change).toFixed(2));
            });
            setLoading(false);
        }, 200);

        return () => clearInterval(interval);
    }, []);

    const priceChange = price - prevPrice;
    const priceChangePct = (priceChange / prevPrice) * 100;

    return {
        price,
        prevPrice,
        priceChange,
        priceChangePct,
        loading,
        symbol: "XAU/USD",
        bid: (price - 0.15).toFixed(2),
        ask: (price + 0.15).toFixed(2),
    };
}
