"use client";

import { useState } from "react";
import { Play, ShieldAlert, Activity, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export default function ControlPanel() {
    const [backtestLoading, setBacktestLoading] = useState(false);
    const [stressLoading, setStressLoading] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [stressResults, setStressResults] = useState<any>(null);

    const runBacktest = async () => {
        setBacktestLoading(true);
        setLastAction(null);
        try {
            const res = await fetch("http://localhost:8000/backtest/run", { method: "POST" });
            const data = await res.json();
            if (data.status === "SUCCESS") {
                setLastAction("Backtest started successfully.");
            } else {
                setLastAction(`Error: ${data.message}`);
            }
        } catch (error) {
            setLastAction("Failed to trigger backtest.");
        } finally {
            setBacktestLoading(false);
        }
    };

    const runStressTest = async () => {
        setStressLoading(true);
        setStressResults(null);
        try {
            const res = await fetch("http://localhost:8000/backtest/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ iterations: 1000, slippage: 1.5, initial_balance: 10000 })
            });
            const data = await res.json();
            if (data.status === "ERROR") {
                setLastAction(`Stress Test Error: ${data.message}`);
            } else {
                setStressResults(data);
                setLastAction("Stress test complete.");
            }
        } catch (error) {
            setLastAction("Failed to run stress test.");
        } finally {
            setStressLoading(false);
        }
    };

    return (
        <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                            <Activity size={16} className="text-primary" /> System Controls
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase font-bold mt-1">
                            Validation & Stress Testing
                        </CardDescription>
                    </div>
                    {lastAction && (
                        <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary animate-in fade-in slide-in-from-right-2">
                            {lastAction}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        onClick={runBacktest}
                        disabled={backtestLoading}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center gap-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                    >
                        {backtestLoading ? (
                            <Loader2 className="animate-spin text-primary" size={24} />
                        ) : (
                            <Play className="text-primary group-hover:scale-110 transition-transform" size={24} />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-tighter">Run Backtest</span>
                    </Button>

                    <Button
                        onClick={runStressTest}
                        disabled={stressLoading}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center gap-2 border-border hover:border-destructive/50 hover:bg-destructive/5 transition-all group"
                    >
                        {stressLoading ? (
                            <Loader2 className="animate-spin text-destructive" size={24} />
                        ) : (
                            <ShieldAlert className="text-destructive group-hover:scale-110 transition-transform" size={24} />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-tighter">Stress Test</span>
                    </Button>
                </div>

                {stressResults && (
                    <div className="bg-muted/20 rounded-lg p-4 border border-border space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Monte Carlo Results</span>
                            <Badge variant="teal" className="text-[9px] h-4">SIM_COMPLETE</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                            <div>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Avg Final Bal</p>
                                <p className="text-lg font-black tracking-tighter text-primary">
                                    ${stressResults.avg_final_balance?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Prob. of Ruin</p>
                                <p className={cn(
                                    "text-lg font-black tracking-tighter",
                                    stressResults.prob_of_ruin > 0.1 ? "text-destructive" : "text-primary"
                                )}>
                                    {(stressResults.prob_of_ruin * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-muted-foreground mb-1">
                                <span>Risk Outlook</span>
                                <span>{stressResults.prob_of_ruin < 0.05 ? "LOW_RISK" : "ELEVATED"}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-1000",
                                        stressResults.prob_of_ruin < 0.1 ? "bg-primary" : "bg-destructive"
                                    )}
                                    style={{ width: `${Math.max(5, 100 - (stressResults.prob_of_ruin * 100))}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {!stressResults && !stressLoading && (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 opacity-50 grayscale">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Activity size={24} className="text-muted-foreground" />
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            System Analysis Standby
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ControlPanel.tsx
