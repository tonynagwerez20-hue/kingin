"use client";

import { useEffect, useState } from "react";
import {
    ShieldCheck,
    ShieldAlert,
    Zap,
    Activity,
    Search,
    Filter,
    BarChart3,
    Terminal,
    Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SignalIntelPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                        Signal Intel <span className="text-primary/50 text-xl font-mono">IGOF v2.4</span>
                    </h2>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2 mt-1">
                        <ShieldCheck size={12} className="text-primary" />
                        Intelligence & Signal Vetting Engine
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="teal" className="h-6">Active Buffers</Badge>
                    <Badge variant="outline" className="h-6 border-white/10 text-muted-foreground font-mono">MEM: 142MB</Badge>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-black tracking-tight uppercase">Intelligence Stream</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Signal Audit & Logic Evaluation</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground">
                                    <Filter size={14} />
                                </button>
                                <button className="p-1.5 hover:bg-accent rounded transition-colors text-muted-foreground">
                                    <Search size={14} />
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <IntelAuditItem
                                time="22:19:33"
                                type="signal"
                                label="IGOF_BUY_IMPULSE"
                                desc="Strong delta imbalance detected at 2654.75"
                                status="active"
                            />
                            <IntelAuditItem
                                time="22:18:12"
                                type="logic"
                                label="IGOF_M5_SYNC"
                                desc="Historical buffers re-aligned to Sierra DTC stream"
                                status="complete"
                            />
                            <IntelAuditItem
                                time="22:15:00"
                                type="alert"
                                label="VOL_SPIKE_DET"
                                desc="XAU/USD high volatility detected (H1 TF)"
                                status="warning"
                            />
                            <IntelAuditItem
                                time="22:12:44"
                                type="logic"
                                label="DELTA_CALC_OK"
                                desc="Cumulative Delta reset for new session"
                                status="complete"
                            />
                            <IntelAuditItem
                                time="22:05:12"
                                type="signal"
                                label="REJECTION_SIG"
                                desc="Price rejected at supply zone 2662.10"
                                status="closed"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Cpu size={14} className="text-primary" /> Confidence Matrix
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <MatrixDimension label="Delta Alignment" value={88} />
                            <MatrixDimension label="Volume Pressure" value={62} />
                            <MatrixDimension label="Trend Resonance" value={45} />
                            <MatrixDimension label="Volatility Fit" value={92} />
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="bg-primary/20 p-3 rounded-full mb-3">
                                    <Zap className="text-primary" size={24} />
                                </div>
                                <h3 className="font-black text-lg uppercase tracking-tight italic">Pulse Detected</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">High-Confidence BUY Signal Potential</p>
                                <div className="w-full h-[1px] bg-primary/20 my-4" />
                                <button className="w-full py-2 bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.2em] rounded hover:bg-primary/90 transition-all">
                                    Evaluate Now
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function IntelAuditItem({ time, type, label, desc, status }: { time: string; type: "signal" | "logic" | "alert"; label: string; desc: string; status: "active" | "complete" | "warning" | "closed" }) {
    return (
        <div className="flex gap-4 p-3 bg-accent/20 rounded-lg border border-border/50 hover:border-primary/20 transition-all group">
            <div className="flex flex-col items-center justify-start gap-2 pt-1">
                {type === "signal" ? <Zap size={16} className="text-primary" /> : type === "logic" ? <Terminal size={16} className="text-muted-foreground" /> : <ShieldAlert size={16} className="text-yellow-500" />}
                <div className="w-[1px] flex-1 bg-border/50" />
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">{time}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                    </div>
                    <Badge variant={status === "active" ? "teal" : status === "warning" ? "danger" : "secondary"} className="h-4 p-1 px-1.5">
                        {status}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{desc}</p>
            </div>
        </div>
    );
}

function MatrixDimension({ label, value }: { label: string; value: number }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground">{value}%</span>
            </div>
            <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-1000",
                        value > 80 ? "bg-primary" : value > 50 ? "bg-primary/60" : "bg-destructive/60"
                    )}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}
