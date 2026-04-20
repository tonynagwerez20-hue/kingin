"use client";

import { useState, useEffect } from "react";
import {
    Play,
    ShieldAlert,
    TrendingUp,
    BarChart3,
    Zap,
    History,
    Settings2,
    CheckCircle2,
    AlertTriangle
} from "lucide-react";
import MetricsCard from "@/components/MetricsCard";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

export default function ReplayPage() {
    const [loading, setLoading] = useState(false);
    const [signals, setSignals] = useState<any[]>([]);
    const [results, setResults] = useState<any>(null);
    const [iterations, setIterations] = useState(1000);
    const [slippage, setSlippage] = useState(1.5);
    const [initialBalance, setInitialBalance] = useState(10000);

    useEffect(() => {
        fetchSignals();
    }, []);

    const fetchSignals = async () => {
        try {
            const res = await fetch("http://localhost:8000/backtest/signals");
            const data = await res.json();
            if (Array.isArray(data)) {
                setSignals(data);
            }
        } catch (error) {
            console.error("Failed to fetch signals:", error);
        }
    };

    const runSimulation = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8000/backtest/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    iterations,
                    slippage,
                    initial_balance: initialBalance
                })
            });
            const data = await res.json();
            setResults(data);
        } catch (error) {
            console.error("Simulation failed:", error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare chart data from sample simulations
    const chartData = results?.simulations?.[0]?.equity_curve.map((val: number, idx: number) => ({
        trade: idx,
        equity: val
    })) || [];

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase mb-1">Stress Test Site</h1>
                    <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">Monte Carlo Statistical Validation Pipeline</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-md flex items-center gap-3">
                    <History className="text-primary" size={20} />
                    <span className="text-sm font-bold">{signals.length} Recorded Signals</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Settings2 size={18} className="text-primary" />
                            <h2 className="font-bold uppercase tracking-tight text-sm">Simulation Params</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Iterations</label>
                                <input
                                    type="number"
                                    value={iterations}
                                    onChange={(e) => setIterations(parseInt(e.target.value))}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Slippage (Pips)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={slippage}
                                    onChange={(e) => setSlippage(parseFloat(e.target.value))}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Initial Balance ($)</label>
                                <input
                                    type="number"
                                    value={initialBalance}
                                    onChange={(e) => setInitialBalance(parseFloat(e.target.value))}
                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>

                            <button
                                onClick={runSimulation}
                                disabled={loading || signals.length === 0}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-black uppercase tracking-tighter py-3 rounded-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {loading ? "Simulating..." : <><Play size={18} fill="currentColor" /> Run Monte Carlo</>}
                            </button>
                        </div>
                    </div>

                    {signals.length === 0 && (
                        <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-warning shrink-0" size={20} />
                            <p className="text-[11px] font-bold leading-tight uppercase">
                                No backtest signals found. Run the engine with <code className="bg-warning/20 px-1 rounded">--backtest</code> to generate data.
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricsCard
                            title="Avg Final Balance"
                            value={results ? `$${results.avg_final_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                            icon={TrendingUp}
                            trend={0}
                        />
                        <MetricsCard
                            title="Avg Max Drawdown"
                            value={results ? `${(results.max_drawdown_avg * 100).toFixed(2)}%` : "0.00%"}
                            icon={ShieldAlert}
                            trend={0}
                        />
                        <MetricsCard
                            title="Prob. of Ruin"
                            value={results ? `${(results.prob_of_ruin * 100).toFixed(2)}%` : "0.00%"}
                            icon={Zap}
                            trend={0}
                        />
                    </div>

                    {/* Chart Area */}
                    <div className="bg-card border border-border rounded-xl p-6 h-[500px]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="text-primary" size={20} />
                                <h3 className="font-bold uppercase tracking-tight">Equity Curve Projection (Primary Sample)</h3>
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            {results ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                        <XAxis dataKey="trade" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                                            itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="equity"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorEquity)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-accent/10 rounded-lg border border-dashed border-border">
                                    <TrendingUp size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-[10px]">Awaiting Monte Carlo Execution</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Simulation Steps */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h4 className="font-bold uppercase tracking-tight text-xs mb-4">Pipeline Status</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { label: "Data Replay Ingest", status: signals.length > 0 ? "SUCCESS" : "AWAITING" },
                                { label: "Signal Generation", status: signals.length > 0 ? "SUCCESS" : "AWAITING" },
                                { label: "MC Permutations", status: results ? "SUCCESS" : "AWAITING" },
                                { label: "Risk Distribution", status: results ? "SUCCESS" : "AWAITING" }
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3 bg-background/50 p-3 rounded-lg border border-border">
                                    {step.status === "SUCCESS" ? (
                                        <CheckCircle2 size={16} className="text-primary" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{step.label}</span>
                                        <span className={`text-[10px] font-black uppercase ${step.status === "SUCCESS" ? "text-primary" : "text-muted-foreground"}`}>{step.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
