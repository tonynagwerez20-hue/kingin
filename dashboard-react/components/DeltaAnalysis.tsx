"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface DeltaAnalysisProps {
    timeframe: "M5" | "M15" | "H1";
}

export default function DeltaAnalysis({ timeframe }: DeltaAnalysisProps) {
    const [deltaState, setDeltaState] = useState<{
        delta: number[];
        cumulative: number[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDelta = async () => {
            try {
                // Limit 5 as per Streamlit logic
                const res = await fetch(`http://localhost:8000/delta?tf=${timeframe}&limit=5`);
                const data = await res.json();
                setDeltaState(data);
            } catch (error) {
                console.error("Failed to fetch delta data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDelta();
        const interval = setInterval(fetchDelta, 2000); // 2s refresh as per Streamlit slider defaults

        return () => clearInterval(interval);
    }, [timeframe]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const hasData = deltaState && deltaState.delta && deltaState.delta.length > 0;

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-textPrimary uppercase tracking-tighter flex items-center gap-2">
                <div className="w-1 h-6 bg-primary"></div>
                Orderflow Flux Analysis
            </h3>

            {hasData ? (
                <div className="overflow-hidden rounded-lg border border-border bg-black/40">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface/50 border-b border-border text-[10px] uppercase font-black tracking-widest text-textMuted">
                                <th className="px-4 py-3">Bar Index</th>
                                <th className="px-4 py-3">Delta (Raw)</th>
                                <th className="px-4 py-3 text-right">Cumulative</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-mono text-sm">
                            {deltaState.delta.map((val, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 text-textMuted font-bold">{idx}</td>
                                    <td className={clsx(
                                        "px-4 py-3 font-black",
                                        val >= 0 ? "text-success" : "text-danger"
                                    )}>
                                        {val >= 0 ? "+" : ""}{val.toLocaleString()}
                                    </td>
                                    <td className={clsx(
                                        "px-4 py-3 text-right font-black",
                                        deltaState.cumulative[idx] >= 0 ? "text-success" : "text-danger"
                                    )}>
                                        {deltaState.cumulative[idx] >= 0 ? "+" : ""}{deltaState.cumulative[idx].toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-10 text-center bg-surface/20 border border-dashed border-border rounded-lg">
                    <p className="text-xs font-mono text-textMuted uppercase tracking-widest italic animate-pulse">
                        Synchronizing orderflow stream for {timeframe}...
                    </p>
                </div>
            )}
        </div>
    );
}
