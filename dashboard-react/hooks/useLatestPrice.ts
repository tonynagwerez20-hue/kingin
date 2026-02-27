"use client";

import { useEffect, useState } from "react";

interface LatestPrice {
    price: number;
    bid: number;
    ask: number;
    volume: number;
    delta: number;
    timestamp: number;
}

export function useLatestPrice() {
    const [data, setData] = useState<LatestPrice | null>(null);
    const [prevPrice, setPrevPrice] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const res = await fetch("http://localhost:8000/latest-tick");
                if (res.ok) {
                    const json = await res.json();
                    setData((prev) => {
                        if (prev && prev.price !== json.price) {
                            setPrevPrice(prev.price);
                        }
                        return json;
                    });
                }
            } catch (error) {
                console.error("Failed to fetch latest price:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
        const interval = setInterval(fetchPrice, 200); // 200ms = 5 updates/sec

        return () => clearInterval(interval);
    }, []);

    const currentPrice = data?.price || 0;
    const priceChange = prevPrice !== 0 ? currentPrice - prevPrice : 0;
    const priceChangePct = prevPrice !== 0 ? (priceChange / prevPrice) * 100 : 0;

    return {
        price: currentPrice,
        prevPrice,
        priceChange,
        priceChangePct,
        bid: data?.bid || 0,
        ask: data?.ask || 0,
        volume: data?.volume || 0,
        delta: data?.delta || 0,
        loading,
    };
}
