"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi } from "lightweight-charts";

interface CandlestickChartProps {
    timeframe: "M5" | "M15" | "H1";
}

export default function CandlestickChart({ timeframe }: CandlestickChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "#1e2139" },
                horzLines: { color: "#1e2139" },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: "#10b981",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // Fetch initial data
        const fetchData = async () => {
            try {
                const res = await fetch(`http://localhost:8000/ohlc?tf=${timeframe}&limit=100`);
                const data = await res.json();

                if (data.candles && data.candles.length > 0) {
                    const formattedData = data.candles.map((candle: any) => ({
                        time: candle.time,
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                    }));

                    candlestickSeries.setData(formattedData);
                    chart.timeScale().fitContent();
                }
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Update chart periodically
        const interval = setInterval(fetchData, 5000);

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            clearInterval(interval);
            chart.remove();
        };
    }, [timeframe]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[500px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">{timeframe} Candlestick Chart</h3>
            <div ref={chartContainerRef} />
        </div>
    );
}
